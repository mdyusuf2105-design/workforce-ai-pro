from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.workflow_task import WorkflowTask
from app.routers.auth import get_current_user, require_roles

router = APIRouter(
    prefix="/api/workflow-tasks",
    tags=["Workflow and Task Management"],
)

MANAGER_ROLES = ("ADMIN", "HR", "MANAGER")
VALID_STATUSES = {"TODO", "IN_PROGRESS", "COMPLETED", "CANCELLED"}
VALID_PRIORITIES = {"LOW", "MEDIUM", "HIGH", "URGENT"}


class TaskCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str | None = None
    assigned_to: int = Field(gt=0)
    priority: str = "MEDIUM"
    due_date: date | None = None


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=200)
    description: str | None = None
    assigned_to: int | None = Field(default=None, gt=0)
    priority: str | None = None
    status: str | None = None
    due_date: date | None = None
    completion_notes: str | None = None


def serialize_task(task, creator_name=None, assignee_name=None):
    return {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "created_by": task.created_by,
        "creator_name": creator_name,
        "assigned_to": task.assigned_to,
        "assignee_name": assignee_name,
        "priority": task.priority,
        "status": task.status,
        "due_date": task.due_date.isoformat() if task.due_date else None,
        "completion_notes": task.completion_notes,
        "is_overdue": (
            task.due_date is not None
            and task.due_date < date.today()
            and task.status not in {"COMPLETED", "CANCELLED"}
        ),
        "created_at": task.created_at.isoformat() if task.created_at else None,
        "updated_at": task.updated_at.isoformat() if task.updated_at else None,
        "completed_at": task.completed_at.isoformat() if task.completed_at else None,
    }


def task_query(db):
    return (
        db.query(
            WorkflowTask,
            User.full_name.label("assignee_name"),
        )
        .join(User, User.id == WorkflowTask.assigned_to)
    )


def load_task(db, task_id):
    result = task_query(db).filter(
        WorkflowTask.id == task_id
    ).first()

    if not result:
        raise HTTPException(status_code=404, detail="Task not found.")

    return result


@router.post("/", status_code=201)
def create_task(
    data: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*MANAGER_ROLES)),
):
    assignee = db.query(User).filter(
        User.id == data.assigned_to,
        User.is_active.is_(True),
    ).first()

    if not assignee:
        raise HTTPException(
            status_code=404,
            detail="Active assigned user not found.",
        )

    priority = data.priority.upper()
    if priority not in VALID_PRIORITIES:
        raise HTTPException(status_code=400, detail="Invalid priority.")

    task = WorkflowTask(
        title=data.title.strip(),
        description=data.description,
        created_by=current_user.id,
        assigned_to=data.assigned_to,
        priority=priority,
        status="TODO",
        due_date=data.due_date,
    )

    db.add(task)
    db.commit()
    db.refresh(task)

    return serialize_task(
        task,
        creator_name=current_user.full_name,
        assignee_name=assignee.full_name,
    )


@router.get("/")
def list_tasks(
    status: str | None = None,
    priority: str | None = None,
    assigned_to: int | None = Query(default=None, gt=0),
    overdue_only: bool = False,
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = task_query(db)

    role = current_user.role.upper()

    # Employees can view only tasks assigned to themselves.
    if role not in MANAGER_ROLES:
        query = query.filter(
            WorkflowTask.assigned_to == current_user.id
        )
    elif assigned_to is not None:
        query = query.filter(
            WorkflowTask.assigned_to == assigned_to
        )

    if status:
        status = status.upper()
        if status not in VALID_STATUSES:
            raise HTTPException(status_code=400, detail="Invalid status.")
        query = query.filter(WorkflowTask.status == status)

    if priority:
        priority = priority.upper()
        if priority not in VALID_PRIORITIES:
            raise HTTPException(status_code=400, detail="Invalid priority.")
        query = query.filter(WorkflowTask.priority == priority)

    if overdue_only:
        query = query.filter(
            WorkflowTask.due_date < date.today(),
            WorkflowTask.status.notin_(["COMPLETED", "CANCELLED"]),
        )

    rows = (
        query.order_by(WorkflowTask.id.desc())
        .limit(limit)
        .all()
    )

    return [
        serialize_task(task, assignee_name=assignee_name)
        for task, assignee_name in rows
    ]


@router.get("/summary")
def task_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(WorkflowTask)

    if current_user.role.upper() not in MANAGER_ROLES:
        query = query.filter(
            WorkflowTask.assigned_to == current_user.id
        )

    tasks = query.all()
    today = date.today()

    return {
        "total": len(tasks),
        "todo": sum(task.status == "TODO" for task in tasks),
        "in_progress": sum(task.status == "IN_PROGRESS" for task in tasks),
        "completed": sum(task.status == "COMPLETED" for task in tasks),
        "cancelled": sum(task.status == "CANCELLED" for task in tasks),
        "overdue": sum(
            task.due_date is not None
            and task.due_date < today
            and task.status not in {"COMPLETED", "CANCELLED"}
            for task in tasks
        ),
        "high_priority": sum(
            task.priority in {"HIGH", "URGENT"}
            and task.status not in {"COMPLETED", "CANCELLED"}
            for task in tasks
        ),
    }


@router.get("/{task_id}")
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task, assignee_name = load_task(db, task_id)

    if (
        current_user.role.upper() not in MANAGER_ROLES
        and task.assigned_to != current_user.id
    ):
        raise HTTPException(status_code=403, detail="Access denied.")

    creator = db.query(User).filter(
        User.id == task.created_by
    ).first()

    return serialize_task(
        task,
        creator_name=creator.full_name if creator else None,
        assignee_name=assignee_name,
    )


@router.patch("/{task_id}")
def update_task(
    task_id: int,
    data: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task, _ = load_task(db, task_id)
    role = current_user.role.upper()
    is_manager = role in MANAGER_ROLES

    changes = data.model_dump(exclude_unset=True)

    # Assigned employees may update only task progress and completion notes.
    if not is_manager:
        if task.assigned_to != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied.")

        allowed_fields = {"status", "completion_notes"}
        if not set(changes).issubset(allowed_fields):
            raise HTTPException(
                status_code=403,
                detail="Employees may update only task status and completion notes.",
            )

    if "status" in changes and changes["status"] is not None:
        changes["status"] = changes["status"].upper()
        if changes["status"] not in VALID_STATUSES:
            raise HTTPException(status_code=400, detail="Invalid status.")

    if "priority" in changes and changes["priority"] is not None:
        changes["priority"] = changes["priority"].upper()
        if changes["priority"] not in VALID_PRIORITIES:
            raise HTTPException(status_code=400, detail="Invalid priority.")

    if "assigned_to" in changes and changes["assigned_to"] is not None:
        assignee = db.query(User).filter(
            User.id == changes["assigned_to"],
            User.is_active.is_(True),
        ).first()

        if not assignee:
            raise HTTPException(status_code=404, detail="Active user not found.")

    for key, value in changes.items():
        setattr(task, key, value)

    if task.status == "COMPLETED":
        task.completed_at = datetime.utcnow()
    elif "status" in changes:
        task.completed_at = None

    db.commit()
    db.refresh(task)

    assignee = db.query(User).filter(
        User.id == task.assigned_to
    ).first()

    return serialize_task(
        task,
        assignee_name=assignee.full_name if assignee else None,
    )


@router.delete("/{task_id}")
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "HR")),
):
    task = db.query(WorkflowTask).filter(
        WorkflowTask.id == task_id
    ).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")

    db.delete(task)
    db.commit()

    return {"message": "Task deleted successfully."}

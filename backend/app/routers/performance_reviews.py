from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.employee import Employee
from app.models.performance_review import PerformanceReview
from app.models.user import User
from app.routers.auth import get_current_user, require_roles

router = APIRouter(
    prefix="/api/performance-reviews",
    tags=["Employee Performance Reviews"],
)

MANAGER_ROLES = ("ADMIN", "HR", "MANAGER")
VALID_STATUSES = {"DRAFT", "PUBLISHED", "ACKNOWLEDGED"}


class ReviewCreate(BaseModel):
    employee_id: int = Field(gt=0)
    review_period: str = Field(min_length=2, max_length=100)
    review_date: date
    rating: int = Field(ge=1, le=5)
    strengths: str | None = None
    improvement_areas: str | None = None
    feedback: str = Field(min_length=3)
    goals: str | None = None


class ReviewUpdate(BaseModel):
    review_period: str | None = Field(
        default=None,
        min_length=2,
        max_length=100,
    )
    review_date: date | None = None
    rating: int | None = Field(default=None, ge=1, le=5)
    strengths: str | None = None
    improvement_areas: str | None = None
    feedback: str | None = Field(default=None, min_length=3)
    goals: str | None = None
    status: str | None = None


def serialize_review(review, employee=None, reviewer=None):
    return {
        "id": review.id,
        "employee_id": review.employee_id,
        "employee_name": employee.full_name if employee else None,
        "reviewer_id": review.reviewer_id,
        "reviewer_name": reviewer.full_name if reviewer else None,
        "review_period": review.review_period,
        "review_date": (
            review.review_date.isoformat()
            if review.review_date else None
        ),
        "rating": review.rating,
        "strengths": review.strengths,
        "improvement_areas": review.improvement_areas,
        "feedback": review.feedback,
        "goals": review.goals,
        "status": review.status,
        "employee_acknowledged": (
            review.employee_acknowledged.isoformat()
            if review.employee_acknowledged else None
        ),
        "created_at": (
            review.created_at.isoformat()
            if review.created_at else None
        ),
        "updated_at": (
            review.updated_at.isoformat()
            if review.updated_at else None
        ),
    }


def get_review_or_404(db, review_id):
    review = db.query(PerformanceReview).filter(
        PerformanceReview.id == review_id
    ).first()

    if not review:
        raise HTTPException(
            status_code=404,
            detail="Performance review not found.",
        )

    return review


def load_related_users(db, review):
    employee = db.query(Employee).filter(
        Employee.id == review.employee_id
    ).first()

    reviewer = db.query(User).filter(
        User.id == review.reviewer_id
    ).first()

    return employee, reviewer


@router.post("/", status_code=201)
def create_review(
    data: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*MANAGER_ROLES)),
):
    employee = db.query(Employee).filter(
        Employee.id == data.employee_id
    ).first()

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found.",
        )

    review = PerformanceReview(
        employee_id=data.employee_id,
        reviewer_id=current_user.id,
        review_period=data.review_period.strip(),
        review_date=data.review_date,
        rating=data.rating,
        strengths=data.strengths,
        improvement_areas=data.improvement_areas,
        feedback=data.feedback.strip(),
        goals=data.goals,
        status="DRAFT",
    )

    db.add(review)
    db.commit()
    db.refresh(review)

    return serialize_review(review, employee, current_user)


@router.get("/")
def list_reviews(
    employee_id: int | None = Query(default=None, gt=0),
    status: str | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(PerformanceReview)

    role = current_user.role.upper()

    # Employees can view only their own published reviews.
    if role not in MANAGER_ROLES:
        employee = db.query(Employee).filter(
            Employee.email == current_user.email
        ).first()

        if not employee:
            return []

        query = query.filter(
            PerformanceReview.employee_id == employee.id,
            PerformanceReview.status.in_(
                ["PUBLISHED", "ACKNOWLEDGED"]
            ),
        )
    elif employee_id is not None:
        query = query.filter(
            PerformanceReview.employee_id == employee_id
        )

    if status:
        status = status.upper()

        if status not in VALID_STATUSES:
            raise HTTPException(
                status_code=400,
                detail="Invalid review status.",
            )

        query = query.filter(
            PerformanceReview.status == status
        )

    reviews = (
        query.order_by(PerformanceReview.review_date.desc())
        .limit(limit)
        .all()
    )

    results = []

    for review in reviews:
        employee, reviewer = load_related_users(db, review)
        results.append(
            serialize_review(review, employee, reviewer)
        )

    return results


@router.get("/summary")
def review_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*MANAGER_ROLES)),
):
    reviews = db.query(PerformanceReview).all()

    ratings = [
        review.rating
        for review in reviews
        if review.status in {"PUBLISHED", "ACKNOWLEDGED"}
    ]

    return {
        "total_reviews": len(reviews),
        "draft": sum(review.status == "DRAFT" for review in reviews),
        "published": sum(
            review.status == "PUBLISHED" for review in reviews
        ),
        "acknowledged": sum(
            review.status == "ACKNOWLEDGED" for review in reviews
        ),
        "average_published_rating": (
            round(sum(ratings) / len(ratings), 2)
            if ratings else None
        ),
    }


@router.get("/{review_id}")
def get_review(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    review = get_review_or_404(db, review_id)

    if current_user.role.upper() not in MANAGER_ROLES:
        employee = db.query(Employee).filter(
            Employee.email == current_user.email
        ).first()

        if (
            not employee
            or employee.id != review.employee_id
            or review.status not in {"PUBLISHED", "ACKNOWLEDGED"}
        ):
            raise HTTPException(
                status_code=403,
                detail="You cannot access this performance review.",
            )

    employee, reviewer = load_related_users(db, review)

    return serialize_review(review, employee, reviewer)


@router.patch("/{review_id}")
def update_review(
    review_id: int,
    data: ReviewUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*MANAGER_ROLES)),
):
    review = get_review_or_404(db, review_id)

    if review.status != "DRAFT":
        raise HTTPException(
            status_code=409,
            detail="Only draft reviews can be edited.",
        )

    changes = data.model_dump(exclude_unset=True)

    if "status" in changes and changes["status"] is not None:
        new_status = changes["status"].upper()

        if new_status not in VALID_STATUSES:
            raise HTTPException(
                status_code=400,
                detail="Invalid review status.",
            )

        if new_status == "ACKNOWLEDGED":
            raise HTTPException(
                status_code=400,
                detail="Employees acknowledge reviews themselves.",
            )

        changes["status"] = new_status

    for key, value in changes.items():
        setattr(review, key, value)

    db.commit()
    db.refresh(review)

    employee, reviewer = load_related_users(db, review)

    return serialize_review(review, employee, reviewer)


@router.post("/{review_id}/publish")
def publish_review(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(*MANAGER_ROLES)),
):
    review = get_review_or_404(db, review_id)

    if review.status != "DRAFT":
        raise HTTPException(
            status_code=409,
            detail="Only draft reviews can be published.",
        )

    review.status = "PUBLISHED"

    db.commit()
    db.refresh(review)

    employee, reviewer = load_related_users(db, review)

    return serialize_review(review, employee, reviewer)


@router.post("/{review_id}/acknowledge")
def acknowledge_review(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    review = get_review_or_404(db, review_id)

    employee = db.query(Employee).filter(
        Employee.email == current_user.email
    ).first()

    if (
        not employee
        or employee.id != review.employee_id
        or current_user.role.upper() in MANAGER_ROLES
    ):
        raise HTTPException(
            status_code=403,
            detail="Only the reviewed employee can acknowledge this review.",
        )

    if review.status != "PUBLISHED":
        raise HTTPException(
            status_code=409,
            detail="Only published reviews can be acknowledged.",
        )

    review.status = "ACKNOWLEDGED"
    review.employee_acknowledged = datetime.utcnow()

    db.commit()
    db.refresh(review)

    reviewer = db.query(User).filter(
        User.id == review.reviewer_id
    ).first()

    return serialize_review(review, employee, reviewer)

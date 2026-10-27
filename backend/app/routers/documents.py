import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.document import EmployeeDocument
from app.models.employee import Employee
from app.models.user import User
from app.routers.auth import get_current_user, require_roles
from app.schemas.document import EmployeeDocumentResponse

router = APIRouter(
    prefix="/api/documents",
    tags=["Document Management"],
)

UPLOAD_DIR = Path("media/employee_documents").resolve()
MAX_FILE_SIZE = 10 * 1024 * 1024

ALLOWED_TYPES = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
}

ALLOWED_CATEGORIES = {
    "IDENTITY",
    "EDUCATION",
    "EMPLOYMENT",
    "CONTRACT",
    "PAYROLL",
    "OTHER",
}


def employee_for_user(db: Session, user: User):
    return db.query(Employee).filter(Employee.email == user.email).first()


def check_employee_access(db: Session, user: User, employee_id: int):
    if user.role.upper() == "EMPLOYEE":
        employee = employee_for_user(db, user)
        if not employee or employee.id != employee_id:
            raise HTTPException(status_code=403, detail="Access denied.")


@router.post("/", response_model=EmployeeDocumentResponse, status_code=201)
async def upload_document(
    employee_id: int = Form(..., gt=0),
    category: str = Form(default="OTHER"),
    description: str | None = Form(default=None, max_length=2000),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    employee = db.query(Employee).filter(
        Employee.id == employee_id
    ).first()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found.")

    check_employee_access(db, current_user, employee_id)

    category = category.strip().upper()
    if category not in ALLOWED_CATEGORIES:
        raise HTTPException(status_code=400, detail="Invalid document category.")

    content_type = file.content_type or ""
    extension = ALLOWED_TYPES.get(content_type)

    if not extension:
        raise HTTPException(
            status_code=400,
            detail="Only PDF, JPEG, PNG, and DOCX files are allowed.",
        )

    original_filename = Path(file.filename or "document").name
    stored_filename = f"{uuid.uuid4().hex}{extension}"

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    destination = UPLOAD_DIR / stored_filename
    size = 0

    try:
        with destination.open("xb") as output:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break

                size += len(chunk)

                if size > MAX_FILE_SIZE:
                    raise HTTPException(
                        status_code=413,
                        detail="Maximum document size is 10 MB.",
                    )

                output.write(chunk)

        if size == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        document = EmployeeDocument(
            employee_id=employee_id,
            uploaded_by=current_user.id,
            original_filename=original_filename,
            stored_filename=stored_filename,
            file_path=str(destination),
            content_type=content_type,
            file_size=size,
            category=category,
            description=description.strip() if description else None,
        )

        db.add(document)
        db.commit()
        db.refresh(document)
        return document

    except Exception:
        db.rollback()
        destination.unlink(missing_ok=True)
        raise

    finally:
        await file.close()


@router.get("/", response_model=list[EmployeeDocumentResponse])
def list_documents(
    employee_id: int | None = None,
    category: str | None = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if skip < 0 or limit < 1 or limit > 100:
        raise HTTPException(status_code=400, detail="Invalid pagination values.")

    query = db.query(EmployeeDocument)

    if current_user.role.upper() == "EMPLOYEE":
        employee = employee_for_user(db, current_user)
        if not employee:
            return []
        query = query.filter(EmployeeDocument.employee_id == employee.id)
    elif employee_id is not None:
        query = query.filter(EmployeeDocument.employee_id == employee_id)

    if category:
        query = query.filter(EmployeeDocument.category == category.upper())

    return (
        query.order_by(EmployeeDocument.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/{document_id}/download")
def download_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    document = db.query(EmployeeDocument).filter(
        EmployeeDocument.id == document_id
    ).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")

    check_employee_access(db, current_user, document.employee_id)

    path = Path(document.file_path).resolve()

    if not path.is_relative_to(UPLOAD_DIR) or not path.is_file():
        raise HTTPException(status_code=404, detail="Stored file not found.")

    return FileResponse(
        path=str(path),
        media_type=document.content_type,
        filename=document.original_filename,
    )


@router.delete("/{document_id}")
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "HR")),
):
    document = db.query(EmployeeDocument).filter(
        EmployeeDocument.id == document_id
    ).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found.")

    path = Path(document.file_path).resolve()

    db.delete(document)
    db.commit()

    if path.is_relative_to(UPLOAD_DIR):
        path.unlink(missing_ok=True)

    return {"message": "Document deleted successfully."}

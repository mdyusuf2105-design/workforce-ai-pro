import json
import uuid
from pathlib import Path

import pandas as pd
import joblib
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.dataset import WorkforceDataset
from app.models.user import User
from app.routers.auth import get_current_user, require_roles

router = APIRouter(prefix="/api/datasets", tags=["Dataset Management"])

DATASET_DIR = Path("media/workforce_datasets").resolve()
MAX_FILE_SIZE = 25 * 1024 * 1024

# Common employee and attrition fields. Other columns are allowed.
RECOMMENDED_COLUMNS = {
    "age",
    "department",
    "jobrole",
    "monthlyincome",
    "joblevel",
    "yearsatcompany",
    "overtime",
    "jobsatisfaction",
    "worklifebalance",
    "attrition",
}


def normalize_column(column):
    return "".join(ch.lower() for ch in str(column) if ch.isalnum())


@router.post("/upload", status_code=201)
async def upload_dataset(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "HR")),
):
    filename = Path(file.filename or "").name

    if not filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")

    content = await file.read(MAX_FILE_SIZE + 1)
    await file.close()

    if not content:
        raise HTTPException(status_code=400, detail="The uploaded CSV is empty.")

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Maximum CSV size is 25 MB.")

    try:
        from io import BytesIO
        df = pd.read_csv(BytesIO(content))
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Unable to read CSV. Check its format and encoding.",
        )

    if df.empty:
        raise HTTPException(status_code=400, detail="The CSV contains no data rows.")

    if len(df.columns) == 0:
        raise HTTPException(status_code=400, detail="No columns were detected.")

    duplicate_columns = df.columns.duplicated().any()
    if duplicate_columns:
        raise HTTPException(
            status_code=400,
            detail="The CSV contains duplicate column names.",
        )

    missing_cells = int(df.isna().sum().sum())
    duplicate_rows = int(df.duplicated().sum())
    normalized_columns = {normalize_column(c) for c in df.columns}

    attrition_column_found = "attrition" in normalized_columns
    recommended_found = sorted(
        column for column in RECOMMENDED_COLUMNS
        if column in normalized_columns
    )

    validation_report = {
        "rows": int(len(df)),
        "columns": int(len(df.columns)),
        "duplicate_rows": duplicate_rows,
        "missing_cells": missing_cells,
        "attrition_target_found": attrition_column_found,
        "recommended_columns_found": recommended_found,
        "recommended_columns_missing": sorted(
            RECOMMENDED_COLUMNS - normalized_columns
        ),
        "column_names": [str(c) for c in df.columns],
    }

    status_value = (
        "VALID"
        if attrition_column_found and missing_cells == 0
        else "WARNING"
    )

    DATASET_DIR.mkdir(parents=True, exist_ok=True)
    stored_filename = f"{uuid.uuid4().hex}.csv"
    destination = DATASET_DIR / stored_filename

    try:
        with destination.open("xb") as output:
            output.write(content)

        dataset = WorkforceDataset(
            uploaded_by=current_user.id,
            original_filename=filename,
            stored_filename=stored_filename,
            file_path=str(destination),
            row_count=int(len(df)),
            column_count=int(len(df.columns)),
            duplicate_rows=duplicate_rows,
            missing_values=missing_cells,
            validation_status=status_value,
            validation_report=json.dumps(validation_report),
        )

        db.add(dataset)
        db.commit()
        db.refresh(dataset)

    except Exception:
        db.rollback()
        destination.unlink(missing_ok=True)
        raise

    return {
        "message": "Dataset uploaded and analyzed.",
        "dataset_id": dataset.id,
        "filename": dataset.original_filename,
        "validation_status": dataset.validation_status,
        "report": validation_report,
    }


@router.get("/")
def list_datasets(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "HR")),
):
    if skip < 0 or limit < 1 or limit > 100:
        raise HTTPException(status_code=400, detail="Invalid pagination values.")

    datasets = (
        db.query(WorkforceDataset)
        .order_by(WorkforceDataset.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return [
        {
            "id": item.id,
            "filename": item.original_filename,
            "row_count": item.row_count,
            "column_count": item.column_count,
            "duplicate_rows": item.duplicate_rows,
            "missing_values": item.missing_values,
            "validation_status": item.validation_status,
            "created_at": item.created_at,
        }
        for item in datasets
    ]


@router.get("/{dataset_id}")
def get_dataset_details(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "HR")),
):
    dataset = db.query(WorkforceDataset).filter(
        WorkforceDataset.id == dataset_id
    ).first()

    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    try:
        report = json.loads(dataset.validation_report or "{}")
    except json.JSONDecodeError:
        report = {}

    return {
        "id": dataset.id,
        "filename": dataset.original_filename,
        "row_count": dataset.row_count,
        "column_count": dataset.column_count,
        "duplicate_rows": dataset.duplicate_rows,
        "missing_values": dataset.missing_values,
        "validation_status": dataset.validation_status,
        "report": report,
        "created_at": dataset.created_at,
    }


@router.delete("/{dataset_id}")
def delete_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "HR")),
):
    dataset = db.query(WorkforceDataset).filter(
        WorkforceDataset.id == dataset_id
    ).first()

    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    path = Path(dataset.file_path).resolve()
    db.delete(dataset)
    db.commit()

    if path.is_relative_to(DATASET_DIR):
        path.unlink(missing_ok=True)

    return {"message": "Dataset deleted successfully."}


@router.post("/{dataset_id}/train")
def train_dataset_model(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "HR")),
):
    import subprocess
    import sys

    dataset = db.query(WorkforceDataset).filter(
        WorkforceDataset.id == dataset_id
    ).first()

    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    dataset_path = Path(dataset.file_path).resolve()
    if not dataset_path.is_file() or not dataset_path.is_relative_to(DATASET_DIR):
        raise HTTPException(status_code=400, detail="Dataset file is unavailable.")

    result = subprocess.run(
        [
            sys.executable,
            "-m",
            "app.ml.train_model",
            "--csv",
            str(dataset_path),
        ],
        cwd=str(Path(__file__).resolve().parents[2]),
        capture_output=True,
        text=True,
        timeout=180,
    )

    if result.returncode != 0:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Model training failed. Check the dataset columns and labels.",
                "error": result.stderr[-2000:],
            },
        )

    bundle_path = Path(__file__).resolve().parents[1] / "ml" / "attrition_model.joblib"
    bundle = joblib.load(bundle_path)

    return {
        "message": "Model trained successfully from the uploaded dataset.",
        "dataset_id": dataset.id,
        "model_version": bundle.get("model_version", "1.0"),
        "metrics": bundle.get("metrics", {}),
        "warning": (
            "Training metrics are not a guarantee of real-world performance. "
            "Validate on representative, authorized data before operational use."
        ),
    }

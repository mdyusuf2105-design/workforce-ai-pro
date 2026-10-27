from pathlib import Path
from datetime import datetime, timezone
import json

import joblib
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.attrition_prediction import AttritionPredictionRecord
from app.models.employee import Employee
from app.models.user import User
from app.routers.auth import require_roles
from app.schemas.attrition import (
    AttritionHistoryResponse,
    AttritionInput,
    AttritionPrediction,
)

router = APIRouter(prefix="/api/attrition", tags=["AI Attrition"])
MODEL_PATH = Path(__file__).resolve().parents[1] / "ml" / "attrition_model.joblib"

# In-memory metadata for this process. For durable history across restarts,
# store training runs in a database table.
_training_runs = []


def load_model_bundle():
    if not MODEL_PATH.exists():
        raise HTTPException(
            status_code=503,
            detail="AI model not trained. Run python -m app.ml.train_model",
        )
    try:
        return joblib.load(MODEL_PATH)
    except Exception:
        raise HTTPException(
            status_code=503,
            detail="The AI model could not be loaded. Retrain the model.",
        )


@router.post("/predict", response_model=AttritionPrediction)
def predict_attrition(
    data: AttritionInput,
    employee_id: int = Query(..., gt=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "HR")),
):
    employee = db.query(Employee).filter(Employee.id == employee_id).first()

    if employee is None:
        raise HTTPException(status_code=404, detail="Employee not found")

    if employee.employment_status != "ACTIVE":
        raise HTTPException(
            status_code=400,
            detail="Predictions can only be generated for active employees",
        )

    bundle = load_model_bundle()
    model = bundle["model"]
    features = bundle["features"]

    row = pd.DataFrame(
        [{
            "overtime": data.overtime,
            "job_satisfaction": data.job_satisfaction,
            "work_life_balance": data.work_life_balance,
            "years_at_company": data.years_at_company,
            "monthly_income": data.monthly_income,
            "training_hours": data.training_hours,
        }],
        columns=features,
    )

    probabilities = model.predict_proba(row)[0]
    classes = list(model.classes_)
    positive_index = classes.index(1) if 1 in classes else None

    if positive_index is None:
        raise HTTPException(
            status_code=503,
            detail="The trained model does not contain the attrition class.",
        )

    probability = float(probabilities[positive_index])
    confidence = float(max(probabilities))

    if probability >= 0.65:
        level = "HIGH"
    elif probability >= 0.35:
        level = "MEDIUM"
    else:
        level = "LOW"

    record = AttritionPredictionRecord(
        employee_id=employee.id,
        created_by=current_user.id,
        overtime=data.overtime,
        job_satisfaction=data.job_satisfaction,
        work_life_balance=data.work_life_balance,
        years_at_company=data.years_at_company,
        monthly_income=data.monthly_income,
        training_hours=data.training_hours,
        risk_probability=round(probability, 4),
        risk_level=level,
    )

    db.add(record)
    db.commit()

    return {
        "risk_probability": round(probability, 4),
        "risk_level": level,
        "confidence": round(confidence, 4),
        "model_version": str(bundle.get("model_version", "1.0")),
        "demo_model": bool(bundle.get("demo_data", True)),
        "disclaimer": (
            "Experimental estimate. Confidence reflects the model's predicted "
            "class probability, not validated real-world accuracy. Do not use "
            "this result as the sole basis for employment decisions."
        ),
    }


@router.get("/history", response_model=list[AttritionHistoryResponse])
def get_prediction_history(
    employee_id: int | None = Query(default=None, gt=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "HR")),
):
    query = db.query(AttritionPredictionRecord)

    if employee_id is not None:
        query = query.filter(
            AttritionPredictionRecord.employee_id == employee_id
        )

    records = (
        query.order_by(AttritionPredictionRecord.created_at.desc())
        .limit(limit)
        .all()
    )

    return [
        {
            "id": record.id,
            "employee_id": record.employee_id,
            "created_by": record.created_by,
            "overtime": record.overtime,
            "job_satisfaction": record.job_satisfaction,
            "work_life_balance": record.work_life_balance,
            "years_at_company": record.years_at_company,
            "monthly_income": record.monthly_income,
            "training_hours": record.training_hours,
            "risk_probability": record.risk_probability,
            "risk_level": record.risk_level,
            "created_at": record.created_at.isoformat(),
        }
        for record in records
    ]


@router.get("/model-info")
def model_info(
    current_user: User = Depends(require_roles("ADMIN", "HR")),
):
    bundle = load_model_bundle()
    return {
        "model_version": bundle.get("model_version", "1.0"),
        "training_source": bundle.get("training_source", "unknown"),
        "demo_model": bool(bundle.get("demo_data", True)),
        "features": bundle.get("features", []),
        "metrics": bundle.get("metrics", {}),
        "warning": (
            "Synthetic-demo metrics are not evidence of production accuracy."
            if bundle.get("demo_data", True)
            else "Validate this model on representative, authorized HR data."
        ),
    }


@router.get("/department-summary")
def department_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("ADMIN", "HR")),
):
    rows = (
        db.query(
            Employee.department,
            func.count(AttritionPredictionRecord.id).label("prediction_count"),
            func.avg(AttritionPredictionRecord.risk_probability).label("average_risk"),
        )
        .join(
            AttritionPredictionRecord,
            AttritionPredictionRecord.employee_id == Employee.id,
        )
        .filter(Employee.employment_status == "ACTIVE")
        .group_by(Employee.department)
        .all()
    )

    result = []
    for row in rows:
        avg = float(row.average_risk or 0)
        result.append({
            "department": row.department or "Unassigned",
            "prediction_count": int(row.prediction_count),
            "average_risk_probability": round(avg, 4),
            "risk_level": "HIGH" if avg >= 0.65 else "MEDIUM" if avg >= 0.35 else "LOW",
        })

    return result


@router.get("/training-history")
def training_history(
    current_user: User = Depends(require_roles("ADMIN", "HR")),
):
    return list(reversed(_training_runs[-50:]))

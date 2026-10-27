from pydantic import BaseModel, Field


class AttritionInput(BaseModel):
    overtime: int = Field(ge=0, le=1)
    job_satisfaction: int = Field(ge=1, le=4)
    work_life_balance: int = Field(ge=1, le=4)
    years_at_company: int = Field(ge=0, le=50)
    monthly_income: float = Field(gt=0, le=10000000)
    training_hours: int = Field(ge=0, le=1000)


class AttritionPrediction(BaseModel):
    risk_probability: float
    risk_level: str
    confidence: float = 0.0
    model_version: str = "1.0"
    demo_model: bool
    disclaimer: str


class AttritionHistoryResponse(BaseModel):
    id: int
    employee_id: int
    created_by: int
    overtime: int
    job_satisfaction: int
    work_life_balance: int
    years_at_company: int
    monthly_income: float
    training_hours: int
    risk_probability: float
    risk_level: str
    created_at: str

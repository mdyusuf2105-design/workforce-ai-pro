from app.routers.performance_reviews import router as performance_reviews_router
from app.models.performance_review import PerformanceReview
from app.routers.workflow_tasks import router as workflow_tasks_router
from app.models.workflow_task import WorkflowTask
from app.routers.audit_logs import router as audit_logs_router
from app.models.audit_log import AuditLog
from app.routers.reports import router as reports_router
from app.routers.activity import router as activity_router
from app.models.activity import WorkforceActivity
from app.routers.smart_alerts import router as smart_alerts_router
from app.routers.interventions import router as interventions_router
from app.models.intervention import HRIntervention
from app.routers.attrition_analytics import router as attrition_analytics_router
from app.routers.forecasting import router as forecasting_router
from app.routers.risk_monitoring import router as risk_monitoring_router
from app.routers.datasets import router as datasets_router
from app.models.dataset import WorkforceDataset
from app.routers.dashboard import router as dashboard_router
from app.routers.documents import router as documents_router
from app.models.document import EmployeeDocument
from app.routers.chat import router as chat_router
from app.models.chat import ChatMessage
from app.routers.notifications import router as notifications_router
from app.models.notification import Notification
from app.routers.payroll import router as payroll_router
from app.models.payroll import SalaryStructure, PayrollRecord
from app.routers.leave import router as leave_router
from app.models.leave import LeaveRequest
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.models.employee import Employee
from app.models.attrition_prediction import AttritionPredictionRecord
from app.models.user import User
from app.models.shift import Shift
from app.models.attendance import Attendance
from app.models.password_reset_token import PasswordResetToken
from app.models.department import Department
from app.routers.employees import router as employee_router
from app.routers.attendance_reports import router as attendance_reports_router
from app.routers.shifts import router as shifts_router
from app.routers.attendance import router as attendance_router
from app.routers.auth import router as auth_router
from app.routers.attrition import router as attrition_router
from app.routers.password_reset import router as password_reset_router
from app.routers.departments import router as department_router
from app.routers import recommendations
from app.routers import advanced_search
from app.routers import permissions
from app.routers import workforce_stability
from app.routers import health

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="WorkForce AI Pro",
    description="HR Attrition Prediction & Workforce Intelligence Platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(interventions_router)
app.include_router(attrition_analytics_router)
app.include_router(forecasting_router)
app.include_router(risk_monitoring_router)
app.include_router(datasets_router)
app.include_router(dashboard_router)
app.include_router(documents_router)
app.include_router(chat_router)
app.include_router(notifications_router)
app.include_router(payroll_router)
app.include_router(leave_router)
app.include_router(password_reset_router)
app.include_router(attrition_router)
app.include_router(employee_router)
app.include_router(shifts_router)
app.include_router(attendance_router)
app.include_router(attendance_reports_router)
app.include_router(department_router)
app.include_router(recommendations.router)
app.include_router(advanced_search.router)
app.include_router(permissions.router)
app.include_router(workforce_stability.router)
app.include_router(health.router)

@app.get("/")
def home():
    return {
        "message": "WorkForce AI Pro API is running!",
        "status": "success",
    }


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "project": "WorkForce AI Pro",
    }

app.include_router(smart_alerts_router)

app.include_router(activity_router)

app.include_router(reports_router)

app.include_router(audit_logs_router)

app.include_router(workflow_tasks_router)

app.include_router(performance_reviews_router)

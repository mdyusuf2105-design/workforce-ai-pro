from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_home_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "success"


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_employee_endpoint_requires_authentication():
    response = client.get("/api/employees/")
    assert response.status_code == 401


def test_profile_requires_authentication():
    response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_attrition_endpoint_requires_authentication():
    response = client.post(
        "/api/attrition/predict",
        json={
            "overtime": 1,
            "job_satisfaction": 2,
            "work_life_balance": 2,
            "years_at_company": 2,
            "monthly_income": 28000,
            "training_hours": 12,
        },
    )
    assert response.status_code == 401

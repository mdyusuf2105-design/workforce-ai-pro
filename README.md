# WorkForce AI Pro
## HR Attrition Prediction & Workforce Intelligence Platform

A full-stack HR intelligence platform for employee management, attrition prediction, and workforce analytics.

## Features
- JWT authentication
- Role-based access control
- Employee management
- Add, edit, and deactivate employees
- Attrition risk prediction
- Prediction history
- Workforce analytics dashboard

## Technology Stack

**Backend:** Python, FastAPI, SQLAlchemy, MySQL, Pydantic, JWT, Scikit-learn

**Frontend:** React, Vite, JavaScript, Axios, Recharts

## Project Structure
- `backend/` — Backend application and tests
- `frontend/` — React frontend
- `README.md` — Project documentation

## Backend Setup

```bash
cd ~/workforce-ai-pro/backend
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

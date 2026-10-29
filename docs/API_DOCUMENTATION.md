# WorkForce AI Pro — API Documentation

## Overview

This document is generated from the project's registered FastAPI application.

- Application: WorkForce AI Pro
- Version: 1.0.0
- OpenAPI version: 3.1.0
- Machine-readable specification: `openapi.json`

## Authentication

Endpoints marked as requiring security must be called with the authentication
credentials specified by the API's OpenAPI security configuration.

### Configured security schemes

- **HTTPBearer**: http, scheme: bearer

## API Endpoints

| Method | Endpoint | Summary | Authentication |
|---|---|---|---|
| GET | `/` | Home | Not indicated |
Responses for `GET /`:
- `200`: Successful Response

| GET | `/api/activity/feed` | Activity Feed | Required/configured |

#### `GET /api/activity/feed` parameters

- `after_id` (query): see schema; optional
- `category` (query): see schema; optional
- `limit` (query): integer; optional

Responses for `GET /api/activity/feed`:
- `200`: Successful Response
- `422`: Validation Error

| GET | `/api/activity/summary` | Activity Summary | Required/configured |

#### `GET /api/activity/summary` parameters

- `hours` (query): integer; optional

Responses for `GET /api/activity/summary`:
- `200`: Successful Response
- `422`: Validation Error

| GET | `/api/activity/{activity_id}` | Get Activity | Required/configured |

#### `GET /api/activity/{activity_id}` parameters

- `activity_id` (path): integer; required

Responses for `GET /api/activity/{activity_id}`:
- `200`: Successful Response
- `422`: Validation Error

| GET | `/api/attendance/` | Attendance History | Required/configured |

#### `GET /api/attendance/` parameters

- `employee_id` (query): see schema; optional
- `start_date` (query): see schema; optional
- `end_date` (query): see schema; optional
- `skip` (query): integer; optional
- `limit` (query): integer; optional

Responses for `GET /api/attendance/`:
- `200`: Successful Response
- `422`: Validation Error

| GET | `/api/attendance/analytics` | Attendance Analytics | Required/configured |

#### `GET /api/attendance/analytics` parameters

- `start_date` (query): see schema; optional
- `end_date` (query): see schema; optional
- `department` (query): see schema; optional

Responses for `GET /api/attendance/analytics`:
- `200`: Successful Response
- `422`: Validation Error

| POST | `/api/attendance/check-in` | Check In | Required/configured |
Request body for `POST /api/attendance/check-in`: required.
Content types: application/json.

Responses for `POST /api/attendance/check-in`:
- `201`: Successful Response
- `422`: Validation Error

| POST | `/api/attendance/check-out` | Check Out | Required/configured |
Request body for `POST /api/attendance/check-out`: required.
Content types: application/json.

Responses for `POST /api/attendance/check-out`:
- `200`: Successful Response
- `422`: Validation Error

| GET | `/api/attendance/reports` | Attendance Report | Required/configured |

#### `GET /api/attendance/reports` parameters

- `employee_id` (query): see schema; optional
- `department` (query): see schema; optional
- `start_date` (query): see schema; optional
- `end_date` (query): see schema; optional
- `skip` (query): integer; optional
- `limit` (query): integer; optional

Responses for `GET /api/attendance/reports`:
- `200`: Successful Response
- `422`: Validation Error

| GET | `/api/attendance/summary` | Attendance Summary | Required/configured |

#### `GET /api/attendance/summary` parameters

- `start_date` (query): see schema; optional
- `end_date` (query): see schema; optional

Responses for `GET /api/attendance/summary`:
- `200`: Successful Response
- `422`: Validation Error

| GET | `/api/attrition-analytics/departments` | Department Analytics | Required/configured |
Responses for `GET /api/attrition-analytics/departments`:
- `200`: Successful Response

| GET | `/api/attrition-analytics/high-risk` | High Risk Employees | Required/configured |

#### `GET /api/attrition-analytics/high-risk` parameters

- `limit` (query): integer; optional

Responses for `GET /api/attrition-analytics/high-risk`:
- `200`: Successful Response
- `422`: Validation Error

| GET | `/api/attrition-analytics/monthly-trends` | Monthly Analytics | Required/configured |

#### `GET /api/attrition-analytics/monthly-trends` parameters

- `months` (query): integer; optional

Responses for `GET /api/attrition-analytics/monthly-trends`:
- `200`: Successful Response
- `422`: Validation Error

| GET | `/api/attrition-analytics/overview` | Analytics Overview | Required/configured |
Responses for `GET /api/attrition-analytics/overview`:
- `200`: Successful Response

| GET | `/api/attrition-analytics/risk-distribution` | Risk Distribution | Required/configured |
Responses for `GET /api/attrition-analytics/risk-distribution`:
- `200`: Successful Response

| GET | `/api/attrition/department-summary` | Department Summary | Required/configured |
Responses for `GET /api/attrition/department-summary`:
- `200`: Successful Response

| GET | `/api/attrition/history` | Get Prediction History | Required/configured |

#### `GET /api/attrition/history` parameters

- `employee_id` (query): see schema; optional
- `limit` (query): integer; optional

Responses for `GET /api/attrition/history`:
- `200`: Successful Response
- `422`: Validation Error

| GET | `/api/attrition/model-info` | Model Info | Required/configured |
Responses for `GET /api/attrition/model-info`:
- `200`: Successful Response

| POST | `/api/attrition/predict` | Predict Attrition | Required/configured |

#### `POST /api/attrition/predict` parameters

- `employee_id` (query): integer; required

Request body for `POST /api/attrition/predict`: required.
Content types: application/json.

Responses for `POST /api/attrition/predict`:
- `200`: Successful Response
- `422`: Validation Error

| GET | `/api/attrition/training-history` | Training History | Required/configured |
Responses for `GET /api/attrition/training-history`:
- `200`: Successful Response

| GET | `/api/audit-logs/` | List Audit Logs | Required/configured |

#### `GET /api/audit-logs/` parameters

- `action` (query): see schema; optional
- `entity_type` (query): see schema; optional
- `user_id` (query): see schema; optional
- `start_date` (query): see schema; optional
- `end_date` (query): see schema; optional
- `page` (query): integer; optional
- `page_size` (query): integer; optional

Responses for `GET /api/audit-logs/`:
- `200`: Successful Response
- `422`: Validation Error

| GET | `/api/audit-logs/summary` | Audit Summary | Required/configured |

#### `GET /api/audit-logs/summary` parameters

- `days` (query): integer; optional

Responses for `GET /api/audit-logs/summary`:
- `200`: Successful Response
- `422`: Validation Error

| GET | `/api/audit-logs/{audit_id}` | Get Audit Log | Required/configured |

#### `GET /api/audit-logs/{audit_id}` parameters

- `audit_id` (path): integer; required

Responses for `GET /api/audit-logs/{audit_id}`:
- `200`: Successful Response
- `422`: Validation Error

| POST | `/api/auth/forgot-password` | Forgot Password | Not indicated |
Request body for `POST /api/auth/forgot-password`: required.
Content types: application/json.

Responses for `POST /api/auth/forgot-password`:
- `200`: Successful Response
- `422`: Validation Error

| POST | `/api/auth/login` | Login | Not indicated |
Request body for `POST /api/auth/login`: required.
Content types: application/json.

Responses for `POST /api/auth/login`:
- `200`: Successful Response
- `422`: Validation Error

| GET | `/api/auth/me` | Get Profile | Required/configured |
Responses for `GET /api/auth/me`:
- `200`: Successful Response

| POST | `/api/auth/register` | Register | Not indicated |
Request body for `POST /api/auth/register`: required.
Content types: application/json.

Responses for `POST /api/auth/register`:
- `201`: Successful Response
- `422`: Validation Error

| POST | `/api/auth/reset-password` | Reset Password | Not indicated |
Request body for `POST /api/auth/reset-password`: required.
Content types: application/json.

Responses for `POST /api/auth/reset-password`:
- `200`: Successful Response
- `422`: Validation Error

| PATCH | `/api/chat/conversations/{other_user_id}/read` | Mark Conversation Read | Required/configured |

#### `PATCH /api/chat/conversations/{other_user_id}/read` parameters

- `other_user_id` (path): integer; required

Responses for `PATCH /api/chat/conversations/{other_user_id}/read`:
- `200`: Successful Response
- `422`: Validation Error

| GET | `/api/chat/messages` | List Messages | Required/configured |

#### `GET /api/chat/messages` parameters

- `conversation_with` (query): see schema; optional
- `unread_only` (query): boolean; optional
- `skip` (query): integer; optional
- `limit` (query): integer; optional

Responses for `GET /api/chat/messages`:
- `200`: Successful Response
- `422`: Validation Error

| POST | `/api/chat/messages` | Send Message | Required/configured |
Request body for `POST /api/chat/messages`: required.
Content types: application/json.

Responses for `POST /api/chat/messages`:
- `201`: Successful Response
- `422`: Validation Error

| DELETE | `/api/chat/messages/{message_id}` | Delete Message | Required/configured |

#### `DELETE /api/chat/messages/{message_id}` parameters

- `message_id` (path): integer; required

Responses for `DELETE /api/chat/messages/{message_id}`:
- `200`: Successful Response
- `422`: Validation Error

| PATCH | `/api/chat/messages/{message_id}/read` | Mark Message Read | Required/configured |

#### `PATCH /api/chat/messages/{message_id}/read` parameters

- `message_id` (path): integer; required

Responses for `PATCH /api/chat/messages/{message_id}/read`:
- `200`: Successful Response
- `422`: Validation Error

| GET | `/api/chat/unread-count` | Unread Message Count | Required/configured |
Responses for `GET /api/chat/unread-count`:
- `200`: Successful Response

| GET | `/api/dashboard/attendance-trend` | Attendance Trend | Required/configured |

#### `GET /api/dashboard/attendance-trend` parameters

- `days` (query): integer; optional

Responses for `GET /api/dashboard/attendance-trend`:
- `200`: Successful Response
- `422`: Validation Error

| GET | `/api/dashboard/attrition-summary` | Attrition Summary | Required/configured |
Responses for `GET /api/dashboard/attrition-summary`:
- `200`: Successful Response

| GET | `/api/dashboard/departments` | Department Analytics | Required/configured |
Responses for `GET /api/dashboard/departments`:
- `200`: Successful Response

| GET | `/api/dashboard/leave-analytics` | Leave Analytics | Required/configured |
Responses for `GET /api/dashboard/leave-analytics`:
- `200`: Successful Response

| GET | `/api/dashboard/overview` | Dashboard Overview | Required/configured |
Responses for `GET /api/dashboard/overview`:
- `200`: Successful Response

| GET | `/api/datasets/` | List Datasets | Required/configured |

#### `GET /api/datasets/` parameters

- `skip` (query): integer; optional
- `limit` (query): integer; optional

Responses for `GET /api/datasets/`:
- `200`: Successful Response
- `422`: Validation Error

| POST | `/api/datasets/upload` | Upload Dataset | Required/configured |
Request body for `POST /api/datasets/upload`: required.
Content types: multipart/form-data.

Responses for `POST /api/datasets/upload`:
- `201`: Successful Response
- `422`: Validation Error

| DELETE | `/api/datasets/{dataset_id}` | Delete Dataset | Required/configured |

#### `DELETE /api/datasets/{dataset_id}` parameters

- `dataset_id` (path): integer; required

Responses for `DELETE /api/datasets/{dataset_id}`:
- `200`: Successful Response
- `422`: Validation Error

| GET | `/api/datasets/{dataset_id}` | Get Dataset Details | Required/configured |

#### `GET /api/datasets/{dataset_id}` parameters

- `dataset_id` (path): integer; required

Responses for `GET /api/datasets/{dataset_id}`:
- `200`: Successful Response
- `422`: Validation Error

| POST | `/api/datasets/{dataset_id}/train` | Train Dataset Model | Required/configured |

#### `POST /api/datasets/{dataset_id}/train` parameters

- `dataset_id` (path): integer; required

Responses for `POST /api/datasets/{dataset_id}/train`:
- `200`: Successful Response
- `422`: Validation Error

| GET | `/api/departments/` | List Departments | Required/configured |

#### `GET /api/departments/` parameters

- `search` (query): see schema; optional
- `active_only` (query): boolean; optional

Responses for `GET /api/departments/`:
- `200`: Successful Response
- `422`: Validation Error

| POST | `/api/departments/` | Create Department | Required/configured |
Request body for `POST /api/departments/`: required.
Content types: application/json.

Responses for `POST /api/departments/`:
- `201`: Successful Response
- `422`: Validation Error

| GET | `/api/departments/statistics` | Department Statistics | Required/configured |
Responses for `GET /api/departments/statistics`:
- `200`: Successful Response

| GET | `/api/departments/{department_id}` | Get Department | Required/configured |

#### `GET /api/departments/{department_id}` parameters

- `department_id` (path): integer; required

Responses for `GET /api/departments/{department_id}`:
- `200`: Successful Response
- `422`: Validation Error

| PATCH | `/api/departments/{department_id}` | Update Department | Required/configured |

#### `PATCH /api/departments/{department_id}` parameters

- `department_id` (path): integer; required

Request body for `PATCH /api/departments/{department_id}`: required.
Content types: application/json.

Responses for `PATCH /api/departments/{department_id}`:
- `200`: Successful Response
- `422`: Validation Error

| GET | `/api/documents/` | List Documents | Required/configured |

#### `GET /api/documents/` parameters

- `employee_id` (query): see schema; optional
- `category` (query): see schema; optional
- `skip` (query): integer; optional
- `limit` (query): integer; optional

Responses for `GET /api/documents/`:
- `200`: Successful Response
- `422`: Validation Error

| POST | `/api/documents/` | Upload Document | Required/configured |
Request body for `POST /api/documents/`: required.
Content types: multipart/form-data.

Responses for `POST /api/documents/`:
- `201`: Successful Response
- `422`: Validation Error

| DELETE | `/api/documents/{document_id}` | Delete Document | Required/configured |

#### `DELETE /api/documents/{document_id}` parameters

- `document_id` (path): integer; required

Responses for `DELETE /api/documents/{document_id}`:
- `200`: Successful Response
- `422`: Validation Error

| GET | `/api/documents/{document_id}/download` | Download Document | Required/configured |

#### `GET /api/documents/{document_id}/download` parameters

- `document_id` (path): integer; required

Responses for `GET /api/documents/{document_id}/download`:
- `200`: Successful Response
- `422`: Validation Error

| GET | `/api/employees/` | List Employees | Required/configured |

#### `GET /api/employees/` parameters

- `search` (query): see schema; optional
- `department` (query): see schema; optional
- `skip` (query): integer; optional
- `limit` (query): integer; optional

Responses for `GET /api/employees/`:
- `200`: Successful Response
- `422`: Validation Error

| POST | `/api/employees/` | Create Employee | Required/configured |
Request body for `POST /api/employees/`: required.
Content types: application/json.

Responses for `POST /api/employees/`:
- `201`: Successful Response
- `422`: Validation Error

| GET | `/api/employees/{employee_id}` | Get Employee | Required/configured |

#### `GET /api/employees/{employee_id}` parameters

- `employee_id` (path): integer; required

Responses for `GET /api/employees/{employee_id}`:
- `200`: Successful Response
- `422`: Validation Error

| PATCH | `/api/employees/{employee_id}` | Update Employee | Required/configured |

#### `PATCH /api/employees/{employee_id}` parameters

- `employee_id` (path): integer; required

Request body for `PATCH /api/employees/{employee_id}`: required.
Content types: application/json.

Responses for `PATCH /api/employees/{employee_id}`:
- `200`: Successful Response
- `422`: Validation Error

| PATCH | `/api/employees/{employee_id}/deactivate` | Deactivate Employee | Required/configured |

#### `PATCH /api/employees/{employee_id}/deactivate` parameters

- `employee_id` (path): integer; required

Responses for `PATCH /api/employees/{employee_id}/deactivate`:
- `200`: Successful Response
- `422`: Validation Error

| GET | `/api/forecasting/departments` | Department Workforce Summary | Required/configured |
Responses for `GET /api/forecasting/departments`:
- `200`: Successful Response

| GET | `/api/forecasting/monthly` | Monthly Workforce Trend | Required/configured |

#### `GET /api/forecasting/monthly` parameters

- `months` (query): integer; optional

Responses for `GET /api/forecasting/monthly`:
- `200`: Successful Response
- `422`: Validation Error

| GET | `/api/forecasting/overview` | Forecasting Overview | Required/configured |
Responses for `GET /api/forecasting/overview`:
- `200`: Successful Response

| GET | `/api/forecasting/yearly` | Yearly Workforce Summary | Required/configured |

#### `GET /api/forecasting/yearly` parameters

- `years` (query): integer; optional

Responses for `GET /api/forecasting/yearly`:
- `200`: Successful Response
- `422`: Validation Error

| GET | `/api/health` | Health Check | Not indicated |
Responses for `GET /api/health`:
- `200`: Successful Response

| GET | `/api/health/` | Health Check | Not indicated |
Responses for `GET /api/health/`:
- `200`: Successful Response

| GET | `/api/health/database` | Database Health | Not indicated |
Responses for `GET /api/health/database`:
- `200`: Successful Response

| GET | `/api/interventions/` | List Interventions | Required/configured |

#### `GET /api/interventions/` parameters

- `status` (query): see schema; optional
- `employee_id` (query): see schema; optional
- `priority` (query): see schema; optional
- `limit` (query): integer; optional

Responses for `GET /api/interventions/`:
- `200`: Successful Response
- `422`: Validation Error

| POST | `/api/interventions/` | Create Intervention | Required/configured |
Request body for `POST /api/interventions/`: required.
Content types: application/json.

Responses for `POST /api/interventions/`:
- `201`: Successful Response
- `422`: Validation Error

| GET | `/api/interventions/summary` | Intervention Summary | Required/configured |
Responses for `GET /api/interventions/summary`:
- `200`: Successful Response

| DELETE | `/api/interventions/{intervention_id}` | Delete Intervention | Required/configured |

#### `DELETE /api/interventions/{intervention_id}` parameters

- `intervention_id` (path): integer; required

Responses for `DELETE /api/interventions/{intervention_id}`:
- `200`: Successful Response
- `422`: Validation Error

| GET | `/api/interventions/{intervention_id}` | Get Intervention | Required/configured |

#### `GET /api/interventions/{intervention_id}` parameters

- `intervention_id` (path): integer; required

Responses for `GET /api/interventions/{intervention_id}`:
- `200`: Successful Response
- `422`: Validation Error

| PATCH | `/api/interventions/{intervention_id}` | Update Intervention | Required/configured |

#### `PATCH /api/interventions/{intervention_id}` parameters

- `intervention_id` (path): integer; required

Request body for `PATCH /api/interventions/{intervention_id}`: required.
Content types: application/json.

Responses for `PATCH /api/interventions/{intervention_id}`:
- `200`: Successful Response
- `422`: Validation Error

| GET | `/api/leaves/` | List Leave Requests | Required/configured |

#### `GET /api/leaves/` parameters

- `employee_id` (query): see schema; optional
- `status` (query): see schema; optional
- `start_date` (query): see schema; optional
- `end_date` (query): see schema; optional
- `skip` (query): integer; optional
- `limit` (query): integer; optional

Responses for `GET /api/leaves/`:
- `200`: Successful Response
- `422`: Validation Error

| POST | `/api/leaves/` | Create Leave Request | Required/configured |
Request body for `POST /api/leaves/`: required.
Content types: application/json.

Responses for `POST /api/leaves/`:
- `201`: Successful Response
- `422`: Validation Error

| GET | `/api/leaves/{leave_id}` | Get Leave Request | Required/configured |

#### `GET /api/leaves/{leave_id}` parameters

- `leave_id` (path): integer; required

Responses for `GET /api/leaves/{leave_id}`:
- `200`: Successful Response
- `422`: Validation Error

| PATCH | `/api/leaves/{leave_id}/cancel` | Cancel Leave Request | Required/configured |

#### `PATCH /api/leaves/{leave_id}/cancel` parameters

- `leave_id` (path): integer; required

Responses for `PATCH /api/leaves/{leave_id}/cancel`:
- `200`: Successful Response
- `422`: Validation Error

| PATCH | `/api/leaves/{leave_id}/review` | Review Leave Request | Required/configured |

#### `PATCH /api/leaves/{leave_id}/review` parameters

- `leave_id` (path): integer; required

Request body for `PATCH /api/leaves/{leave_id}/review`: required.
Content types: application/json.

Responses for `PATCH /api/leaves/{leave_id}/review`:
- `200`: Successful Response
- `422`: Validation Error

| GET | `/api/notifications/` | List Notifications | Required/configured |

#### `GET /api/notifications/` parameters

- `category` (query): see schema; optional
- `unread_only` (query): boolean; optional
- `skip` (query): integer; optional
- `limit` (query): integer; optional

Responses for `GET /api/notifications/`:
- `200`: Successful Response
- `422`: Validation Error

| POST | `/api/notifications/` | Create Notification | Required/configured |
Request body for `POST /api/notifications/`: required.
Content types: application/json.

Responses for `POST /api/notifications/`:
- `201`: Successful Response
- `422`: Validation Error

| PATCH | `/api/notifications/read-all` | Mark All Notifications Read | Required/configured |
Responses for `PATCH /api/notifications/read-all`:
- `200`: Successful Response

| GET | `/api/notifications/unread-count` | Unread Notification Count | Required/configured |
Responses for `GET /api/notifications/unread-count`:
- `200`: Successful Response

| DELETE | `/api/notifications/{notification_id}` | Delete Notification | Required/configured |

#### `DELETE /api/notifications/{notification_id}` parameters

- `notification_id` (path): integer; required

Responses for `DELETE /api/notifications/{notification_id}`:
- `200`: Successful Response
- `422`: Validation Error

| PATCH | `/api/notifications/{notification_id}/read` | Update Notification Read Status | Required/configured |

#### `PATCH /api/notifications/{notification_id}/read` parameters

- `notification_id` (path): integer; required

Request body for `PATCH /api/notifications/{notification_id}/read`: required.
Content types: application/json.

Responses for `PATCH /api/notifications/{notification_id}/read`:
- `200`: Successful Response
- `422`: Validation Error

| GET | `/api/payroll/` | List Payroll | Required/configured |

#### `GET /api/payroll/` parameters

- `employee_id` (query): see schema; optional
- `month` (query): see schema; optional
- `year` (query): see schema; optional
- `status` (query): see schema; optional
- `skip` (query): integer; optional
- `limit` (query): integer; optional

Responses for `GET /api/payroll/`:
- `200`: Successful Response
- `422`: Validation Error

| POST | `/api/payroll/generate` | Generate Monthly Payroll | Required/configured |

#### `POST /api/payroll/generate` parameters

- `month` (query): integer; required
- `year` (query): integer; required

Responses for `POST /api/payroll/generate`:
- `200`: Successful Response
- `422`: Validation Error

| GET | `/api/payroll/salaries` | List Salary Structures | Required/configured |

#### `GET /api/payroll/salaries` parameters

- `employee_id` (query): see schema; optional

Responses for `GET /api/payroll/salaries`:
- `200`: Successful Response
- `422`: Validation Error

| POST | `/api/payroll/salaries` | Create Salary Structure | Required/configured |
Request body for `POST /api/payroll/salaries`: required.
Content types: application/json.

Responses for `POST /api/payroll/salaries`:
- `200`: Successful Response
- `422`: Validation Error

| PATCH | `/api/payroll/salaries/{salary_id}` | Update Salary Structure | Required/configured |

#### `PATCH /api/payroll/salaries/{salary_id}` parameters

- `salary_id` (path): integer; required

Request body for `PATCH /api/payroll/salaries/{salary_id}`: required.
Content types: application/json.

Responses for `PATCH /api/payroll/salaries/{salary_id}`:
- `200`: Successful Response
- `422`: Validation Error

| GET | `/api/payroll/{payroll_id}` | Get Payroll Record | Required/configured |

#### `GET /api/payroll/{payroll_id}` parameters

- `payroll_id` (path): integer; required

Responses for `GET /api/payroll/{payroll_id}`:
- `200`: Successful Response
- `422`: Validation Error

| PATCH | `/api/payroll/{payroll_id}/approve` | Approve Payroll | Required/configured |

#### `PATCH /api/payroll/{payroll_id}/approve` parameters

- `payroll_id` (path): integer; required

Responses for `PATCH /api/payroll/{payroll_id}/approve`:
- `200`: Successful Response
- `422`: Validation Error

| PATCH | `/api/payroll/{payroll_id}/mark-paid` | Mark Payroll Paid | Required/configured |

#### `PATCH /api/payroll/{payroll_id}/mark-paid` parameters

- `payroll_id` (path): integer; required

Responses for `PATCH /api/payroll/{payroll_id}/mark-paid`:
- `200`: Successful Response
- `422`: Validation Error

| GET | `/api/performance-reviews/` | List Reviews | Required/configured |

#### `GET /api/performance-reviews/` parameters

- `employee_id` (query): see schema; optional
- `status` (query): see schema; optional
- `limit` (query): integer; optional

Responses for `GET /api/performance-reviews/`:
- `200`: Successful Response
- `422`: Validation Error

| POST | `/api/performance-reviews/` | Create Review | Required/configured |
Request body for `POST /api/performance-reviews/`: required.
Content types: application/json.

Responses for `POST /api/performance-reviews/`:
- `201`: Successful Response
- `422`: Validation Error

| GET | `/api/performance-reviews/summary` | Review Summary | Required/configured |
Responses for `GET /api/performance-reviews/summary`:
- `200`: Successful Response

| GET | `/api/performance-reviews/{review_id}` | Get Review | Required/configured |

#### `GET /api/performance-reviews/{review_id}` parameters

- `review_id` (path): integer; required

Responses for `GET /api/performance-reviews/{review_id}`:
- `200`: Successful Response
- `422`: Validation Error

| PATCH | `/api/performance-reviews/{review_id}` | Update Review | Required/configured |

#### `PATCH /api/performance-reviews/{review_id}` parameters

- `review_id` (path): integer; required

Request body for `PATCH /api/performance-reviews/{review_id}`: required.
Content types: application/json.

Responses for `PATCH /api/performance-reviews/{review_id}`:
- `200`: Successful Response
- `422`: Validation Error

| POST | `/api/performance-reviews/{review_id}/acknowledge` | Acknowledge Review | Required/configured |

#### `POST /api/performance-reviews/{review_id}/acknowledge` parameters

- `review_id` (path): integer; required

Responses for `POST /api/performance-reviews/{review_id}/acknowledge`:
- `200`: Successful Response
- `422`: Validation Error

| POST | `/api/performance-reviews/{review_id}/publish` | Publish Review | Required/configured |

#### `POST /api/performance-reviews/{review_id}/publish` parameters

- `review_id` (path): integer; required

Responses for `POST /api/performance-reviews/{review_id}/publish`:
- `200`: Successful Response
- `422`: Validation Error

| GET | `/api/permissions/me` | My Permissions | Required/configured |
Responses for `GET /api/permissions/me`:
- `200`: Successful Response

| GET | `/api/recommendations/` | List Employee Recommendations | Required/configured |

#### `GET /api/recommendations/` parameters

- `limit` (query): integer; optional

Responses for `GET /api/recommendations/`:
- `200`: Successful Response
- `422`: Validation Error

| GET | `/api/recommendations/employee/{employee_id}` | Employee Recommendations | Required/configured |

#### `GET /api/recommendations/employee/{employee_id}` parameters

- `employee_id` (path): integer; required

Responses for `GET /api/recommendations/employee/{employee_id}`:
- `200`: Successful Response
- `422`: Validation Error

| GET | `/api/recommendations/overview` | Recommendations Overview | Required/configured |
Responses for `GET /api/recommendations/overview`:
- `200`: Successful Response

| GET | `/api/reports/` | Available Reports | Required/configured |
Responses for `GET /api/reports/`:
- `200`: Successful Response

| GET | `/api/reports/{report_type}/excel` | Export Excel | Required/configured |

#### `GET /api/reports/{report_type}/excel` parameters

- `report_type` (path): string; required
- `limit` (query): integer; optional

Responses for `GET /api/reports/{report_type}/excel`:
- `200`: Successful Response
- `422`: Validation Error

| GET | `/api/reports/{report_type}/pdf` | Export Pdf | Required/configured |

#### `GET /api/reports/{report_type}/pdf` parameters

- `report_type` (path): string; required
- `limit` (query): integer; optional

Responses for `GET /api/reports/{report_type}/pdf`:
- `200`: Successful Response
- `422`: Validation Error

| GET | `/api/risk-monitoring/alerts` | High Risk Alerts | Required/configured |

#### `GET /api/risk-monitoring/alerts` parameters

- `days` (query): integer; optional

Responses for `GET /api/risk-monitoring/alerts`:
- `200`: Successful Response
- `422`: Validation Error

| POST | `/api/risk-monitoring/alerts/{prediction_id}/notify` | Notify High Risk | Required/configured |

#### `POST /api/risk-monitoring/alerts/{prediction_id}/notify` parameters

- `prediction_id` (path): integer; required

Responses for `POST /api/risk-monitoring/alerts/{prediction_id}/notify`:
- `200`: Successful Response
- `422`: Validation Error

| GET | `/api/risk-monitoring/employees` | Monitored Employees | Required/configured |

#### `GET /api/risk-monitoring/employees` parameters

- `risk_level` (query): see schema; optional
- `limit` (query): integer; optional

Responses for `GET /api/risk-monitoring/employees`:
- `200`: Successful Response
- `422`: Validation Error

| GET | `/api/risk-monitoring/employees/{employee_id}/history` | Employee Risk History | Required/configured |

#### `GET /api/risk-monitoring/employees/{employee_id}/history` parameters

- `employee_id` (path): integer; required
- `limit` (query): integer; optional

Responses for `GET /api/risk-monitoring/employees/{employee_id}/history`:
- `200`: Successful Response
- `422`: Validation Error

| GET | `/api/risk-monitoring/summary` | Risk Summary | Required/configured |
Responses for `GET /api/risk-monitoring/summary`:
- `200`: Successful Response

| GET | `/api/search/employees` | Search Employees | Required/configured |

#### `GET /api/search/employees` parameters

- `q` (query): see schema; optional
- `department` (query): see schema; optional
- `designation` (query): see schema; optional
- `status` (query): see schema; optional
- `employment_type` (query): see schema; optional
- `page` (query): integer; optional
- `page_size` (query): integer; optional

Responses for `GET /api/search/employees`:
- `200`: Successful Response
- `422`: Validation Error

| GET | `/api/search/employees/filters` | Employee Filter Options | Required/configured |
Responses for `GET /api/search/employees/filters`:
- `200`: Successful Response

| GET | `/api/shifts/` | List Shifts | Required/configured |

#### `GET /api/shifts/` parameters

- `active_only` (query): boolean; optional
- `skip` (query): integer; optional
- `limit` (query): integer; optional

Responses for `GET /api/shifts/`:
- `200`: Successful Response
- `422`: Validation Error

| POST | `/api/shifts/` | Create Shift | Required/configured |
Request body for `POST /api/shifts/`: required.
Content types: application/json.

Responses for `POST /api/shifts/`:
- `201`: Successful Response
- `422`: Validation Error

| GET | `/api/shifts/{shift_id}` | Get Shift | Required/configured |

#### `GET /api/shifts/{shift_id}` parameters

- `shift_id` (path): integer; required

Responses for `GET /api/shifts/{shift_id}`:
- `200`: Successful Response
- `422`: Validation Error

| PATCH | `/api/shifts/{shift_id}` | Update Shift | Required/configured |

#### `PATCH /api/shifts/{shift_id}` parameters

- `shift_id` (path): integer; required

Request body for `PATCH /api/shifts/{shift_id}`: required.
Content types: application/json.

Responses for `PATCH /api/shifts/{shift_id}`:
- `200`: Successful Response
- `422`: Validation Error

| PATCH | `/api/shifts/{shift_id}/deactivate` | Deactivate Shift | Required/configured |

#### `PATCH /api/shifts/{shift_id}/deactivate` parameters

- `shift_id` (path): integer; required

Responses for `PATCH /api/shifts/{shift_id}/deactivate`:
- `200`: Successful Response
- `422`: Validation Error

| POST | `/api/smart-alerts/escalate-overdue` | Escalate Overdue | Required/configured |

#### `POST /api/smart-alerts/escalate-overdue` parameters

- `overdue_days` (query): integer; optional

Responses for `POST /api/smart-alerts/escalate-overdue`:
- `200`: Successful Response
- `422`: Validation Error

| GET | `/api/smart-alerts/high-risk` | List Recent High Risk | Required/configured |

#### `GET /api/smart-alerts/high-risk` parameters

- `days` (query): integer; optional
- `limit` (query): integer; optional

Responses for `GET /api/smart-alerts/high-risk`:
- `200`: Successful Response
- `422`: Validation Error

| POST | `/api/smart-alerts/high-risk/{prediction_id}/notify` | Notify High Risk Prediction | Required/configured |

#### `POST /api/smart-alerts/high-risk/{prediction_id}/notify` parameters

- `prediction_id` (path): integer; required

Responses for `POST /api/smart-alerts/high-risk/{prediction_id}/notify`:
- `200`: Successful Response
- `422`: Validation Error

| GET | `/api/smart-alerts/overview` | Smart Alert Overview | Required/configured |
Responses for `GET /api/smart-alerts/overview`:
- `200`: Successful Response

| GET | `/api/workflow-tasks/` | List Tasks | Required/configured |

#### `GET /api/workflow-tasks/` parameters

- `status` (query): see schema; optional
- `priority` (query): see schema; optional
- `assigned_to` (query): see schema; optional
- `overdue_only` (query): boolean; optional
- `limit` (query): integer; optional

Responses for `GET /api/workflow-tasks/`:
- `200`: Successful Response
- `422`: Validation Error

| POST | `/api/workflow-tasks/` | Create Task | Required/configured |
Request body for `POST /api/workflow-tasks/`: required.
Content types: application/json.

Responses for `POST /api/workflow-tasks/`:
- `201`: Successful Response
- `422`: Validation Error

| GET | `/api/workflow-tasks/summary` | Task Summary | Required/configured |
Responses for `GET /api/workflow-tasks/summary`:
- `200`: Successful Response

| DELETE | `/api/workflow-tasks/{task_id}` | Delete Task | Required/configured |

#### `DELETE /api/workflow-tasks/{task_id}` parameters

- `task_id` (path): integer; required

Responses for `DELETE /api/workflow-tasks/{task_id}`:
- `200`: Successful Response
- `422`: Validation Error

| GET | `/api/workflow-tasks/{task_id}` | Get Task | Required/configured |

#### `GET /api/workflow-tasks/{task_id}` parameters

- `task_id` (path): integer; required

Responses for `GET /api/workflow-tasks/{task_id}`:
- `200`: Successful Response
- `422`: Validation Error

| PATCH | `/api/workflow-tasks/{task_id}` | Update Task | Required/configured |

#### `PATCH /api/workflow-tasks/{task_id}` parameters

- `task_id` (path): integer; required

Request body for `PATCH /api/workflow-tasks/{task_id}`: required.
Content types: application/json.

Responses for `PATCH /api/workflow-tasks/{task_id}`:
- `200`: Successful Response
- `422`: Validation Error

| GET | `/api/workforce-stability/overview` | Stability Overview | Required/configured |
Responses for `GET /api/workforce-stability/overview`:
- `200`: Successful Response

| GET | `/api/workforce-stability/retention-priorities` | Retention Priorities | Required/configured |

#### `GET /api/workforce-stability/retention-priorities` parameters

- `limit` (query): integer; optional

Responses for `GET /api/workforce-stability/retention-priorities`:
- `200`: Successful Response
- `422`: Validation Error

## Interactive Documentation

When the backend is running, FastAPI commonly exposes interactive API documentation at `/docs` and an alternative at `/redoc`, unless these routes have been disabled or customized.

## Notes

This document and `openapi.json` are generated from the routes and schemas registered in the application at generation time. Regenerate them after changing the API.

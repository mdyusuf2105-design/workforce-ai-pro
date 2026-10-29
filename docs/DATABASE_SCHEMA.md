# WorkForce AI Pro — Database Schema

## Overview

This document is generated from SQLAlchemy metadata discovered by importing the FastAPI application and its loaded model modules.

**Important:** The tables documented here are the tables present in the loaded SQLAlchemy metadata. This script does not connect to the database or change any database records. Tables that are not imported or registered in the application metadata may not appear here.

**Tables discovered:** 19

## Table: `attendance`

- Schema: `default`

| Column | Type | Nullable | Primary key | Default | Foreign key |
|---|---|---|---|---|---|
| id | INTEGER | No | Yes |  |  |
| employee_id | INTEGER | No | No |  | employees.id |
| attendance_date | DATE | No | No |  |  |
| check_in | DATETIME | Yes | No |  |  |
| check_out | DATETIME | Yes | No |  |  |
| status | VARCHAR(20) | No | No | PRESENT |  |
| shift_name | VARCHAR(100) | No | No | General |  |
| created_at | DATETIME | No | No | now() |  |

### Constraints

- **UniqueConstraint**: `uq_employee_attendance_date`
  - Columns: employee_id, attendance_date
- **ForeignKeyConstraint**: `(unnamed)`
  - Columns: employee_id
  - References: employees.id
- **PrimaryKeyConstraint**: `(unnamed)`
  - Columns: id

## Table: `attrition_predictions`

- Schema: `default`

| Column | Type | Nullable | Primary key | Default | Foreign key |
|---|---|---|---|---|---|
| id | INTEGER | No | Yes |  |  |
| employee_id | INTEGER | No | No |  | employees.id |
| created_by | INTEGER | No | No |  | users.id |
| overtime | INTEGER | No | No |  |  |
| job_satisfaction | INTEGER | No | No |  |  |
| work_life_balance | INTEGER | No | No |  |  |
| years_at_company | INTEGER | No | No |  |  |
| monthly_income | FLOAT | No | No |  |  |
| training_hours | INTEGER | No | No |  |  |
| risk_probability | FLOAT | No | No |  |  |
| risk_level | VARCHAR(10) | No | No |  |  |
| created_at | DATETIME | No | No | now() |  |

### Constraints

- **ForeignKeyConstraint**: `(unnamed)`
  - Columns: employee_id
  - References: employees.id
- **ForeignKeyConstraint**: `(unnamed)`
  - Columns: created_by
  - References: users.id
- **PrimaryKeyConstraint**: `(unnamed)`
  - Columns: id

## Table: `audit_logs`

- Schema: `default`

| Column | Type | Nullable | Primary key | Default | Foreign key |
|---|---|---|---|---|---|
| id | INTEGER | No | Yes |  |  |
| user_id | INTEGER | Yes | No |  | users.id |
| action | VARCHAR(100) | No | No |  |  |
| entity_type | VARCHAR(100) | No | No |  |  |
| entity_id | INTEGER | Yes | No |  |  |
| description | TEXT | No | No |  |  |
| ip_address | VARCHAR(45) | Yes | No |  |  |
| details | JSON | Yes | No |  |  |
| created_at | DATETIME | No | No | now() |  |

### Constraints

- **ForeignKeyConstraint**: `(unnamed)`
  - Columns: user_id
  - References: users.id
- **PrimaryKeyConstraint**: `(unnamed)`
  - Columns: id

## Table: `chat_messages`

- Schema: `default`

| Column | Type | Nullable | Primary key | Default | Foreign key |
|---|---|---|---|---|---|
| id | INTEGER | No | Yes |  |  |
| sender_id | INTEGER | No | No |  | users.id |
| receiver_id | INTEGER | No | No |  | users.id |
| message | TEXT | No | No |  |  |
| is_read | BOOLEAN | No | No | False |  |
| created_at | DATETIME | No | No | now() |  |
| read_at | DATETIME | Yes | No |  |  |

### Constraints

- **ForeignKeyConstraint**: `(unnamed)`
  - Columns: sender_id
  - References: users.id
- **PrimaryKeyConstraint**: `(unnamed)`
  - Columns: id
- **ForeignKeyConstraint**: `(unnamed)`
  - Columns: receiver_id
  - References: users.id

## Table: `departments`

- Schema: `default`

| Column | Type | Nullable | Primary key | Default | Foreign key |
|---|---|---|---|---|---|
| id | INTEGER | No | Yes |  |  |
| name | VARCHAR(100) | No | No |  |  |
| code | VARCHAR(20) | No | No |  |  |
| description | VARCHAR(500) | Yes | No |  |  |
| is_active | BOOLEAN | No | No | True |  |
| created_at | DATETIME | No | No | now() |  |

### Constraints

- **PrimaryKeyConstraint**: `(unnamed)`
  - Columns: id

## Table: `employee_documents`

- Schema: `default`

| Column | Type | Nullable | Primary key | Default | Foreign key |
|---|---|---|---|---|---|
| id | INTEGER | No | Yes |  |  |
| employee_id | INTEGER | No | No |  | employees.id |
| uploaded_by | INTEGER | Yes | No |  | users.id |
| original_filename | VARCHAR(255) | No | No |  |  |
| stored_filename | VARCHAR(255) | No | No |  |  |
| file_path | VARCHAR(500) | No | No |  |  |
| content_type | VARCHAR(100) | No | No |  |  |
| file_size | INTEGER | No | No |  |  |
| category | VARCHAR(50) | No | No | OTHER |  |
| description | TEXT | Yes | No |  |  |
| created_at | DATETIME | No | No | now() |  |

### Constraints

- **UniqueConstraint**: `(unnamed)`
  - Columns: stored_filename
- **PrimaryKeyConstraint**: `(unnamed)`
  - Columns: id
- **ForeignKeyConstraint**: `(unnamed)`
  - Columns: uploaded_by
  - References: users.id
- **ForeignKeyConstraint**: `(unnamed)`
  - Columns: employee_id
  - References: employees.id

## Table: `employees`

- Schema: `default`

| Column | Type | Nullable | Primary key | Default | Foreign key |
|---|---|---|---|---|---|
| id | INTEGER | No | Yes |  |  |
| employee_code | VARCHAR(20) | No | No |  |  |
| full_name | VARCHAR(120) | No | No |  |  |
| email | VARCHAR(255) | No | No |  |  |
| phone | VARCHAR(20) | Yes | No |  |  |
| department | VARCHAR(100) | No | No |  |  |
| job_title | VARCHAR(100) | No | No |  |  |
| employment_status | VARCHAR(20) | No | No | ACTIVE |  |
| joining_date | DATE | Yes | No |  |  |
| created_at | DATETIME | No | No | now() |  |

### Constraints

- **PrimaryKeyConstraint**: `(unnamed)`
  - Columns: id

## Table: `hr_interventions`

- Schema: `default`

| Column | Type | Nullable | Primary key | Default | Foreign key |
|---|---|---|---|---|---|
| id | INTEGER | No | Yes |  |  |
| employee_id | INTEGER | No | No |  | employees.id |
| prediction_id | INTEGER | Yes | No |  | attrition_predictions.id |
| created_by | INTEGER | No | No |  | users.id |
| assigned_to | INTEGER | Yes | No |  | users.id |
| intervention_type | VARCHAR(80) | No | No |  |  |
| title | VARCHAR(200) | No | No |  |  |
| description | TEXT | No | No |  |  |
| priority | VARCHAR(20) | No | No | MEDIUM |  |
| status | VARCHAR(30) | No | No | OPEN |  |
| action_plan | TEXT | Yes | No |  |  |
| outcome_notes | TEXT | Yes | No |  |  |
| due_date | DATE | Yes | No |  |  |
| completed_at | DATETIME | Yes | No |  |  |
| created_at | DATETIME | No | No | now() |  |
| updated_at | DATETIME | No | No | now() |  |

### Constraints

- **ForeignKeyConstraint**: `(unnamed)`
  - Columns: created_by
  - References: users.id
- **ForeignKeyConstraint**: `(unnamed)`
  - Columns: employee_id
  - References: employees.id
- **ForeignKeyConstraint**: `(unnamed)`
  - Columns: assigned_to
  - References: users.id
- **ForeignKeyConstraint**: `(unnamed)`
  - Columns: prediction_id
  - References: attrition_predictions.id
- **PrimaryKeyConstraint**: `(unnamed)`
  - Columns: id

## Table: `leave_requests`

- Schema: `default`

| Column | Type | Nullable | Primary key | Default | Foreign key |
|---|---|---|---|---|---|
| id | INTEGER | No | Yes |  |  |
| employee_id | INTEGER | No | No |  | employees.id |
| leave_type | VARCHAR(50) | No | No |  |  |
| start_date | DATE | No | No |  |  |
| end_date | DATE | No | No |  |  |
| reason | TEXT | No | No |  |  |
| status | VARCHAR(20) | No | No | PENDING |  |
| reviewed_by | INTEGER | Yes | No |  | users.id |
| reviewer_comments | TEXT | Yes | No |  |  |
| reviewed_at | DATETIME | Yes | No |  |  |
| created_at | DATETIME | No | No | now() |  |
| updated_at | DATETIME | No | No | now() |  |

### Constraints

- **PrimaryKeyConstraint**: `(unnamed)`
  - Columns: id
- **ForeignKeyConstraint**: `(unnamed)`
  - Columns: reviewed_by
  - References: users.id
- **CheckConstraint**: `ck_leave_dates_valid`
- **ForeignKeyConstraint**: `(unnamed)`
  - Columns: employee_id
  - References: employees.id

## Table: `notifications`

- Schema: `default`

| Column | Type | Nullable | Primary key | Default | Foreign key |
|---|---|---|---|---|---|
| id | INTEGER | No | Yes |  |  |
| user_id | INTEGER | No | No |  | users.id |
| title | VARCHAR(200) | No | No |  |  |
| message | TEXT | No | No |  |  |
| category | VARCHAR(50) | No | No | GENERAL |  |
| is_read | BOOLEAN | No | No | False |  |
| created_at | DATETIME | No | No | now() |  |
| read_at | DATETIME | Yes | No |  |  |

### Constraints

- **ForeignKeyConstraint**: `(unnamed)`
  - Columns: user_id
  - References: users.id
- **PrimaryKeyConstraint**: `(unnamed)`
  - Columns: id

## Table: `password_reset_tokens`

- Schema: `default`

| Column | Type | Nullable | Primary key | Default | Foreign key |
|---|---|---|---|---|---|
| id | INTEGER | No | Yes |  |  |
| user_id | INTEGER | No | No |  | users.id |
| token_hash | VARCHAR(64) | No | No |  |  |
| expires_at | DATETIME | No | No |  |  |
| used_at | DATETIME | Yes | No |  |  |
| created_at | DATETIME | No | No | now() |  |

### Constraints

- **PrimaryKeyConstraint**: `(unnamed)`
  - Columns: id
- **ForeignKeyConstraint**: `(unnamed)`
  - Columns: user_id
  - References: users.id

## Table: `payroll_records`

- Schema: `default`

| Column | Type | Nullable | Primary key | Default | Foreign key |
|---|---|---|---|---|---|
| id | INTEGER | No | Yes |  |  |
| employee_id | INTEGER | No | No |  | employees.id |
| month | INTEGER | No | No |  |  |
| year | INTEGER | No | No |  |  |
| basic_salary | NUMERIC(12, 2) | No | No |  |  |
| allowances | NUMERIC(12, 2) | No | No | 0 |  |
| deductions | NUMERIC(12, 2) | No | No | 0 |  |
| gross_salary | NUMERIC(12, 2) | No | No |  |  |
| net_salary | NUMERIC(12, 2) | No | No |  |  |
| status | VARCHAR(20) | No | No | PENDING |  |
| approved_by | INTEGER | Yes | No |  | users.id |
| approved_at | DATETIME | Yes | No |  |  |
| paid_at | DATETIME | Yes | No |  |  |
| created_at | DATETIME | No | No | now() |  |

### Constraints

- **UniqueConstraint**: `uq_payroll_employee_month_year`
  - Columns: employee_id, month, year
- **ForeignKeyConstraint**: `(unnamed)`
  - Columns: approved_by
  - References: users.id
- **ForeignKeyConstraint**: `(unnamed)`
  - Columns: employee_id
  - References: employees.id
- **PrimaryKeyConstraint**: `(unnamed)`
  - Columns: id

## Table: `performance_reviews`

- Schema: `default`

| Column | Type | Nullable | Primary key | Default | Foreign key |
|---|---|---|---|---|---|
| id | INTEGER | No | Yes |  |  |
| employee_id | INTEGER | No | No |  | employees.id |
| reviewer_id | INTEGER | No | No |  | users.id |
| review_period | VARCHAR(100) | No | No |  |  |
| review_date | DATE | No | No |  |  |
| rating | INTEGER | No | No |  |  |
| strengths | TEXT | Yes | No |  |  |
| improvement_areas | TEXT | Yes | No |  |  |
| feedback | TEXT | No | No |  |  |
| goals | TEXT | Yes | No |  |  |
| status | VARCHAR(30) | No | No | DRAFT |  |
| employee_acknowledged | DATETIME | Yes | No |  |  |
| created_at | DATETIME | No | No | now() |  |
| updated_at | DATETIME | No | No | now() |  |

### Constraints

- **ForeignKeyConstraint**: `(unnamed)`
  - Columns: reviewer_id
  - References: users.id
- **CheckConstraint**: `ck_performance_rating_range`
- **ForeignKeyConstraint**: `(unnamed)`
  - Columns: employee_id
  - References: employees.id
- **PrimaryKeyConstraint**: `(unnamed)`
  - Columns: id

## Table: `salary_structures`

- Schema: `default`

| Column | Type | Nullable | Primary key | Default | Foreign key |
|---|---|---|---|---|---|
| id | INTEGER | No | Yes |  |  |
| employee_id | INTEGER | No | No |  | employees.id |
| basic_salary | NUMERIC(12, 2) | No | No |  |  |
| allowances | NUMERIC(12, 2) | No | No | 0 |  |
| deductions | NUMERIC(12, 2) | No | No | 0 |  |
| is_active | VARCHAR(10) | No | No | ACTIVE |  |
| created_at | DATETIME | No | No | now() |  |
| updated_at | DATETIME | No | No | now() |  |

### Constraints

- **ForeignKeyConstraint**: `(unnamed)`
  - Columns: employee_id
  - References: employees.id
- **PrimaryKeyConstraint**: `(unnamed)`
  - Columns: id

## Table: `shifts`

- Schema: `default`

| Column | Type | Nullable | Primary key | Default | Foreign key |
|---|---|---|---|---|---|
| id | INTEGER | No | Yes |  |  |
| name | VARCHAR(100) | No | No |  |  |
| start_time | TIME | No | No |  |  |
| end_time | TIME | No | No |  |  |
| break_minutes | INTEGER | No | No | 60 |  |
| is_active | BOOLEAN | No | No | True |  |
| created_at | DATETIME | No | No | now() |  |

### Constraints

- **UniqueConstraint**: `(unnamed)`
  - Columns: name
- **PrimaryKeyConstraint**: `(unnamed)`
  - Columns: id

## Table: `users`

- Schema: `default`

| Column | Type | Nullable | Primary key | Default | Foreign key |
|---|---|---|---|---|---|
| id | INTEGER | No | Yes |  |  |
| full_name | VARCHAR(120) | No | No |  |  |
| email | VARCHAR(255) | No | No |  |  |
| hashed_password | VARCHAR(255) | No | No |  |  |
| role | VARCHAR(20) | No | No | EMPLOYEE |  |
| is_active | BOOLEAN | No | No | True |  |
| created_at | DATETIME | No | No | now() |  |

### Constraints

- **PrimaryKeyConstraint**: `(unnamed)`
  - Columns: id

## Table: `workflow_tasks`

- Schema: `default`

| Column | Type | Nullable | Primary key | Default | Foreign key |
|---|---|---|---|---|---|
| id | INTEGER | No | Yes |  |  |
| title | VARCHAR(200) | No | No |  |  |
| description | TEXT | Yes | No |  |  |
| created_by | INTEGER | No | No |  | users.id |
| assigned_to | INTEGER | No | No |  | users.id |
| priority | VARCHAR(20) | No | No | MEDIUM |  |
| status | VARCHAR(30) | No | No | TODO |  |
| due_date | DATE | Yes | No |  |  |
| completion_notes | TEXT | Yes | No |  |  |
| created_at | DATETIME | No | No | now() |  |
| updated_at | DATETIME | No | No | now() |  |
| completed_at | DATETIME | Yes | No |  |  |

### Constraints

- **PrimaryKeyConstraint**: `(unnamed)`
  - Columns: id
- **ForeignKeyConstraint**: `(unnamed)`
  - Columns: created_by
  - References: users.id
- **ForeignKeyConstraint**: `(unnamed)`
  - Columns: assigned_to
  - References: users.id

## Table: `workforce_activities`

- Schema: `default`

| Column | Type | Nullable | Primary key | Default | Foreign key |
|---|---|---|---|---|---|
| id | INTEGER | No | Yes |  |  |
| actor_id | INTEGER | Yes | No |  | users.id |
| employee_id | INTEGER | Yes | No |  | employees.id |
| event_type | VARCHAR(80) | No | No |  |  |
| category | VARCHAR(50) | No | No | GENERAL |  |
| description | TEXT | No | No |  |  |
| entity_type | VARCHAR(80) | Yes | No |  |  |
| entity_id | INTEGER | Yes | No |  |  |
| details | JSON | Yes | No |  |  |
| created_at | DATETIME | No | No | now() |  |

### Constraints

- **ForeignKeyConstraint**: `(unnamed)`
  - Columns: actor_id
  - References: users.id
- **ForeignKeyConstraint**: `(unnamed)`
  - Columns: employee_id
  - References: employees.id
- **PrimaryKeyConstraint**: `(unnamed)`
  - Columns: id

## Table: `workforce_datasets`

- Schema: `default`

| Column | Type | Nullable | Primary key | Default | Foreign key |
|---|---|---|---|---|---|
| id | INTEGER | No | Yes |  |  |
| uploaded_by | INTEGER | Yes | No |  | users.id |
| original_filename | VARCHAR(255) | No | No |  |  |
| stored_filename | VARCHAR(255) | No | No |  |  |
| file_path | VARCHAR(500) | No | No |  |  |
| row_count | INTEGER | No | No | 0 |  |
| column_count | INTEGER | No | No | 0 |  |
| duplicate_rows | INTEGER | No | No | 0 |  |
| missing_values | INTEGER | No | No | 0 |  |
| validation_status | VARCHAR(30) | No | No | PENDING |  |
| validation_report | TEXT | Yes | No |  |  |
| created_at | DATETIME | No | No | now() |  |

### Constraints

- **UniqueConstraint**: `(unnamed)`
  - Columns: stored_filename
- **ForeignKeyConstraint**: `(unnamed)`
  - Columns: uploaded_by
  - References: users.id
- **PrimaryKeyConstraint**: `(unnamed)`
  - Columns: id

## Relationships

Foreign-key relationships are indicated in each table's column list and constraints section. A foreign key referencing `other_table.id`, for example, links that column to the referenced table and column.

## Important limitation

This is the SQLAlchemy model schema, not a live database inspection. If the database has migrations or manually created tables not represented in loaded metadata, compare this document with the actual database before claiming it represents every deployed table.

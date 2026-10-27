from pathlib import Path
import argparse

import joblib
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "attrition_model.joblib"

FEATURES = [
    "overtime",
    "job_satisfaction",
    "work_life_balance",
    "years_at_company",
    "monthly_income",
    "training_hours",
]

DEMO_ROWS = [
    (1, 1, 1, 1, 22000, 10, 1),
    (1, 2, 2, 2, 28000, 12, 1),
    (1, 1, 2, 1, 25000, 8, 1),
    (0, 1, 2, 3, 32000, 15, 1),
    (1, 2, 1, 4, 35000, 10, 1),
    (0, 2, 2, 2, 30000, 18, 0),
    (0, 4, 4, 7, 65000, 35, 0),
    (0, 3, 3, 5, 48000, 25, 0),
    (0, 4, 3, 8, 72000, 40, 0),
    (1, 3, 3, 6, 55000, 30, 0),
    (1, 1, 1, 1, 20000, 5, 1),
    (1, 2, 1, 2, 26000, 10, 1),
    (0, 4, 4, 10, 85000, 45, 0),
    (0, 3, 4, 6, 60000, 32, 0),
    (1, 2, 3, 4, 40000, 20, 0),
    (0, 2, 1, 2, 31000, 12, 1),
    (1, 3, 2, 3, 37000, 18, 0),
    (0, 4, 3, 4, 52000, 28, 0),
    (1, 1, 2, 2, 24000, 7, 1),
    (0, 3, 3, 9, 70000, 38, 0),
    (1, 2, 2, 5, 42000, 15, 1),
    (0, 4, 4, 3, 45000, 25, 0),
    (1, 3, 2, 1, 23000, 12, 1),
    (0, 2, 3, 7, 58000, 33, 0),
    (1, 1, 1, 3, 29000, 9, 1),
    (0, 4, 4, 5, 62000, 36, 0),
    (1, 2, 3, 6, 50000, 20, 0),
    (0, 3, 2, 2, 34000, 16, 0),
    (1, 1, 2, 4, 33000, 11, 1),
    (0, 4, 3, 11, 90000, 48, 0),
]


def normalize_column(column):
    return "".join(ch.lower() for ch in str(column) if ch.isalnum())


def load_training_data(csv_path=None):
    if csv_path:
        data = pd.read_csv(csv_path)

        normalized = {
            normalize_column(column): column
            for column in data.columns
        }

        aliases = {
            "overtime": ["overtime", "over_time"],
            "job_satisfaction": [
                "jobsatisfaction",
                "jobsatisfactionrating",
            ],
            "work_life_balance": [
                "worklifebalance",
                "worklifebalancerating",
            ],
            "years_at_company": [
                "yearsatcompany",
                "yearsatcompany",
                "tenure",
            ],
            "monthly_income": ["monthlyincome", "monthlysalary"],
            "training_hours": ["traininghours", "trainingtimeslastyear"],
            "attrition": ["attrition", "leftcompany", "target"],
        }

        rename = {}

        for target, candidates in aliases.items():
            matched = next(
                (normalized[name] for name in candidates if name in normalized),
                None,
            )
            if matched is None:
                raise ValueError(
                    f"Dataset is missing required column '{target}'. "
                    f"Accepted names: {candidates}"
                )
            rename[matched] = target

        data = data.rename(columns=rename)
        data = data[list(FEATURES) + ["attrition"]].copy()
        demo_data = False

    else:
        data = pd.DataFrame(
            DEMO_ROWS,
            columns=FEATURES + ["attrition"],
        )
        demo_data = True

    for column in FEATURES:
        data[column] = pd.to_numeric(data[column], errors="coerce")

    data["attrition"] = data["attrition"].astype(str).str.strip().str.lower()
    data["attrition"] = data["attrition"].replace({
        "yes": "1",
        "true": "1",
        "left": "1",
        "no": "0",
        "false": "0",
        "stayed": "0",
    })

    data["attrition"] = pd.to_numeric(
        data["attrition"],
        errors="coerce",
    )

    data = data.dropna(subset=["attrition"])
    data = data[data["attrition"].isin([0, 1])]

    if len(data) < 10:
        raise ValueError("At least 10 valid labeled records are required.")

    if data["attrition"].nunique() != 2:
        raise ValueError(
            "The training dataset must contain both attrition classes: 0 and 1."
        )

    if data["attrition"].value_counts().min() < 2:
        raise ValueError(
            "Each attrition class must contain at least two records."
        )

    return data, demo_data


def train(csv_path=None):
    data, demo_data = load_training_data(csv_path)

    X = data[FEATURES]
    y = data["attrition"].astype(int)

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.25,
        random_state=42,
        stratify=y,
    )

    numeric_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
    ])

    preprocessing = ColumnTransformer([
        ("numeric", numeric_pipeline, FEATURES),
    ])

    model = Pipeline([
        ("preprocessing", preprocessing),
        (
            "classifier",
            RandomForestClassifier(
                n_estimators=200,
                max_depth=8,
                random_state=42,
                class_weight="balanced",
            ),
        ),
    ])

    model.fit(X_train, y_train)
    predictions = model.predict(X_test)

    metrics = {
        "accuracy": round(float(accuracy_score(y_test, predictions)), 4),
        "training_rows": int(len(X_train)),
        "validation_rows": int(len(X_test)),
        "dataset_rows": int(len(data)),
        "class_distribution": {
            str(key): int(value)
            for key, value in y.value_counts().items()
        },
        "classification_report": classification_report(
            y_test,
            predictions,
            output_dict=True,
            zero_division=0,
        ),
    }

    bundle = {
        "model": model,
        "features": FEATURES,
        "demo_data": demo_data,
        "metrics": metrics,
        "model_version": "1.1",
        "training_source": "synthetic_demo" if demo_data else "uploaded_csv",
    }

    temporary_path = MODEL_PATH.with_suffix(".tmp")
    joblib.dump(bundle, temporary_path)
    temporary_path.replace(MODEL_PATH)

    print("Attrition model training completed.")
    print(f"Training source: {bundle['training_source']}")
    print(f"Dataset rows: {len(data)}")
    print(f"Holdout accuracy: {metrics['accuracy']:.2%}")
    print(f"Model saved to: {MODEL_PATH}")
    print("Important: holdout metrics do not establish real-world validity.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Train the WorkForce AI Pro attrition model."
    )
    parser.add_argument(
        "--csv",
        type=str,
        default=None,
        help="Path to a labeled HR CSV dataset.",
    )
    arguments = parser.parse_args()
    train(arguments.csv)

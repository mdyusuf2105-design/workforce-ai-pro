from enum import Enum


class Role(str, Enum):
    ADMIN = "ADMIN"
    HR = "HR"
    MANAGER = "MANAGER"
    EMPLOYEE = "EMPLOYEE"


ROLE_PERMISSIONS = {
    Role.ADMIN: [
        "employee:read",
        "employee:create",
        "employee:update",
        "employee:delete",
        "attendance:read",
        "attendance:manage",
        "leave:read",
        "leave:manage",
        "payroll:read",
        "payroll:manage",
        "reports:read",
        "users:manage",
        "analytics:read",
    ],
    Role.HR: [
        "employee:read",
        "employee:create",
        "employee:update",
        "attendance:read",
        "attendance:manage",
        "leave:read",
        "leave:manage",
        "payroll:read",
        "payroll:manage",
        "reports:read",
        "analytics:read",
    ],
    Role.MANAGER: [
        "employee:read",
        "attendance:read",
        "leave:read",
        "leave:manage",
        "reports:read",
        "analytics:read",
    ],
    Role.EMPLOYEE: [
        "employee:read",
        "attendance:read",
        "leave:read",
    ],
}


def normalize_role(role):
    if hasattr(role, "value"):
        role = role.value

    normalized = str(role or "").strip().upper()

    if normalized.startswith("ROLE."):
        normalized = normalized.split(".", 1)[1]

    return normalized


def get_permissions(role):
    normalized = normalize_role(role)

    for known_role, permissions in ROLE_PERMISSIONS.items():
        if known_role.value == normalized:
            return permissions.copy()

    return []


def has_permission(role, permission):
    return permission in get_permissions(role)

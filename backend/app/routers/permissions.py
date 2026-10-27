from fastapi import APIRouter, Depends

from app.routers.auth import get_current_user
from app.core.permissions import get_permissions, normalize_role

router = APIRouter(
    prefix="/api/permissions",
    tags=["Role-Based Access Control"],
)


@router.get("/me")
def my_permissions(current_user=Depends(get_current_user)):
    role = normalize_role(getattr(current_user, "role", None))

    return {
        "role": role,
        "permissions": get_permissions(role),
    }

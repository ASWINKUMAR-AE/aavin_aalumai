from typing import List, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.security import decode_token

security_scheme = HTTPBearer(auto_error=False)

ROLE_PERMISSIONS = {
    "worker": [
        "reading.capture",
        "reading.view.own",
        "reading.correction.request",
        "reset.request",
        "wastage.create",
        "report.view.own",
        "chain.view.own"
    ],
    "supervisor": [
        "reading.capture",
        "reading.view.assigned",
        "reading.view.own",
        "reading.correction.review",
        "reset.request",
        "reset.approve",
        "anomaly.view",
        "anomaly.review",
        "anomaly.resolve",
        "wastage.create",
        "wastage.verify",
        "audit.create",
        "calibration.create",
        "report.view.assigned",
        "chain.view.assigned"
    ],
    "official": [
        "reading.view.all",
        "anomaly.view",
        "report.view.all",
        "report.export",
        "chain.view.all",
        "anchor.view",
        "audit.view",
        "evidence.view"
    ],
    "admin": [
        "reading.view.all",
        "reading.correction.review",
        "anomaly.view",
        "anomaly.review",
        "anomaly.resolve",
        "machine.manage",
        "head.manage",
        "variant.manage",
        "shift.manage",
        "threshold.manage",
        "user.manage",
        "role.manage",
        "notification.manage",
        "audit.view",
        "system.manage",
        "report.view.all",
        "report.export",
        "chain.view.all",
        "chain.verify",
        "anchor.view",
        "evidence.view"
    ]
}

def get_current_user_payload(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme)) -> dict:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = decode_token(credentials.credentials)
        if payload.get("type") != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return payload
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )

def require_permission(required_permission: str):
    def permission_checker(payload: dict = Depends(get_current_user_payload)) -> dict:
        role = payload.get("role", "")
        permissions = payload.get("permissions", [])
        
        # Check explicit permissions or role mapping
        if required_permission in permissions or required_permission in ROLE_PERMISSIONS.get(role, []):
            return payload
            
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: permission '{required_permission}' is required"
        )
    return permission_checker

def require_any_role(allowed_roles: List[str]):
    def role_checker(payload: dict = Depends(get_current_user_payload)) -> dict:
        role = payload.get("role", "")
        if role in allowed_roles:
            return payload
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: role must be one of {allowed_roles}"
        )
    return role_checker

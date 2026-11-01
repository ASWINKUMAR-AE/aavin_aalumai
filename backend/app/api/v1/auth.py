from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional, Any
from app.storage.store import users_store, login_attempts_store
from app.core.security import verify_password, create_access_token, create_refresh_token, decode_token
from app.core.permissions import ROLE_PERMISSIONS, get_current_user_payload
from app.schemas.schemas import LoginRequest, TokenResponse, RefreshTokenRequest, UserResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest):
    users = users_store.query(lambda u: u.get("username") == request.username)
    user = users[0] if users else None

    if not user or not verify_password(request.password, user.get("hashed_password", "")):
        login_attempts_store.append_event({
            "username": request.username,
            "success": False,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

    if not user.get("is_active", True) or user.get("is_locked", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated or locked"
        )

    login_attempts_store.append_event({
        "username": request.username,
        "success": True,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

    role = user.get("role", "worker")
    permissions = ROLE_PERMISSIONS.get(role, [])
    user_id = str(user.get("id"))
    full_name = user.get("full_name", "")

    access_token = create_access_token(
        subject=user_id,
        role=role,
        permissions=permissions,
        extra_claims={"username": user.get("username"), "full_name": full_name}
    )
    refresh_token = create_refresh_token(subject=user_id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        role=role,
        user_id=user_id,
        full_name=full_name,
        permissions=permissions
    )

@router.post("/refresh")
def refresh_token(request: RefreshTokenRequest):
    try:
        payload = decode_token(request.refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=400, detail="Invalid token type")
        user_id = payload.get("sub")
        user = users_store.get_by_id(user_id)
        if not user or not user.get("is_active", True):
            raise HTTPException(status_code=403, detail="User account is inactive")

        role = user.get("role", "worker")
        permissions = ROLE_PERMISSIONS.get(role, [])
        new_access = create_access_token(
            subject=user_id,
            role=role,
            permissions=permissions,
            extra_claims={"username": user.get("username"), "full_name": user.get("full_name")}
        )
        return {"access_token": new_access, "token_type": "bearer"}
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

@router.get("/me", response_model=UserResponse)
def get_me(payload: dict = Depends(get_current_user_payload)):
    user = users_store.get_by_id(payload.get("sub"))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

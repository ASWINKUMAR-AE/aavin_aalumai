from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import verify_password, create_access_token, create_refresh_token, decode_token
from app.core.permissions import ROLE_PERMISSIONS, get_current_user_payload
from app.models.auth import User, LoginAttempt
from app.schemas.schemas import LoginRequest, TokenResponse, RefreshTokenRequest, UserResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == request.username).first()
    if not user or not verify_password(request.password, user.hashed_password):
        attempt = LoginAttempt(username=request.username, success=False)
        db.add(attempt)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    if not user.is_active or user.is_locked:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated or locked"
        )

    attempt = LoginAttempt(username=request.username, success=True)
    db.add(attempt)
    db.commit()

    permissions = ROLE_PERMISSIONS.get(user.role, [])
    access_token = create_access_token(
        subject=user.id,
        role=user.role,
        permissions=permissions,
        extra_claims={"username": user.username, "full_name": user.full_name}
    )
    refresh_token = create_refresh_token(subject=user.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        role=user.role,
        user_id=user.id,
        full_name=user.full_name,
        permissions=permissions
    )

@router.post("/refresh")
def refresh_token(request: RefreshTokenRequest, db: Session = Depends(get_db)):
    try:
        payload = decode_token(request.refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=400, detail="Invalid token type")
        user_id = payload.get("sub")
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.is_active:
            raise HTTPException(status_code=403, detail="User account is inactive")
        
        permissions = ROLE_PERMISSIONS.get(user.role, [])
        new_access = create_access_token(
            subject=user.id,
            role=user.role,
            permissions=permissions,
            extra_claims={"username": user.username, "full_name": user.full_name}
        )
        return {"access_token": new_access, "token_type": "bearer"}
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

@router.get("/me", response_model=UserResponse)
def get_me(payload: dict = Depends(get_current_user_payload), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == payload.get("sub")).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

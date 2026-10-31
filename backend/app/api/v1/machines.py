from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.permissions import get_current_user_payload
from app.models.machine import Machine, Head, Variant, Shift
from app.schemas.schemas import MachineResponse, HeadResponse, VariantResponse, ShiftResponse

router = APIRouter(prefix="/machines", tags=["Machines"])

@router.get("", response_model=List[MachineResponse])
def get_machines(db: Session = Depends(get_db), payload: dict = Depends(get_current_user_payload)):
    machines = db.query(Machine).filter(Machine.is_active == True).all()
    return machines

@router.get("/variants", response_model=List[VariantResponse])
def get_variants(db: Session = Depends(get_db), payload: dict = Depends(get_current_user_payload)):
    variants = db.query(Variant).filter(Variant.is_active == True).all()
    return variants

@router.get("/shifts", response_model=List[ShiftResponse])
def get_shifts(db: Session = Depends(get_db), payload: dict = Depends(get_current_user_payload)):
    shifts = db.query(Shift).filter(Shift.is_active == True).all()
    return shifts

@router.get("/{machine_id}", response_model=MachineResponse)
def get_machine(machine_id: str, db: Session = Depends(get_db), payload: dict = Depends(get_current_user_payload)):
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    return machine

@router.get("/{machine_id}/heads", response_model=List[HeadResponse])
def get_machine_heads(machine_id: str, db: Session = Depends(get_db), payload: dict = Depends(get_current_user_payload)):
    heads = db.query(Head).filter(Head.machine_id == machine_id, Head.is_active == True).all()
    return heads

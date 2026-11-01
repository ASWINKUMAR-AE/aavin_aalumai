from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.permissions import get_current_user_payload
from app.storage.store import heads_store, readings_stream
from app.schemas.schemas import HeadResponse, ReadingResponse, HashChainStatusResponse
from app.services.hash_chain_service import HashChainService

router = APIRouter(prefix="/heads", tags=["Machine Heads"])

def _enrich_head(h: dict) -> HeadResponse:
    h_copy = dict(h)
    h_id = h_copy.get("id")
    latest = readings_stream.read_stream(filter_func=lambda r: r.get("head_id") == h_id, reverse=True, limit=1)
    if latest:
        h_copy["latest_counter"] = latest[0].get("confirmed_value", 0)
        h_copy["latest_reading_time"] = latest[0].get("server_time")
    else:
        h_copy["latest_counter"] = h_copy.get("latest_counter", 0)
        h_copy["latest_reading_time"] = h_copy.get("latest_reading_time")
    return HeadResponse(**h_copy)

@router.get("", response_model=List[HeadResponse])
def get_all_heads(payload: dict = Depends(get_current_user_payload)):
    heads = heads_store.query(lambda h: h.get("is_active", True))
    return [_enrich_head(h) for h in heads]

@router.get("/lookup-qr", response_model=HeadResponse)
def lookup_by_qr(qr: str = Query(...), payload: dict = Depends(get_current_user_payload)):
    matches = heads_store.query(lambda h: h.get("qr_identifier") == qr and h.get("is_active", True))
    if not matches:
        raise HTTPException(status_code=404, detail="Unrecognized Head QR code")
    return _enrich_head(matches[0])

@router.get("/{head_id}", response_model=HeadResponse)
def get_head(head_id: str, payload: dict = Depends(get_current_user_payload)):
    head = heads_store.get_by_id(head_id)
    if not head:
        matches = heads_store.query(lambda h: h.get("head_code") == head_id)
        head = matches[0] if matches else None
    if not head:
        raise HTTPException(status_code=404, detail="Head not found")
    return _enrich_head(head)

@router.get("/{head_id}/chain-status", response_model=HashChainStatusResponse)
def get_chain_status(head_id: str, payload: dict = Depends(get_current_user_payload)):
    head = heads_store.get_by_id(head_id)
    if not head:
        matches = heads_store.query(lambda h: h.get("head_code") == head_id)
        head = matches[0] if matches else None
    if not head:
        raise HTTPException(status_code=404, detail="Head not found")

    is_valid, total_checked, discrepancies = HashChainService.verify_head_chain(head_id=head.get("id"))

    return HashChainStatusResponse(
        head_id=head.get("id"),
        head_code=head.get("head_code"),
        is_valid=is_valid,
        total_checked=total_checked,
        genesis_hash=head.get("genesis_hash", ""),
        latest_hash=head.get("current_hash", ""),
        last_verified_at=datetime.now(timezone.utc),
        discrepancies=discrepancies
    )

@router.post("/{head_id}/verify-chain", response_model=HashChainStatusResponse)
def trigger_chain_verification(head_id: str, payload: dict = Depends(get_current_user_payload)):
    return get_chain_status(head_id, payload)

@router.get("/{head_id}/history", response_model=List[ReadingResponse])
def get_head_reading_history(
    head_id: str,
    limit: int = 50,
    payload: dict = Depends(get_current_user_payload)
):
    readings = readings_stream.read_stream(
        filter_func=lambda r: r.get("head_id") == head_id or r.get("head_code") == head_id,
        reverse=True,
        limit=limit
    )
    return [ReadingResponse(**r) for r in readings]

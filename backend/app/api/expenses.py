"""
Expenses Routes.
POST   /expenses              - Create expense
GET    /expenses/{trip_id}    - Get all expenses for a trip
DELETE /expenses/{expense_id} - Delete an expense
"""
import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
import jwt
from app.database.database import get_db
from app.services.expense_service import expense_service
from app.services.trip_service import trip_service
from app.schemas.request import ExpenseCreate
from app.schemas.response import ExpenseResponse
from app.config import settings

router = APIRouter(prefix="/expenses", tags=["Expenses"])
logger = logging.getLogger(__name__)


def get_current_user_id(authorization: str = Header(...)) -> str:
    try:
        token = authorization.replace("Bearer ", "")
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload["sub"]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")


@router.post("", response_model=ExpenseResponse, status_code=201)
def create_expense(
    data: ExpenseCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    # Verify the trip belongs to the user
    trip = trip_service.get_trip(db, data.trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found.")
    if trip.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied.")
    return expense_service.create_expense(db, data)


@router.get("/{trip_id}", response_model=List[ExpenseResponse])
def get_expenses(
    trip_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    trip = trip_service.get_trip(db, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found.")
    if trip.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied.")
    return expense_service.get_expenses(db, trip_id)


@router.delete("/{expense_id}", status_code=204)
def delete_expense(
    expense_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    expense = expense_service.get_expense(db, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found.")
    # Verify ownership via trip
    trip = trip_service.get_trip(db, expense.trip_id)
    if not trip or trip.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied.")
    expense_service.delete_expense(db, expense_id)

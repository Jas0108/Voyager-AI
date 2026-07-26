"""
Expense Service - All expense-related database operations.
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.expense import Expense
from app.schemas.request import ExpenseCreate
import logging

logger = logging.getLogger(__name__)


class ExpenseService:
    def create_expense(self, db: Session, data: ExpenseCreate) -> Expense:
        expense = Expense(
            trip_id=data.trip_id,
            category=data.category,
            amount=data.amount,
            currency=data.currency or "USD",
            description=data.description,
        )
        db.add(expense)
        db.commit()
        db.refresh(expense)
        logger.info(f"Expense created: {expense.id} for trip {data.trip_id}")
        return expense

    def get_expenses(self, db: Session, trip_id: str) -> List[Expense]:
        return (
            db.query(Expense)
            .filter(Expense.trip_id == trip_id)
            .order_by(Expense.created_at.desc())
            .all()
        )

    def get_expense(self, db: Session, expense_id: str) -> Optional[Expense]:
        return db.query(Expense).filter(Expense.id == expense_id).first()

    def delete_expense(self, db: Session, expense_id: str) -> bool:
        expense = self.get_expense(db, expense_id)
        if not expense:
            return False
        db.delete(expense)
        db.commit()
        return True

    def get_total_spent(self, db: Session, trip_id: str) -> float:
        expenses = self.get_expenses(db, trip_id)
        return sum(e.amount for e in expenses)


expense_service = ExpenseService()

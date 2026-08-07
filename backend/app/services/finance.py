from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.finance import Wallet, Transaction, TransactionType, TransactionStatus
from app.core.logger import logger


def create_wallet(db: Session, user_id: str, currency: str = 'USD') -> Wallet:
    try:
        existing = db.query(Wallet).filter(Wallet.user_id == user_id).first()
        if existing:
            return existing

        wallet = Wallet(
            user_id=user_id,
            balance=0.0,
            locked_balance=0.0,
            currency=currency
        )
        db.add(wallet)
        db.commit()
        db.refresh(wallet)
        return wallet
    except Exception as e:
        db.rollback()
        logger.exception(f"Error creating wallet: {e}")
        raise


def get_wallet_by_user_id(db: Session, user_id: str) -> Optional[Wallet]:
    return db.query(Wallet).filter(Wallet.user_id == user_id).first()


def deposit(db: Session, wallet_id: str, amount: float) -> Transaction:
    try:
        if amount <= 0:
            raise ValueError("Amount must be positive")

        wallet = db.query(Wallet).filter(Wallet.id == wallet_id).first()
        if not wallet:
            raise ValueError("Wallet not found")

        wallet.balance += amount

        transaction = Transaction(
            wallet_id=wallet_id,
            amount=amount,
            transaction_type=TransactionType.DEPOSIT,
            status=TransactionStatus.COMPLETED
        )
        db.add(transaction)
        db.commit()
        db.refresh(transaction)
        return transaction
    except Exception as e:
        db.rollback()
        logger.exception(f"Error depositing: {e}")
        raise


def withdraw(db: Session, wallet_id: str, amount: float) -> Transaction:
    try:
        if amount <= 0:
            raise ValueError("Amount must be positive")

        wallet = db.query(Wallet).filter(Wallet.id == wallet_id).first()
        if not wallet:
            raise ValueError("Wallet not found")

        if wallet.balance < amount:
            raise ValueError("Insufficient balance")

        wallet.balance -= amount

        transaction = Transaction(
            wallet_id=wallet_id,
            amount=amount,
            transaction_type=TransactionType.WITHDRAWAL,
            status=TransactionStatus.COMPLETED
        )
        db.add(transaction)
        db.commit()
        db.refresh(transaction)
        return transaction
    except Exception as e:
        db.rollback()
        logger.exception(f"Error withdrawing: {e}")
        raise


def get_transactions(db: Session, wallet_id: str, limit: int = 50) -> List[Transaction]:
    return db.query(Transaction).filter(
        Transaction.wallet_id == wallet_id
    ).order_by(Transaction.created_at.desc()).limit(limit).all()

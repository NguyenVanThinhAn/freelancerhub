from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum


class TransactionTypeEnum(str, Enum):
    DEPOSIT = 'DEPOSIT'
    WITHDRAWAL = 'WITHDRAWAL'
    ESCROW_LOCK = 'ESCROW_LOCK'
    ESCROW_RELEASE = 'ESCROW_RELEASE'
    PAYMENT_SENT = 'PAYMENT_SENT'
    PAYMENT_RECEIVED = 'PAYMENT_RECEIVED'


class TransactionStatusEnum(str, Enum):
    PENDING = 'PENDING'
    COMPLETED = 'COMPLETED'
    FAILED = 'FAILED'


class WalletOut(BaseModel):
    id: str
    user_id: str
    balance: float
    locked_balance: float
    currency: str
    updated_at: datetime

    class Config:
        from_attributes = True


class TransactionOut(BaseModel):
    id: str
    wallet_id: str
    amount: float
    transaction_type: TransactionTypeEnum
    reference_id: Optional[str]
    status: TransactionStatusEnum
    created_at: datetime

    class Config:
        from_attributes = True


class DepositRequest(BaseModel):
    amount: float


class WithdrawRequest(BaseModel):
    amount: float

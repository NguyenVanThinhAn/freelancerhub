from sqlalchemy import Column, String, DateTime, Float, Enum, ForeignKey
from sqlalchemy.orm import relationship
import enum
from datetime import datetime, timezone
import uuid
from app.database import Base


class TransactionType(str, enum.Enum):
    DEPOSIT = 'DEPOSIT'
    WITHDRAWAL = 'WITHDRAWAL'
    ESCROW_LOCK = 'ESCROW_LOCK'
    ESCROW_RELEASE = 'ESCROW_RELEASE'
    PAYMENT_SENT = 'PAYMENT_SENT'
    PAYMENT_RECEIVED = 'PAYMENT_RECEIVED'


class TransactionStatus(str, enum.Enum):
    PENDING = 'PENDING'
    COMPLETED = 'COMPLETED'
    FAILED = 'FAILED'


class Wallet(Base):
    __tablename__ = 'wallets'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True)

    balance = Column(Float, nullable=False, default=0.0)
    locked_balance = Column(Float, nullable=False, default=0.0)
    currency = Column(String(10), nullable=False, default='USD')

    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship('User', backref='wallet')


class Transaction(Base):
    __tablename__ = 'transactions'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    wallet_id = Column(String(36), ForeignKey('wallets.id', ondelete='CASCADE'), nullable=False)

    amount = Column(Float, nullable=False)
    transaction_type = Column(Enum(TransactionType), nullable=False)

    reference_id = Column(String(36), nullable=True)
    status = Column(Enum(TransactionStatus), nullable=False, default=TransactionStatus.PENDING)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    wallet = relationship('Wallet', backref='transactions')

class EscrowAccount(Base):
    __tablename__ = 'escrow_accounts'
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    contract_id = Column(String(36), ForeignKey('contracts.id', ondelete='CASCADE'), nullable=False)
    wallet_id = Column(String(36), ForeignKey('wallets.id', ondelete='CASCADE'), nullable=False)
    amount = Column(Float, nullable=False, default=0.0)
    status = Column(String(50), nullable=False, default='LOCKED')
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

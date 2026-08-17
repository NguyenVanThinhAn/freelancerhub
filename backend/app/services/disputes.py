from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.disputes import Dispute, DisputeEvidence, DisputeStatus, DisputeReasonCode
from app.models.contracts import Contract, ContractStatus, Milestone, MilestoneStatus
from app.models.finance import Wallet, Transaction, TransactionType, TransactionStatus
from app.core.logger import logger


def create_dispute(
    db: Session,
    contract_id: str,
    initiator_id: str,
    reason: str,
    milestone_id: Optional[str] = None
) -> Dispute:
    try:
        contract = db.query(Contract).filter(Contract.id == contract_id).first()
        if contract:
            contract.status = ContractStatus.disputed

        dispute = Dispute(
            contract_id=contract_id,
            milestone_id=milestone_id,
            opened_by=initiator_id,
            reason_code=DisputeReasonCode.delivery,
            description=reason,
            severity='medium',
            status=DisputeStatus.OPEN
        )
        db.add(dispute)
        db.commit()
        db.refresh(dispute)
        return dispute
    except Exception as e:
        db.rollback()
        logger.exception(f"Error creating dispute: {e}")
        raise


def get_dispute_by_id(db: Session, dispute_id: str) -> Optional[Dispute]:
    return db.query(Dispute).filter(Dispute.id == dispute_id).first()


def get_disputes_by_contract(db: Session, contract_id: str) -> List[Dispute]:
    return db.query(Dispute).filter(Dispute.contract_id == contract_id).all()


def list_evidence(db: Session, dispute_id: str) -> List[DisputeEvidence]:
    return db.query(DisputeEvidence).filter(DisputeEvidence.dispute_id == dispute_id).order_by(DisputeEvidence.submitted_at.asc()).all()


def submit_evidence(
    db: Session,
    dispute_id: str,
    submitter_id: str,
    evidence_text: str,
    file_urls: Optional[List[str]] = None
) -> DisputeEvidence:
    try:
        evidence = DisputeEvidence(
            dispute_id=dispute_id,
            submitter_id=submitter_id,
            evidence_text=evidence_text,
            file_urls=file_urls
        )
        db.add(evidence)
        db.commit()
        db.refresh(evidence)
        return evidence
    except Exception as e:
        db.rollback()
        logger.exception(f"Error submitting evidence: {e}")
        raise


def resolve_dispute(
    db: Session,
    dispute_id: str,
    resolution_type: str,
    freelancer_percentage: float = 100,
    notes: Optional[str] = None
) -> Optional[Dispute]:
    try:
        dispute = db.query(Dispute).filter(Dispute.id == dispute_id).first()
        if not dispute:
            return None

        contract = db.query(Contract).filter(Contract.id == dispute.contract_id).first()
        milestone = None
        if dispute.milestone_id:
            milestone = db.query(Milestone).filter(Milestone.id == dispute.milestone_id).first()

        if resolution_type == 'freelancer':
            dispute.status = DisputeStatus.RESOLVED_FREELANCER
            if milestone:
                milestone.status = MilestoneStatus.PAID
                _release_to_freelancer(db, contract, milestone)
        elif resolution_type == 'client':
            dispute.status = DisputeStatus.RESOLVED_CLIENT
            if milestone:
                milestone.status = MilestoneStatus.PAID
                _refund_to_client(db, contract, milestone)
        else:
            dispute.status = DisputeStatus.MUTUAL_AGREEMENT
            if milestone:
                milestone.status = MilestoneStatus.PAID
                _split_payment(db, contract, milestone, freelancer_percentage)

        dispute.resolution_notes = notes

        if contract:
            contract.status = ContractStatus.active

        db.commit()
        db.refresh(dispute)
        return dispute
    except Exception as e:
        db.rollback()
        logger.exception(f"Error resolving dispute: {e}")
        raise


def _release_to_freelancer(db: Session, contract: Contract, milestone: Milestone):
    freelancer_wallet = db.query(Wallet).filter(Wallet.user_id == contract.freelancer_id).with_for_update().first()
    org_wallet = db.query(Wallet).filter(Wallet.user_id == contract.organization_id).with_for_update().first()

    if freelancer_wallet:
        freelancer_wallet.balance += milestone.amount
        db.add(Transaction(
            wallet_id=freelancer_wallet.id,
            amount=milestone.amount,
            transaction_type=TransactionType.PAYMENT_RECEIVED,
            reference_id=milestone.id,
            status=TransactionStatus.COMPLETED
        ))

    if org_wallet:
        org_wallet.locked_balance -= milestone.amount
        db.add(Transaction(
            wallet_id=org_wallet.id,
            amount=milestone.amount,
            transaction_type=TransactionType.ESCROW_RELEASE,
            reference_id=milestone.id,
            status=TransactionStatus.COMPLETED
        ))


def _refund_to_client(db: Session, contract: Contract, milestone: Milestone):
    org_wallet = db.query(Wallet).filter(Wallet.user_id == contract.organization_id).with_for_update().first()
    if org_wallet:
        org_wallet.balance += milestone.amount
        org_wallet.locked_balance -= milestone.amount
        db.add(Transaction(
            wallet_id=org_wallet.id,
            amount=milestone.amount,
            transaction_type=TransactionType.ESCROW_RELEASE,
            reference_id=milestone.id,
            status=TransactionStatus.COMPLETED
        ))


def _split_payment(db: Session, contract: Contract, milestone: Milestone, freelancer_pct: float):
    freelancer_amount = milestone.amount * (freelancer_pct / 100)
    client_amount = milestone.amount - freelancer_amount

    freelancer_wallet = db.query(Wallet).filter(Wallet.user_id == contract.freelancer_id).with_for_update().first()
    org_wallet = db.query(Wallet).filter(Wallet.user_id == contract.organization_id).with_for_update().first()

    if freelancer_wallet:
        freelancer_wallet.balance += freelancer_amount
        db.add(Transaction(
            wallet_id=freelancer_wallet.id,
            amount=freelancer_amount,
            transaction_type=TransactionType.PAYMENT_RECEIVED,
            reference_id=milestone.id,
            status=TransactionStatus.COMPLETED
        ))

    if org_wallet:
        org_wallet.locked_balance -= milestone.amount
        if client_amount > 0:
            org_wallet.balance += client_amount
            db.add(Transaction(
                wallet_id=org_wallet.id,
                amount=client_amount,
                transaction_type=TransactionType.ESCROW_RELEASE,
                reference_id=milestone.id,
                status=TransactionStatus.COMPLETED
            ))

from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
from app.models.contracts import Contract, ContractStatus, Milestone, MilestoneStatus, Deliverable, DeliverableStatus
from app.models.jobs import Job, JobStatus
from app.models.proposals import Proposal, ProposalStatus
from app.models.finance import Wallet, Transaction, TransactionType, TransactionStatus
from app.core.logger import logger


def create_contract(
    db: Session,
    job_id: str,
    freelancer_id: str,
    organization_id: str,
    total_amount: float,
    proposal_id: Optional[str] = None
) -> Contract:
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if job:
            job.status = JobStatus.IN_PROGRESS

        contract = Contract(
            job_id=job_id,
            freelancer_id=freelancer_id,
            organization_id=organization_id,
            proposal_id=proposal_id,
            total_amount=total_amount,
            status=ContractStatus.ACTIVE
        )
        db.add(contract)
        db.flush()

        wallet = db.query(Wallet).filter(Wallet.user_id == organization_id).first()
        if wallet and wallet.balance >= total_amount:
            wallet.balance -= total_amount
            wallet.locked_balance += total_amount

            tx = Transaction(
                wallet_id=wallet.id,
                amount=total_amount,
                transaction_type=TransactionType.ESCROW_LOCK,
                reference_id=contract.id,
                status=TransactionStatus.COMPLETED
            )
            db.add(tx)

        db.commit()
        db.refresh(contract)
        return contract
    except Exception as e:
        db.rollback()
        logger.exception(f"Error creating contract: {e}")
        raise


def get_contract_by_id(db: Session, contract_id: str) -> Optional[Contract]:
    return db.query(Contract).filter(Contract.id == contract_id).first()


def get_contracts_by_freelancer(db: Session, freelancer_id: str) -> List[Contract]:
    return db.query(Contract).filter(Contract.freelancer_id == freelancer_id).all()


def get_contracts_by_organization(db: Session, organization_id: str) -> List[Contract]:
    return db.query(Contract).filter(Contract.organization_id == organization_id).all()


def create_milestone(
    db: Session,
    contract_id: str,
    title: str,
    description: Optional[str],
    amount: float,
    due_date: Optional[datetime] = None
) -> Milestone:
    try:
        milestone = Milestone(
            contract_id=contract_id,
            title=title,
            description=description,
            amount=amount,
            due_date=due_date,
            status=MilestoneStatus.PENDING
        )
        db.add(milestone)
        db.commit()
        db.refresh(milestone)
        return milestone
    except Exception as e:
        db.rollback()
        logger.exception(f"Error creating milestone: {e}")
        raise


def submit_deliverable(
    db: Session,
    milestone_id: str,
    freelancer_id: str,
    content: str,
    file_urls: Optional[List[str]] = None
) -> Deliverable:
    try:
        milestone = db.query(Milestone).filter(Milestone.id == milestone_id).first()
        if milestone:
            milestone.status = MilestoneStatus.SUBMITTED

        deliverable = Deliverable(
            milestone_id=milestone_id,
            freelancer_id=freelancer_id,
            content=content,
            file_urls=file_urls,
            status=DeliverableStatus.PENDING_REVIEW
        )
        db.add(deliverable)
        db.commit()
        db.refresh(deliverable)
        return deliverable
    except Exception as e:
        db.rollback()
        logger.exception(f"Error submitting deliverable: {e}")
        raise


def approve_deliverable(db: Session, deliverable_id: str) -> Optional[Deliverable]:
    try:
        deliverable = db.query(Deliverable).filter(Deliverable.id == deliverable_id).first()
        if not deliverable:
            return None

        deliverable.status = DeliverableStatus.APPROVED

        milestone = db.query(Milestone).filter(Milestone.id == deliverable.milestone_id).first()
        if milestone:
            milestone.status = MilestoneStatus.PAID

            contract = db.query(Contract).filter(Contract.id == milestone.contract_id).first()
            if contract:
                freelancer_wallet = db.query(Wallet).filter(Wallet.user_id == contract.freelancer_id).first()
                org_wallet = db.query(Wallet).filter(Wallet.user_id == contract.organization_id).first()

                if freelancer_wallet:
                    freelancer_wallet.balance += milestone.amount
                    tx_in = Transaction(
                        wallet_id=freelancer_wallet.id,
                        amount=milestone.amount,
                        transaction_type=TransactionType.PAYMENT_RECEIVED,
                        reference_id=milestone.id,
                        status=TransactionStatus.COMPLETED
                    )
                    db.add(tx_in)

                if org_wallet:
                    org_wallet.locked_balance -= milestone.amount
                    tx_out = Transaction(
                        wallet_id=org_wallet.id,
                        amount=milestone.amount,
                        transaction_type=TransactionType.ESCROW_RELEASE,
                        reference_id=milestone.id,
                        status=TransactionStatus.COMPLETED
                    )
                    db.add(tx_out)

        db.commit()
        db.refresh(deliverable)
        return deliverable
    except Exception as e:
        db.rollback()
        logger.exception(f"Error approving deliverable: {e}")
        raise


def reject_deliverable(db: Session, deliverable_id: str, feedback: Optional[str] = None) -> Optional[Deliverable]:
    try:
        deliverable = db.query(Deliverable).filter(Deliverable.id == deliverable_id).first()
        if not deliverable:
            return None

        deliverable.status = DeliverableStatus.REJECTED

        milestone = db.query(Milestone).filter(Milestone.id == deliverable.milestone_id).first()
        if milestone:
            milestone.status = MilestoneStatus.IN_PROGRESS

        db.commit()
        db.refresh(deliverable)
        return deliverable
    except Exception as e:
        db.rollback()
        logger.exception(f"Error rejecting deliverable: {e}")
        raise


def complete_contract(db: Session, contract_id: str) -> Optional[Contract]:
    try:
        contract = db.query(Contract).filter(Contract.id == contract_id).first()
        if not contract:
            return None

        contract.status = ContractStatus.COMPLETED
        contract.end_date = datetime.now(timezone.utc)

        job = db.query(Job).filter(Job.id == contract.job_id).first()
        if job:
            job.status = JobStatus.COMPLETED

        db.commit()
        db.refresh(contract)
        return contract
    except Exception as e:
        db.rollback()
        logger.exception(f"Error completing contract: {e}")
        raise

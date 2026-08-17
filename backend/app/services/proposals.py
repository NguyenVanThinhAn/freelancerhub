from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.proposals import Proposal, ProposalStatus
from app.models.jobs import Job, JobStatus
from app.core.logger import logger


def create_proposal(
    db: Session,
    job_id: str,
    freelancer_id: str,
    cover_letter: str,
    bid_amount: float,
    estimated_duration: Optional[int] = None
) -> Proposal:
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            raise ValueError("Job not found")
        if job.status != JobStatus.OPEN:
            raise ValueError("Job is not open for proposals")

        existing = db.query(Proposal).filter(
            Proposal.job_id == job_id,
            Proposal.freelancer_id == freelancer_id
        ).first()
        if existing:
            raise ValueError("You have already submitted a proposal for this job")

        proposal = Proposal(
            job_id=job_id,
            freelancer_id=freelancer_id,
            cover_letter=cover_letter,
            bid_amount=bid_amount,
            estimated_duration=estimated_duration,
            status=ProposalStatus.PENDING
        )
        db.add(proposal)
        db.commit()
        db.refresh(proposal)
        return proposal
    except Exception as e:
        db.rollback()
        logger.exception(f"Error creating proposal: {e}")
        raise


def get_proposal_by_id(db: Session, proposal_id: str) -> Optional[Proposal]:
    return db.query(Proposal).filter(Proposal.id == proposal_id).first()


def get_proposals_by_job(db: Session, job_id: str) -> List[Proposal]:
    return db.query(Proposal).filter(Proposal.job_id == job_id).all()


def get_proposals_by_freelancer(db: Session, freelancer_id: str) -> List[Proposal]:
    return db.query(Proposal).filter(Proposal.freelancer_id == freelancer_id).all()


def accept_proposal(db: Session, proposal_id: str) -> Optional[Proposal]:
    try:
        proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
        if not proposal:
            return None

        job = db.query(Job).filter(Job.id == proposal.job_id).first()
        if job:
            job.status = JobStatus.IN_PROGRESS

        db.query(Proposal).filter(
            Proposal.job_id == proposal.job_id,
            Proposal.id != proposal_id
        ).update({Proposal.status: ProposalStatus.REJECTED})

        proposal.status = ProposalStatus.ACCEPTED
        db.commit()
        db.refresh(proposal)
        return proposal
    except Exception as e:
        db.rollback()
        logger.exception(f"Error accepting proposal: {e}")
        raise


def reject_proposal(db: Session, proposal_id: str) -> Optional[Proposal]:
    try:
        proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
        if not proposal:
            return None
        proposal.status = ProposalStatus.REJECTED
        db.commit()
        db.refresh(proposal)
        return proposal
    except Exception as e:
        db.rollback()
        logger.exception(f"Error rejecting proposal: {e}")
        raise


def withdraw_proposal(db: Session, proposal_id: str, freelancer_id: str) -> bool:
    try:
        proposal = db.query(Proposal).filter(
            Proposal.id == proposal_id,
            Proposal.freelancer_id == freelancer_id
        ).first()
        if not proposal:
            return False
        proposal.status = ProposalStatus.WITHDRAWN
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        logger.exception(f"Error withdrawing proposal: {e}")
        raise

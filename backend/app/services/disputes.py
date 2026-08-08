"""
Service layer cho Dispute — handle state machine, defensive checks, audit log.

State machine (theo spec hiện tại, giữ từ P0):
    OPEN → UNDER_REVIEW → RESOLVED_FREELANCER | RESOLVED_CLIENT | MUTUAL_AGREEMENT → CLOSED
    (các nhánh RESOLVED_* là terminal, có thể CLOSED sau)

Mọi action phải:
1. Verify state transition hợp lệ (state machine guard)
2. Verify FK tồn tại (contract, milestone, freelancer, org owner)
3. Audit log với prior_state + new_state + reason
4. Rollback nếu bất kỳ bước nào fail (DB transaction)
"""
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone

from app.models.disputes import (
    Dispute, DisputeEvidence, DisputeStatus, DisputeReasonCode, DisputeSeverity,
    DisputeResolutionType
)
from app.models.contracts import Contract, ContractStatus, Milestone, MilestoneStatus
from app.models.organizations import Organization
from app.models.users import User
from app.models.finance import Wallet, Transaction, TransactionType, TransactionStatus
from app.models.audit_log import AuditLog, AuditActionEnum
from app.core.logger import logger


# ────────────────────────────────────────────────────────────────
# State machine guard
# ────────────────────────────────────────────────────────────────

ALLOWED_TRANSITIONS: dict[DisputeStatus, set[DisputeStatus]] = {
    DisputeStatus.OPEN: {DisputeStatus.UNDER_REVIEW, DisputeStatus.CLOSED},
    DisputeStatus.UNDER_REVIEW: {
        DisputeStatus.RESOLVED_FREELANCER,
        DisputeStatus.RESOLVED_CLIENT,
        DisputeStatus.MUTUAL_AGREEMENT,
        DisputeStatus.CLOSED,  # close without resolution (e.g. spam)
    },
    DisputeStatus.RESOLVED_FREELANCER: {DisputeStatus.CLOSED},
    DisputeStatus.RESOLVED_CLIENT: {DisputeStatus.CLOSED},
    DisputeStatus.MUTUAL_AGREEMENT: {DisputeStatus.CLOSED},
    DisputeStatus.CLOSED: set(),  # terminal
}


class DisputeStateError(Exception):
    """Raised when an invalid state transition is attempted."""


def _assert_transition(current: DisputeStatus, target: DisputeStatus):
    allowed = ALLOWED_TRANSITIONS.get(current, set())
    if target not in allowed:
        raise DisputeStateError(
            f"Không thể chuyển trạng thái từ [{current.value}] → [{target.value}]. "
            f"Các trạng thái hợp lệ tiếp theo: {[s.value for s in allowed]}"
        )


# ────────────────────────────────────────────────────────────────
# Helper: audit log
# ────────────────────────────────────────────────────────────────

def _write_audit(
    db: Session,
    *,
    actor_id: str,
    actor_role: str,
    entity_type: str,
    entity_id: str,
    action: AuditActionEnum,
    prior_state: Optional[dict],
    new_state: dict,
    reason_code: Optional[str] = None,
    notes: Optional[str] = None,
    idempotency_key: Optional[str] = None,
):
    try:
        log = AuditLog(
            actor_id=actor_id,
            actor_role=actor_role,
            entity_type=entity_type,
            entity_id=entity_id,
            action=action.value,
            prior_state=prior_state,
            new_state=new_state,
            reason_code=reason_code,
            notes=notes,
            idempotency_key=idempotency_key,
        )
        db.add(log)
        # KHÔNG commit ở đây — để caller commit cùng transaction
    except Exception as e:
        logger.exception(f"Failed to write audit log: {e}")
        raise


# ────────────────────────────────────────────────────────────────
# Create / Read
# ────────────────────────────────────────────────────────────────

def create_dispute(
    db: Session,
    *,
    actor_id: str,
    contract_id: str,
    reason_code: str,
    description: str,
    severity: str,
    milestone_id: Optional[str] = None,
    reason: Optional[str] = None,  # legacy alias for description
) -> Dispute:
    """
    Mở dispute mới. Khóa contract → DISPUTED.
    `actor_id` phải là party của contract (freelancer hoặc org owner).
    """
    try:
        contract = db.query(Contract).filter(Contract.id == contract_id).first()
        if not contract:
            raise ValueError(f"Contract {contract_id} không tồn tại")

        # Defensive: milestone phải thuộc cùng contract (spec invariant B.9.1)
        if milestone_id:
            milestone = db.query(Milestone).filter(
                Milestone.id == milestone_id,
                Milestone.contract_id == contract_id,
            ).first()
            if not milestone:
                raise ValueError(
                    f"Milestone {milestone_id} không thuộc Contract {contract_id}"
                )

        # Lock contract → DISPUTED (theo state machine B.9: disputed có thể quay active)
        contract.status = ContractStatus.disputed

        # Backward compat: chấp nhận `reason` (legacy) hoặc `description` (mới)
        desc = description or reason
        if not desc:
            raise ValueError("description (hoặc reason) là bắt buộc")

        # Map reason_code → enum; nếu legacy "reason" free-text, dùng "other"
        try:
            rc_enum = DisputeReasonCode(reason_code)
        except ValueError:
            rc_enum = DisputeReasonCode.other

        try:
            sev_enum = DisputeSeverity(severity)
        except ValueError:
            sev_enum = DisputeSeverity.medium

        dispute = Dispute(
            contract_id=contract_id,
            milestone_id=milestone_id,
            opened_by=actor_id,
            reason_code=rc_enum,
            description=desc,
            severity=sev_enum,
            status=DisputeStatus.OPEN,
        )
        db.add(dispute)
        db.flush()  # lấy dispute.id cho audit

        _write_audit(
            db,
            actor_id=actor_id,
            actor_role="user",
            entity_type="dispute",
            entity_id=dispute.id,
            action=AuditActionEnum.DISPUTE_OPENED,
            prior_state=None,
            new_state={
                "status": DisputeStatus.OPEN.value,
                "contract_id": contract_id,
                "milestone_id": milestone_id,
                "severity": sev_enum.value,
                "reason_code": rc_enum.value,
            },
            reason_code=rc_enum.value,
            notes=desc[:200] if desc else None,
        )

        db.commit()
        db.refresh(dispute)
        logger.info(f"User {actor_id} mở dispute {dispute.id} cho contract {contract_id}")
        return dispute

    except Exception as e:
        db.rollback()
        logger.exception(f"Error creating dispute: {e}")
        raise


def get_dispute_by_id(db: Session, dispute_id: str) -> Optional[Dispute]:
    return db.query(Dispute).filter(Dispute.id == dispute_id).first()


def get_disputes_by_contract(db: Session, contract_id: str) -> List[Dispute]:
    return db.query(Dispute).filter(Dispute.contract_id == contract_id).all()


def get_disputes_for_user(db: Session, user_id: str) -> List[Dispute]:
    """
    List tất cả disputes mà user là party (freelancer hoặc org owner).
    Dùng cho /disputes (list user view).
    """
    # User's freelancer contracts
    user_org_ids = [
        org.id for org in db.query(Organization).filter(Organization.owner_user_id == user_id).all()
    ]
    if user_org_ids:
        return (
            db.query(Dispute)
            .join(Contract, Dispute.contract_id == Contract.id)
            .filter(
                (Contract.freelancer_id == user_id) | (Contract.organization_id.in_(user_org_ids))
            )
            .order_by(Dispute.created_at.desc())
            .all()
        )
    return (
        db.query(Dispute)
        .join(Contract, Dispute.contract_id == Contract.id)
        .filter(Contract.freelancer_id == user_id)
        .order_by(Dispute.created_at.desc())
        .all()
    )


def get_all_disputes_for_admin(
    db: Session,
    *,
    status_filter: Optional[DisputeStatus] = None,
    page: int = 1,
    limit: int = 20,
) -> tuple[List[Dispute], int]:
    """Admin queue — list tất cả disputes, optional status filter."""
    query = db.query(Dispute)
    if status_filter:
        query = query.filter(Dispute.status == status_filter)
    else:
        # Ưu tiên OPEN / UNDER_REVIEW lên đầu
        query = query.order_by(
            Dispute.status.in_([DisputeStatus.OPEN.value, DisputeStatus.UNDER_REVIEW.value]).desc(),
            Dispute.created_at.desc(),
        )
    total = query.count()
    offset = (page - 1) * limit
    items = query.offset(offset).limit(limit).all()
    return items, total


# ────────────────────────────────────────────────────────────────
# Submit evidence
# ────────────────────────────────────────────────────────────────

def submit_evidence(
    db: Session,
    *,
    dispute_id: str,
    submitter_id: str,
    evidence_text: str,
    file_urls: Optional[List[str]] = None,
) -> DisputeEvidence:
    """User nộp minh chứng cho dispute của họ. Defensive: dispute phải tồn tại."""
    try:
        dispute = get_dispute_by_id(db, dispute_id)
        if not dispute:
            raise ValueError(f"Dispute {dispute_id} không tồn tại")

        if not evidence_text or not evidence_text.strip():
            raise ValueError("evidence_text không được rỗng")

        evidence = DisputeEvidence(
            dispute_id=dispute_id,
            submitter_id=submitter_id,
            evidence_text=evidence_text.strip(),
            file_urls=file_urls or [],
        )
        db.add(evidence)

        # Auto-transition OPEN → UNDER_REVIEW khi có evidence đầu tiên
        if dispute.status == DisputeStatus.OPEN:
            prior = dispute.status
            _assert_transition(prior, DisputeStatus.UNDER_REVIEW)
            dispute.status = DisputeStatus.UNDER_REVIEW
            _write_audit(
                db,
                actor_id=submitter_id,
                actor_role="user",
                entity_type="dispute",
                entity_id=dispute.id,
                action=AuditActionEnum.DISPUTE_TRANSITIONED,
                prior_state={"status": prior.value},
                new_state={"status": DisputeStatus.UNDER_REVIEW.value, "trigger": "first_evidence"},
            )

        db.commit()
        db.refresh(evidence)
        logger.info(f"User {submitter_id} nộp evidence {evidence.id} cho dispute {dispute_id}")
        return evidence

    except Exception as e:
        db.rollback()
        logger.exception(f"Error submitting evidence: {e}")
        raise


# ────────────────────────────────────────────────────────────────
# Resolve (Admin only — enforced by router require_role)
# ────────────────────────────────────────────────────────────────

def resolve_dispute(
    db: Session,
    *,
    dispute_id: str,
    actor_id: str,
    resolution_type: str,
    freelancer_percentage: float = 100.0,
    notes: Optional[str] = None,
) -> Dispute:
    """
    Admin giải quyết dispute. Atomic: state + milestone + wallet + transaction + audit
    cùng commit. Nếu bất kỳ bước nào fail → rollback toàn bộ.

    Caller phải verify actor là admin (router).
    """
    try:
        dispute = get_dispute_by_id(db, dispute_id)
        if not dispute:
            raise ValueError(f"Dispute {dispute_id} không tồn tại")

        # State machine guard
        try:
            rt_enum = DisputeResolutionType(resolution_type)
        except ValueError:
            raise ValueError(
                f"resolution_type không hợp lệ: {resolution_type}. "
                f"Cho phép: {[r.value for r in DisputeResolutionType]}"
            )

        target_status_map = {
            DisputeResolutionType.FREELANCER: DisputeStatus.RESOLVED_FREELANCER,
            DisputeResolutionType.CLIENT: DisputeStatus.RESOLVED_CLIENT,
            DisputeResolutionType.SPLIT: DisputeStatus.MUTUAL_AGREEMENT,
        }
        target_status = target_status_map[rt_enum]
        _assert_transition(dispute.status, target_status)

        # Validate split params
        if rt_enum == DisputeResolutionType.SPLIT:
            if not (0.0 <= freelancer_percentage <= 100.0):
                raise ValueError(
                    f"freelancer_percentage phải trong [0, 100], nhận: {freelancer_percentage}"
                )

        prior_state = {"status": dispute.status.value}

        # Defensive: contract + milestone tồn tại
        contract = db.query(Contract).filter(Contract.id == dispute.contract_id).first()
        if not contract:
            raise ValueError(f"Contract {dispute.contract_id} không tồn tại (data drift)")

        milestone = None
        if dispute.milestone_id:
            milestone = db.query(Milestone).filter(Milestone.id == dispute.milestone_id).first()
            if not milestone:
                raise ValueError(f"Milestone {dispute.milestone_id} không tồn tại (data drift)")

        # Execute finance logic theo resolution_type
        # QUAN TRỌNG: query wallet theo org.owner_user_id (KHÔNG phải org.id — Wallet FK users.id)
        org = db.query(Organization).filter(Organization.id == contract.organization_id).first()
        if not org:
            raise ValueError(f"Organization {contract.organization_id} không tồn tại (data drift)")

        if milestone:
            if rt_enum == DisputeResolutionType.FREELANCER:
                _release_to_freelancer(db, contract.freelancer_id, org.owner_user_id, milestone)
                milestone.status = MilestoneStatus.paid
                milestone.paid_at = datetime.now(timezone.utc)
            elif rt_enum == DisputeResolutionType.CLIENT:
                _refund_to_client(db, org.owner_user_id, milestone)
                # Refund → milestone cancelled, không paid
                milestone.status = MilestoneStatus.cancelled
            else:  # SPLIT
                _split_payment(
                    db, contract.freelancer_id, org.owner_user_id,
                    milestone, freelancer_percentage,
                )
                milestone.status = MilestoneStatus.paid
                milestone.paid_at = datetime.now(timezone.utc)

        # Update dispute state
        dispute.status = target_status
        dispute.resolution_notes = notes
        dispute.resolution_json = {
            "resolution_type": rt_enum.value,
            "freelancer_percentage": freelancer_percentage if rt_enum == DisputeResolutionType.SPLIT else None,
            "milestone_id": dispute.milestone_id,
        }
        dispute.resolved_at = datetime.now(timezone.utc)
        dispute.assigned_to = actor_id  # admin who resolved

        # Contract: nếu có milestone resolved → COMPLETED, không thì về ACTIVE
        if milestone and rt_enum == DisputeResolutionType.CLIENT:
            contract.status = ContractStatus.active
        elif milestone and rt_enum in (
            DisputeResolutionType.FREELANCER, DisputeResolutionType.SPLIT
        ):
            # Check tất cả milestones paid → COMPLETED
            all_milestones = db.query(Milestone).filter(Milestone.contract_id == contract.id).all()
            if all(m.status == MilestoneStatus.paid for m in all_milestones):
                contract.status = ContractStatus.completed
                contract.completed_at = datetime.now(timezone.utc)
            else:
                contract.status = ContractStatus.active
        else:
            contract.status = ContractStatus.active

        # Audit log
        _write_audit(
            db,
            actor_id=actor_id,
            actor_role="admin",
            entity_type="dispute",
            entity_id=dispute.id,
            action=AuditActionEnum.DISPUTE_RESOLVED,
            prior_state=prior_state,
            new_state={
                "status": target_status.value,
                "resolution_type": rt_enum.value,
                "freelancer_percentage": freelancer_percentage if rt_enum == DisputeResolutionType.SPLIT else None,
                "contract_status": contract.status.value,
            },
            reason_code=rt_enum.value,
            notes=notes,
        )

        db.commit()
        db.refresh(dispute)
        logger.info(
            f"Admin {actor_id} resolve dispute {dispute.id} → {target_status.value} "
            f"({rt_enum.value}, split={freelancer_percentage}%)"
        )
        return dispute

    except Exception as e:
        db.rollback()
        logger.exception(f"Error resolving dispute: {e}")
        raise


def close_dispute(
    db: Session,
    *,
    dispute_id: str,
    actor_id: str,
    notes: Optional[str] = None,
) -> Dispute:
    """Admin đóng dispute đã resolved (cleanup)."""
    try:
        dispute = get_dispute_by_id(db, dispute_id)
        if not dispute:
            raise ValueError(f"Dispute {dispute_id} không tồn tại")

        prior_state = {"status": dispute.status.value}
        _assert_transition(dispute.status, DisputeStatus.CLOSED)

        dispute.status = DisputeStatus.CLOSED
        dispute.closed_at = datetime.now(timezone.utc)
        if notes:
            dispute.resolution_notes = (dispute.resolution_notes or "") + f"\n[CLOSE] {notes}"

        _write_audit(
            db,
            actor_id=actor_id,
            actor_role="admin",
            entity_type="dispute",
            entity_id=dispute.id,
            action=AuditActionEnum.DISPUTE_CLOSED,
            prior_state=prior_state,
            new_state={"status": DisputeStatus.CLOSED.value},
            notes=notes,
        )

        db.commit()
        db.refresh(dispute)
        logger.info(f"Admin {actor_id} close dispute {dispute.id}")
        return dispute

    except Exception as e:
        db.rollback()
        logger.exception(f"Error closing dispute: {e}")
        raise


def assign_dispute(
    db: Session,
    *,
    dispute_id: str,
    actor_id: str,
    moderator_id: str,
) -> Dispute:
    """Admin assign moderator cho dispute (optional)."""
    try:
        dispute = get_dispute_by_id(db, dispute_id)
        if not dispute:
            raise ValueError(f"Dispute {dispute_id} không tồn tại")

        moderator = db.query(User).filter(User.id == moderator_id).first()
        if not moderator:
            raise ValueError(f"Moderator {moderator_id} không tồn tại")

        prior_state = {"assigned_to": dispute.assigned_to}
        dispute.assigned_to = moderator_id
        dispute.assigned_at = datetime.now(timezone.utc)

        _write_audit(
            db,
            actor_id=actor_id,
            actor_role="admin",
            entity_type="dispute",
            entity_id=dispute.id,
            action=AuditActionEnum.DISPUTE_ASSIGNED,
            prior_state=prior_state,
            new_state={"assigned_to": moderator_id, "moderator_email": moderator.email},
        )

        db.commit()
        db.refresh(dispute)
        logger.info(f"Admin {actor_id} assign dispute {dispute.id} → {moderator_id}")
        return dispute

    except Exception as e:
        db.rollback()
        logger.exception(f"Error assigning dispute: {e}")
        raise


# ────────────────────────────────────────────────────────────────
# Finance helpers (private)
# ────────────────────────────────────────────────────────────────

def _release_to_freelancer(db: Session, freelancer_user_id: str, org_owner_user_id: str, milestone: Milestone):
    """Move escrowed money → freelancer wallet. Atomic via DB session."""
    freelancer_wallet = (
        db.query(Wallet).filter(Wallet.user_id == freelancer_user_id).with_for_update().first()
    )
    org_wallet = (
        db.query(Wallet).filter(Wallet.user_id == org_owner_user_id).with_for_update().first()
    )

    if not freelancer_wallet:
        raise ValueError(f"Freelancer {freelancer_user_id} chưa có wallet — không thể giải ngân")
    if not org_wallet:
        raise ValueError(f"Org owner {org_owner_user_id} chưa có wallet — không thể giải ngân")

    if org_wallet.locked_balance < milestone.amount:
        raise ValueError(
            f"Org locked_balance ({org_wallet.locked_balance}) < milestone.amount ({milestone.amount}). "
            f"Data drift hoặc escrow chưa được lock."
        )

    freelancer_wallet.balance += milestone.amount
    db.add(Transaction(
        wallet_id=freelancer_wallet.id,
        amount=milestone.amount,
        transaction_type=TransactionType.PAYMENT_RECEIVED,
        reference_id=milestone.id,
        status=TransactionStatus.COMPLETED,
    ))

    org_wallet.locked_balance -= milestone.amount
    db.add(Transaction(
        wallet_id=org_wallet.id,
        amount=milestone.amount,
        transaction_type=TransactionType.ESCROW_RELEASE,
        reference_id=milestone.id,
        status=TransactionStatus.COMPLETED,
    ))


def _refund_to_client(db: Session, org_owner_user_id: str, milestone: Milestone):
    """Refund escrowed money → org owner wallet. Atomic."""
    org_wallet = (
        db.query(Wallet).filter(Wallet.user_id == org_owner_user_id).with_for_update().first()
    )
    if not org_wallet:
        raise ValueError(f"Org owner {org_owner_user_id} chưa có wallet — không thể refund")

    if org_wallet.locked_balance < milestone.amount:
        raise ValueError(
            f"Org locked_balance ({org_wallet.locked_balance}) < milestone.amount ({milestone.amount})"
        )

    # Refund: balance giữ nguyên (đã trừ lúc escrow lock), trả về locked_balance
    org_wallet.locked_balance -= milestone.amount
    db.add(Transaction(
        wallet_id=org_wallet.id,
        amount=milestone.amount,
        transaction_type=TransactionType.ESCROW_RELEASE,
        reference_id=milestone.id,
        status=TransactionStatus.COMPLETED,
    ))


def _split_payment(
    db: Session,
    freelancer_user_id: str,
    org_owner_user_id: str,
    milestone: Milestone,
    freelancer_pct: float,
):
    """Chia tiền theo tỷ lệ freelancer_pct%. Phần còn lại refund cho org."""
    freelancer_amount = round(milestone.amount * (freelancer_pct / 100.0), 2)
    client_amount = round(milestone.amount - freelancer_amount, 2)

    freelancer_wallet = (
        db.query(Wallet).filter(Wallet.user_id == freelancer_user_id).with_for_update().first()
    )
    org_wallet = (
        db.query(Wallet).filter(Wallet.user_id == org_owner_user_id).with_for_update().first()
    )
    if not freelancer_wallet or not org_wallet:
        raise ValueError("Wallet không tồn tại — không thể split payment")
    if org_wallet.locked_balance < milestone.amount:
        raise ValueError(
            f"Org locked_balance ({org_wallet.locked_balance}) < milestone.amount ({milestone.amount})"
        )

    if freelancer_amount > 0:
        freelancer_wallet.balance += freelancer_amount
        db.add(Transaction(
            wallet_id=freelancer_wallet.id,
            amount=freelancer_amount,
            transaction_type=TransactionType.PAYMENT_RECEIVED,
            reference_id=milestone.id,
            status=TransactionStatus.COMPLETED,
        ))

    org_wallet.locked_balance -= milestone.amount
    if client_amount > 0:
        db.add(Transaction(
            wallet_id=org_wallet.id,
            amount=client_amount,
            transaction_type=TransactionType.ESCROW_RELEASE,
            reference_id=milestone.id,
            status=TransactionStatus.COMPLETED,
        ))

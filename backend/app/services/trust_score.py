"""
Trust Score Calculator Service.
Tính toán Trust Score (0-100) từ danh sách TrustPassportEntry đã verified.
Theo MASTER-DOC Phần M.5: "Trust score must be explainable and derived from versioned rules."
"""
from datetime import datetime, timezone


# Versioned scoring weights — thay đổi theo product policy cần bump version
TRUST_SCORE_VERSION = "1.0"
TRUST_SCORE_RULES = {
    "version": TRUST_SCORE_VERSION,
    "base_score": 20,
    "weights": {
        "personalInfo.fullName": 10,
        "personalInfo.phone": 10,
        "personalInfo.email": 10,
        "personalInfo.address": 10,
        "education": 15,
        "workExperience": 15,
        "skills": 10,
        "tools": 5,
        "projects": 5,
    },
    "max_score": 100,
}


def is_badge_expired(expires_at: datetime) -> bool:
    """Kiểm tra badge đã hết hạn chưa."""
    if expires_at is None:
        return False
    return datetime.now(timezone.utc) > expires_at.replace(tzinfo=timezone.utc)


def calculate_trust_score(
    entries: List,
    include_expired: bool = False
) -> dict:
    """
    Tính Trust Score từ danh sách bản ghi TrustPassportEntry.

    Args:
        entries: List of TrustPassportEntry ORM objects
        include_expired: Nếu False, loại badges đã hết hạn (theo Phần L.1.4)

    Returns:
        dict với keys: score, totalBadges, activeBadges, expiredBadges, version, rules
    """
    base = TRUST_SCORE_RULES["base_score"]
    weights = TRUST_SCORE_RULES["weights"]
    max_score = TRUST_SCORE_RULES["max_score"]

    active_score = 0
    expired_score = 0
    expired_count = 0
    active_count = 0

    for entry in entries:
        field_path = entry.field_path
        expires_at = getattr(entry, 'expires_at', None)

        if is_badge_expired(expires_at):
            expired_count += 1
            expired_score += weights.get(field_path, 10)
        else:
            active_count += 1
            active_score += weights.get(field_path, 10)

    if include_expired:
        total = base + active_score + expired_score
    else:
        total = base + active_score

    return {
        "score": min(max_score, total),
        "totalBadges": len(entries),
        "activeBadges": active_count,
        "expiredBadges": expired_count,
        "activeScore": min(max_score, base + active_score),
        "version": TRUST_SCORE_VERSION,
        "rules": TRUST_SCORE_RULES,
    }

from pydantic import BaseModel, Field
from typing import List, Optional, Any
from datetime import datetime
from app.models.verifications import (
    EvidenceTypeEnum,
    EvidenceStatusEnum,
    VerificationCaseStatusEnum,
    VerificationDecisionActionEnum
)

# ==============================================================================
# FREELANCER EVIDENCE SCHEMAS
# ==============================================================================

class CVEvidenceResponse(BaseModel):
    id: str
    cv_document_id: str = Field(..., alias="cvDocumentId")
    freelancer_id: str = Field(..., alias="freelancerId")
    title: str
    evidence_type: EvidenceTypeEnum = Field(..., alias="evidenceType")
    original_filename: str = Field(..., alias="originalFilename")
    mime_type: str = Field(..., alias="mimeType")
    size_bytes: int = Field(..., alias="sizeBytes")
    status: EvidenceStatusEnum
    created_at: datetime = Field(..., alias="createdAt")

    class Config:
        from_attributes = True
        populate_by_name = True


class SubmitVerificationRequest(BaseModel):
    evidenceIds: Optional[List[str]] = Field(default_factory=list, description="Danh sách ID của các minh chứng đính kèm")
    notes: Optional[str] = Field(None, description="Ghi chú bổ sung từ Freelancer gửi Admin")


class SubmitVerificationResponse(BaseModel):
    caseId: str
    documentId: str
    status: VerificationCaseStatusEnum
    submittedAt: datetime
    message: str


# ==============================================================================
# TRUST PASSPORT SCHEMAS
# ==============================================================================

class TrustPassportBadgeDetail(BaseModel):
    id: str
    field_path: str = Field(..., alias="fieldPath")
    value_json: Any = Field(..., alias="value")
    badge_name: str = Field(..., alias="badgeName")
    verified_at: datetime = Field(..., alias="verifiedAt")

    class Config:
        from_attributes = True
        populate_by_name = True


class TrustPassportResponse(BaseModel):
    freelancerId: str
    trustScore: int = Field(..., description="Tổng điểm uy tín (0 - 100)")
    totalVerifiedBadges: int
    badges: List[TrustPassportBadgeDetail]


# ==============================================================================
# ADMIN VERIFICATION SCHEMAS (DUYỆT 3 CỘT)
# ==============================================================================

class VerificationCaseSummaryItem(BaseModel):
    caseId: str
    documentId: str
    freelancerId: str
    freelancerName: str
    freelancerEmail: str
    cvFilename: str
    status: VerificationCaseStatusEnum
    submittedAt: datetime
    evidencesCount: int


class VerificationCaseListResponse(BaseModel):
    total: int
    items: List[VerificationCaseSummaryItem]


class Verification3ColumnDetail(BaseModel):
    fieldPath: str
    aiExtractedValue: Any = None
    aiConfidence: Optional[float] = None
    userConfirmedValue: Any = None
    evidenceLevel: str
    isUserEdited: bool = False
    requiresUserReview: bool = False


class VerificationCaseDetailResponse(BaseModel):
    caseId: str
    documentId: str
    freelancerId: str
    freelancerName: str
    freelancerEmail: str
    cvFilename: str
    status: VerificationCaseStatusEnum
    submittedAt: datetime
    notes: Optional[str] = None
    evidences: List[CVEvidenceResponse]
    threeColumnData: List[Verification3ColumnDetail]


class VerificationDecisionRequest(BaseModel):
    action: VerificationDecisionActionEnum = Field(..., description="Hành động: VERIFY, PARTIALLY_VERIFY, REQUEST_MORE_INFO, REJECT")
    reason: Optional[str] = Field(None, description="Lý do hoặc ghi chú của Admin")
    verifiedFieldPaths: Optional[List[str]] = Field(default_factory=list, description="Danh sách các field_path được duyệt nếu chọn PARTIALLY_VERIFY hoặc VERIFY")


class VerificationDecisionResponse(BaseModel):
    caseId: str
    documentId: str
    action: VerificationDecisionActionEnum
    newStatus: VerificationCaseStatusEnum
    reviewedAt: datetime
    message: str


class ResubmitVerificationResponse(BaseModel):
    caseId: str
    documentId: str
    status: VerificationCaseStatusEnum
    resubmittedAt: datetime


# Rebuild all models to resolve forward references at import time
TrustPassportResponse.model_rebuild()
TrustPassportBadgeDetail.model_rebuild()
VerificationDecisionResponse.model_rebuild()
VerificationCaseDetailResponse.model_rebuild()

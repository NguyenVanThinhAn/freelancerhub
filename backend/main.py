import time
from dotenv import load_dotenv
load_dotenv()

from app.schemas.default import BaseResponse
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine
# Import toàn bộ các Model để SQLAlchemy Metadata ghi nhận danh sách các bảng
import app.models.users
import app.models.organizations
import app.models.skills
import app.models.freelancer_skills
import app.models.freelancers
import app.models.refresh_tokens
import app.models.password_reset_tokens
import app.models.chat_threads
import app.models.chat_messages
import app.models.thread_participants
import app.models.notifications
import app.models.ai_usage_quotas
import app.models.portfolio_items
import app.models.email_verification_tokens
import app.models.cv_documents
import app.models.cv_results
import app.models.verifications
import app.models.categories
import app.models.jobs
import app.models.proposals
import app.models.contracts
import app.models.finance
import app.models.disputes
import app.models.shortlists
import app.models.interviews
import app.models.tasks
import app.models.contact_info_exchanges

from app.routers import users, auth, profiles, communications, admin_system, email_verification, cv_router, admin_cv_router, jobs_router, proposals_router, contracts_router, finance_router, disputes_router, shortlists_router
from app.routers.admin_contact_monitor import router as admin_contact_router
from app.routers.interviews import router as interviews_router
from app.routers.tasks import router as tasks_router
from app.core.logger import logger
from datetime import datetime

# -----------------------------------------------------------------------------
# KHỞI TẠO TỰ ĐỘNG CÁC BẢNG CSDL (DATABASE TABLES INITIALIZATION)
# -----------------------------------------------------------------------------
try:
    Base.metadata.create_all(bind=engine)
    logger.info("Khởi tạo tự động Metadata các bảng CSDL (create_all) thành công!")
except Exception as e:
    logger.error(f"Lỗi khi khởi tạo Metadata bảng CSDL: {str(e)}")

# Khởi tạo ứng dụng FastAPI
app = FastAPI(
    title="FreelancerHub AI API",
    description="Backend API hệ thống sàn giao dịch FreelancerHub AI",
    version="1.0.0"
)

# -----------------------------------------------------------------------------
# GLOBAL EXCEPTION HANDLERS (BỘ XỬ LÝ LỖI TOÀN CỤC CHUẨN BASERESPONSE)
# -----------------------------------------------------------------------------
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    logger.error(f"HTTP Exception [{exc.status_code}]: {exc.detail} | Path: {request.url.path}")
    response_body = BaseResponse.create(
        status_code=exc.status_code,
        message=str(exc.detail),
        data=None,
        error={"detail": exc.detail},
        timestamp=datetime.now().isoformat(),
        path=request.url.path
    )
    # BaseResponse.create returns a Pydantic instance; JSONResponse needs a dict.
    return JSONResponse(status_code=exc.status_code, content=response_body.model_dump(mode="json"))


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"UNHANDLED SYSTEM EXCEPTION (500): {str(exc)} | Path: {request.url.path}", exc_info=True)
    response_body = BaseResponse.create(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        message="Lỗi hệ thống nội bộ (Internal Server Error). Vui lòng thử lại sau.",
        data=None,
        error={"detail": str(exc)},
        timestamp=datetime.now().isoformat(),
        path=request.url.path
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=response_body.model_dump(mode="json")
    )

# -----------------------------------------------------------------------------
# 1. CẤU HÌNH GHI NHẬT KÝ (LOGGING MIDDLEWARE)
# -----------------------------------------------------------------------------
@app.middleware("http")
async def log_requests_middleware(request: Request, call_next):
    start_time = time.time()
    client_ip = request.client.host if request.client else "unknown"
    method = request.method
    path = request.url.path
    
    logger.info(f"INCOMING REQUEST: [{method}] {path} | Client IP: {client_ip}")
    try:
        response = await call_next(request)
        process_time = (time.time() - start_time) * 1000
        logger.info(f"COMPLETED REQUEST: [{method}] {path} | Status: {response.status_code} | Time: {process_time:.2f}ms")
        return response
    except Exception as e:
        process_time = (time.time() - start_time) * 1000
        logger.error(f"FAILED REQUEST: [{method}] {path} | Error: {str(e)} | Time: {process_time:.2f}ms")
        raise e

# -----------------------------------------------------------------------------
# 2. CẤU HÌNH BẢO MẬT KẾT NỐI GIỮA FRONTEND VÀ BACKEND (CORS MIDDLEWARE)
# -----------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------------------------------------------
# 3. ĐĂNG KÝ CÁC ROUTER API
# -----------------------------------------------------------------------------
app.include_router(users, prefix="/api/v1", tags=["Users & Authentication"])
app.include_router(auth, prefix="/api/v1", tags=["Authentication"])
app.include_router(profiles, prefix="/api/v1", tags=["Profiles"])
app.include_router(communications, prefix="/api/v1", tags=["Communications"])
app.include_router(email_verification, prefix="/api/v1", tags=["Email Verification"])
app.include_router(admin_system, prefix="/api/v1", tags=["Admin & Quotas"])
app.include_router(cv_router, prefix="/api/v1", tags=["CV Intelligence"])
app.include_router(admin_cv_router, prefix="/api/v1", tags=["Admin Verification & Trust Passport"])
app.include_router(jobs_router, prefix="/api/v1", tags=["Jobs & Marketplace"])
app.include_router(proposals_router, prefix="/api/v1", tags=["Proposals"])
app.include_router(contracts_router, prefix="/api/v1", tags=["Contracts & Milestones"])
app.include_router(finance_router, prefix="/api/v1", tags=["Finance & Wallet"])
app.include_router(disputes_router, prefix="/api/v1", tags=["Disputes"])
app.include_router(shortlists_router, prefix="/api/v1", tags=["Shortlists"])
app.include_router(interviews_router, prefix="/api/v1", tags=["Interviews"])
app.include_router(tasks_router, prefix="/api/v1", tags=["Tasks"])
app.include_router(admin_contact_router, prefix="/api/v1", tags=["Admin Contact Monitor"])


@app.get("/")
def root():
    logger.info("Người dùng truy cập trang chủ Backend Root API")
    return {"message": "FreelancerHub AI Backend API đang hoạt động!"}

import time
from sqlalchemy.orm import Session
from app.models.cv_documents import (
    CVDocument, 
    CVParseTask, 
    DocumentStatusEnum, 
    TaskStatusEnum
)
from app.models.cv_results import (
    CVParseResult, 
    CVExtractedField, 
    FieldEvidenceLevelEnum
)
from app.services.cv_engine.classifier import classify_document
from app.services.cv_engine.extractor import extract_text_by_page
from app.services.cv_engine.normalizer import normalize_cv_text
from app.core.logger import logger


def process_cv_parsing_pipeline(task_id: str, db_session_factory):
    """
    Worker chính xử lý luồng AI Parsing Pipeline cho CV:
    1. Lấy thông tin Document & Task từ CSDL.
    2. Gọi Classifier phân loại PDF_TEXT / PDF_SCAN.
    3. Gọi Extractor trích xuất chữ thô từng trang.
    4. Gọi Normalizer (Groq LLM / Smart Fallback) chuẩn hóa dữ liệu ra JSON.
    5. Ghi nhận thông tin tổng hợp vào cv_parse_results và từng trường chi tiết vào cv_extracted_fields.
    6. Cập nhật trạng thái Document thành NEEDS_USER_REVIEW và Task thành SUCCEEDED.
    """
    db: Session = db_session_factory()
    try:
        task = db.query(CVParseTask).filter(CVParseTask.id == task_id).first()
        if not task:
            logger.error(f"Task ID {task_id} không tồn tại trong CSDL.")
            return

        doc = db.query(CVDocument).filter(CVDocument.id == task.cv_document_id).first()
        if not doc:
            logger.error(f"CVDocument ID {task.cv_document_id} không tồn tại.")
            task.status = TaskStatusEnum.FAILED
            task.error_message = "Không tìm thấy file tài liệu CV trong CSDL"
            db.commit()
            return

        # ----------------------------------------------------------------------
        # Bước 1: Khởi chạy Task (15%)
        # ----------------------------------------------------------------------
        task.status = TaskStatusEnum.RUNNING
        task.progress_percent = 15
        task.current_step = "CLASSIFYING_DOCUMENT"
        db.commit()

        doc_type = classify_document(doc.storage_key, doc.mime_type)
        doc.document_type = doc_type
        db.commit()
        logger.info(f"[Task {task_id}] Đã phân loại tài liệu thành: {doc_type.value}")

        # ----------------------------------------------------------------------
        # Bước 2: Trích xuất chữ từng trang (50%)
        # ----------------------------------------------------------------------
        task.progress_percent = 50
        task.current_step = "EXTRACTING_TEXT"
        db.commit()

        pages_data, total_pages = extract_text_by_page(doc.storage_key, doc_type)
        doc.page_count = total_pages
        db.commit()
        logger.info(f"[Task {task_id}] Trích xuất thành công {total_pages} trang text.")

        # ----------------------------------------------------------------------
        # Bước 3: AI Normalization (85%)
        # ----------------------------------------------------------------------
        task.progress_percent = 85
        task.current_step = "AI_NORMALIZATION"
        db.commit()

        normalized_res = normalize_cv_text(pages_data)
        logger.info(f"[Task {task_id}] AI Normalization hoàn tất. Điểm tự tin: {normalized_res.get('overall_confidence')}")

        # ----------------------------------------------------------------------
        # Bước 4: Lưu kết quả vào Database (95%)
        # ----------------------------------------------------------------------
        task.progress_percent = 95
        task.current_step = "SAVING_PARSED_RESULTS"
        db.commit()

        # 4.1. Tạo bản ghi tổng hợp cv_parse_results (Xóa bản ghi cũ nếu có)
        existing_result = db.query(CVParseResult).filter(CVParseResult.cv_document_id == doc.id).first()
        if existing_result:
            db.delete(existing_result)
            db.commit()

        parse_result = CVParseResult(
            cv_document_id=doc.id,
            schema_version="1.0",
            overall_confidence=normalized_res.get("overall_confidence", 0.9),
            completeness_percent=normalized_res.get("completeness_percent", 80),
            missing_fields=normalized_res.get("missing_fields", []),
            conflicts=normalized_res.get("conflicts", []),
            raw_text_storage_key=doc.storage_key
        )
        db.add(parse_result)
        db.commit()
        db.refresh(parse_result)

        # 4.2. Ghi từng trường chi tiết vào cv_extracted_fields
        for field in normalized_res.get("extracted_fields", []):
            ext_field = CVExtractedField(
                cv_parse_result_id=parse_result.id,
                field_path=field["field_path"],
                value_json=field["value_json"],
                confidence=field.get("confidence", 0.9),
                source_page=field.get("source_page", 1),
                source_text=str(field.get("source_text", ""))[:1000],
                evidence_level=FieldEvidenceLevelEnum.AI_EXTRACTED
            )
            db.add(ext_field)

        # ----------------------------------------------------------------------
        # Bước 5: Hoàn tất Task (100%)
        # ----------------------------------------------------------------------
        task.progress_percent = 100
        task.status = TaskStatusEnum.SUCCEEDED
        task.current_step = "COMPLETED"
        
        # Chuyển trạng thái CV Document thành NEEDS_USER_REVIEW
        doc.status = DocumentStatusEnum.NEEDS_USER_REVIEW
        db.commit()

        logger.info(f"[Task {task_id}] Hoàn thành toàn bộ AI Parsing Pipeline cho Document {doc.id}!")

    except Exception as e:
        db.rollback()
        logger.error(f"[Task {task_id}] Lỗi trong tiến trình AI Parsing Pipeline: {str(e)}")
        if task:
            task.status = TaskStatusEnum.FAILED
            task.error_message = str(e)
            db.commit()
        if doc:
            doc.status = DocumentStatusEnum.PARSING_FAILED
            db.commit()
    finally:
        db.close()


# Alias để tương thích với router cũ
simulate_background_parsing = process_cv_parsing_pipeline

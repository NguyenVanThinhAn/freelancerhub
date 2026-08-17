import pypdf
from app.models.cv_documents import DocumentTypeEnum
from app.core.logger import logger

def classify_document(file_path: str, mime_type: str) -> DocumentTypeEnum:
    """
    Phân loại định dạng tài liệu CV:
    - DOCX -> DocumentTypeEnum.DOCX
    - IMAGE (PNG/JPG) -> DocumentTypeEnum.IMAGE
    - PDF: Dùng pypdf đếm lượng text trích xuất được.
      - Nếu trung bình > 30 ký tự/trang -> PDF_TEXT (PDF chữ bôi đen được).
      - Nếu < 30 ký tự/trang -> PDF_SCAN (PDF dạng ảnh scan).
    """
    if mime_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        return DocumentTypeEnum.DOCX

    if mime_type in ["image/png", "image/jpeg"]:
        return DocumentTypeEnum.IMAGE

    if mime_type == "application/pdf":
        try:
            reader = pypdf.PdfReader(file_path)
            total_pages = len(reader.pages)
            if total_pages == 0:
                return DocumentTypeEnum.PDF_SCAN

            total_text_length = 0
            for page in reader.pages:
                text = page.extract_text() or ""
                total_text_length += len(text.strip())

            avg_length = total_text_length / total_pages
            logger.info(f"Classifying PDF: Total pages={total_pages}, Avg text length={avg_length:.1f}")

            if avg_length > 30:
                return DocumentTypeEnum.PDF_TEXT
            else:
                return DocumentTypeEnum.PDF_SCAN
        except Exception as e:
            logger.error(f"Lỗi khi phân loại file PDF '{file_path}': {str(e)}")
            return DocumentTypeEnum.PDF_SCAN

    return DocumentTypeEnum.PDF_TEXT

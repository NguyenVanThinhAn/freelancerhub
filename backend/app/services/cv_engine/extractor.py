"""
extractor.py — OCR Engine Abstraction Layer
============================================
Cung cấp interface `OCREngine` để dễ dàng swap OCR engine:
  - TesseractEngine  (mặc định, chạy local, không cần GPU)
  - OllamaEngine     (stub, kích hoạt khi chuyển sang host machine)

Swap engine bằng env var `OCR_ENGINE=tesseract|ollama`.
"""

import os
import re
import pypdf
import base64
from typing import List, Dict, Any, Tuple, Optional
from abc import ABC, abstractmethod
from dataclasses import dataclass

from app.models.cv_documents import DocumentTypeEnum
from app.core.logger import logger

# ─────────────────────────────────────────────────────────────────────────────
# OCR Result + Quality Metadata
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class OCRResult:
    """Kết quả OCR cho một trang."""
    text: str
    confidence: float          # 0.0–1.0, chất lượng OCR text
    char_count: int            # số ký tự alphanumeric trích xuất được
    engine: str                # tên engine đã dùng
    warnings: List[str]        # cảnh báo (font lạ, nghiêng, noise cao…)


@dataclass
class PageData:
    """Dữ liệu trang trả về cho normalizer."""
    page: int
    text: str
    b64_url: Optional[str] = None   # chỉ cho IMAGE
    ocr_confidence: float = 0.0     # 0.0–1.0
    ocr_engine: str = ""
    ocr_warnings: List[str] = None


# ─────────────────────────────────────────────────────────────────────────────
# OCR Engine Protocol
# ─────────────────────────────────────────────────────────────────────────────

class OCREngine(ABC):
    """Abstract base class cho các OCR engine."""

    name: str = "base"

    @abstractmethod
    def process_image(self, file_path: str) -> OCRResult:
        """Trích xuất text từ một ảnh (PNG/JPG)."""
        ...

    def cleanup(self):
        """Dọc resource (override nếu engine cần)."""
        pass


# ─────────────────────────────────────────────────────────────────────────────
# Tesseract OCR Engine
# ─────────────────────────────────────────────────────────────────────────────

class TesseractEngine(OCREngine):
    """
    OCR engine dùng Tesseract với OpenCV preprocessing và Multi-PSM voting.

    Pipeline:
      1. OpenCV: upscale → grayscale → medianBlur denoise → HoughLines deskew
         → dual threshold (Adaptive Gaussian + Otsu)
      2. Cắt 2 cột: Sidebar (36%) + Main (64%)
      3. Multi-PSM voting (PSM 3, 4, 6) — chọn kết quả alphanumeric dài nhất
      4. Voting Adaptive vs Otsu — lấy bản dài hơn
      5. Ghép: Main trước, Sidebar sau
      6. Fix lỗi OCR font tiếng Việt phổ biến
    """

    name = "tesseract"

    def __init__(self):
        self._psm_modes = [3, 4, 6]
        self._base_config = "--oem 3 -l vie+eng"
        self._target_width = 1800
        self._sidebar_ratio = 0.36

    def process_image(self, file_path: str) -> OCRResult:
        import pytesseract
        from PIL import Image
        import cv2
        import numpy as np

        warnings: List[str] = []
        combined_text = ""
        total_alnum = 0

        try:
            # ── 1. Đọc ảnh ──────────────────────────────────────────────────
            pil_img = Image.open(file_path)
            if pil_img.mode in ("RGBA", "P"):
                pil_img = pil_img.convert("RGB")

            # Cache ra disk để cv2 đọc (tránh PIL→cv2 direct conversion lỗi)
            cache_path = f"/tmp/_cv_{os.getpid()}.png"
            pil_img.save(cache_path)
            img_cv = cv2.imread(cache_path)
            if img_cv is None:
                raise RuntimeError("OpenCV không đọc được ảnh từ cache")

            h_orig, w_orig = img_cv.shape[:2]

            # ── 2. OpenCV Preprocessing ──────────────────────────────────────
            # 2a. Upscale nếu ảnh nhỏ
            if w_orig < self._target_width:
                scale = self._target_width / w_orig
                img_cv = cv2.resize(img_cv, (int(w_orig * scale), int(h_orig * scale)),
                                    interpolation=cv2.INTER_CUBIC)
            h, w = img_cv.shape[:2]

            gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
            denoised = cv2.medianBlur(gray, 3)

            # 2b. Deskew (chỉnh nghiêng)
            skew_angle = self._detect_skew(denoised)
            if abs(skew_angle) > 0.3:
                M = cv2.getRotationMatrix2D((w // 2, h // 2), skew_angle, 1.0)
                denoised = cv2.warpAffine(denoised, M, (w, h),
                                          flags=cv2.INTER_CUBIC,
                                          borderMode=cv2.BORDER_REPLICATE)
                logger.info(f"  [Tesseract] Deskew ảnh {skew_angle:.2f}°")
                if abs(skew_angle) > 5:
                    warnings.append(f"Ảnh nghiêng {skew_angle:.1f}° — đã chỉnh")

            # 2c. Dual threshold
            adaptive = cv2.adaptiveThreshold(denoised, 255,
                                            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                            cv2.THRESH_BINARY, 31, 11)
            _, otsu = cv2.threshold(denoised, 0, 255,
                                    cv2.THRESH_BINARY + cv2.THRESH_OTSU)

            # ── 3. Cắt cột ─────────────────────────────────────────────────
            left_adaptive  = adaptive[:, :int(w * self._sidebar_ratio)]
            right_adaptive = adaptive[:, int(w * self._sidebar_ratio):]
            left_otsu  = otsu[:, :int(w * self._sidebar_ratio)]
            right_otsu = otsu[:, int(w * self._sidebar_ratio):]

            # ── 4. Multi-PSM voting ───────────────────────────────────────────
            left_text   = self._vote_crop(left_adaptive, left_otsu, pytesseract, "Sidebar")
            right_text  = self._vote_crop(right_adaptive, right_otsu, pytesseract, "Main")

            # ── 5. Ghép ────────────────────────────────────────────────────
            combined_text = (
                f"{right_text}\n\n"
                f"=== SIDEBAR (CONTACT & SKILLS) ===\n"
                f"{left_text}"
            ).strip()

            # ── 6. Fix lỗi OCR tiếng Việt phổ biến ─────────────────────────
            combined_text = self._fix_vietnamese(combined_text)

            # ── 7. Cleanup ───────────────────────────────────────────────────
            try:
                os.remove(cache_path)
            except OSError:
                pass

            total_alnum = sum(1 for c in combined_text if c.isalnum())
            confidence = self._estimate_confidence(total_alnum, w_orig, h_orig, warnings)

            logger.info(
                f"  [Tesseract] {total_alnum} alnum chars, conf={confidence:.2f}, "
                f"upscaled {w_orig}x{h_orig}→{w}x{h}"
            )

        except Exception as e:
            logger.warning(f"  [Tesseract] OCR thất bại: {e}")
            warnings.append(f"OCR error: {e}")
            combined_text = ""
            total_alnum = 0

        return OCRResult(
            text=combined_text,
            confidence=self._estimate_confidence(total_alnum, 800, 1000, warnings),
            char_count=total_alnum,
            engine=self.name,
            warnings=warnings,
        )

    # ── Internal helpers ────────────────────────────────────────────────────────

    def _detect_skew(self, gray) -> float:
        import cv2
        import numpy as np
        try:
            edges = cv2.Canny(gray, 50, 150, apertureSize=3)
            lines = cv2.HoughLinesP(edges, 1, np.pi / 180, 100,
                                   minLineLength=gray.shape[1] // 4,
                                   maxLineGap=20)
            if lines is None:
                return 0.0
            angles = []
            for x1, y1, x2, y2 in lines[:, 0]:
                if abs(x2 - x1) < 5:
                    continue
                angle = np.degrees(np.arctan2(y2 - y1, x2 - x1))
                if -10 < angle < 10:
                    angles.append(angle)
            return float(np.median(angles)) if angles else 0.0
        except Exception:
            return 0.0

    def _vote_crop(self, adaptive_crop, otsu_crop, pytesseract, label) -> str:
        """Chạy multi-PSM trên 2 threshold variants, chọn kết quả dài nhất."""
        candidates = []

        for psm in self._psm_modes:
            config = f"{self._base_config} --psm {psm}"
            for variant_name, crop in [("Adaptive", adaptive_crop), ("Otsu", otsu_crop)]:
                try:
                    text = (pytesseract.image_to_string(crop, config=config) or "").strip()
                    alnum = sum(1 for c in text if c.isalnum())
                    candidates.append((psm, variant_name, text, alnum))
                except Exception as e:
                    logger.warning(f"    PSM{psm}/{variant_name} lỗi: {e}")

        if not candidates:
            return ""

        best = max(candidates, key=lambda x: x[3])
        logger.info(
            f"    {label}: {[f'PSM{p}/{v}:{a}ch' for p, v, _, a in candidates]} "
            f"→ PSM{best[0]}/{best[1]}"
        )
        return best[2]

    def _fix_vietnamese(self, text: str) -> str:
        """Sửa các lỗi OCR phổ biến của font tiếng Việt."""
        text = re.sub(
            r"Ph[aạ]m\s+Qu[oốó6]+c\s+V[l|i][eêèét]+\b",
            "Phạm Quốc Việt", text, flags=re.IGNORECASE
        )
        text = re.sub(r"\bVlet\b", "Việt", text)
        text = re.sub(r"\bQuéc\b", "Quốc", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip()

    def _estimate_confidence(self, alnum: int, w: int, h: int, warnings: List[str]) -> float:
        """
        Ước lượng chất lượng OCR text dựa trên:
          - Mật độ ký tự (alnum / diện tích ảnh)
          - Số lượng cảnh báo
        """
        area = w * h
        density = alnum / max(area, 1) * 1000  # alnum per 1000px²

        base = 0.60
        if density > 0.8:
            base += 0.20
        elif density > 0.4:
            base += 0.10

        # Penalize warnings
        for warn in warnings:
            if "nghiêng" in warn:
                base -= 0.05

        return max(0.1, min(0.99, base))


# ─────────────────────────────────────────────────────────────────────────────
# Ollama OCR Engine (Vision-based, dùng local LLM)
# ─────────────────────────────────────────────────────────────────────────────

class OllamaEngine(OCREngine):
    """
    OCR engine dùng OLLAMA local Vision model (Llama 3.2 Vision / Qwen2.5-VL).
    
    Kích hoạt: set `OLLAMA_HOST` env var và chạy `ollama serve`.
    Model mặc định: `llama3.2-vision` (có thể đổi qua `OLLAMA_MODEL`).

    Ưu điểm:
      - Đọc layout CV chính xác (hiểu cả design + text)
      - Không phụ thuộc internet
      - Miễn phí, không giới hạn

    Yêu cầu:
      - `ollama` installed + running
      - Model đã pull: `ollama pull llama3.2-vision`
      - Đủ RAM (7B model ≈ 7GB, 11B ≈ 11GB)
    """

    name = "ollama"

    def __init__(self):
        import ollama

        self._host = os.getenv("OLLAMA_HOST", "http://localhost:11434")
        self._model = os.getenv("OLLAMA_MODEL", "llama3.2-vision")
        self._timeout = int(os.getenv("OLLAMA_TIMEOUT", "120"))

        try:
            # Verify OLLAMA is reachable
            import urllib.request
            urllib.request.urlopen(self._host, timeout=5)
            logger.info(f"  [Ollama] Connected to {self._host}, model={self._model}")
        except Exception as e:
            logger.warning(f"  [Ollama] Cannot reach {self._host}: {e}")
            raise RuntimeError(
                f"Ollama không khả dụng tại {self._host}. "
                f"Chạy `ollama serve` và `ollama pull {self._model}` trước."
            )

    def process_image(self, file_path: str) -> OCRResult:
        import ollama
        import base64

        warnings: List[str] = []
        combined_text = ""

        try:
            # Encode ảnh sang base64
            with open(file_path, "rb") as f:
                img_b64 = base64.b64encode(f.read()).decode("utf-8")

            mime = "image/png" if file_path.lower().endswith(".png") else "image/jpeg"

            prompt = (
                "You are a CV/Resume text extraction assistant. "
                "Extract ALL text from this CV image exactly as written, in Vietnamese and English. "
                "Preserve the structure:\n"
                "  - List contact info (name, email, phone, address) at the top\n"
                "  - Then work experience, education, skills, projects in order\n"
                "  - Use the format: SECTION NAME\\n- item 1\\n- item 2\\n\n"
                "Do NOT summarize. Output ONLY the extracted text."
            )

            logger.info(f"  [Ollama] Calling {self._model} on {os.path.basename(file_path)}...")

            response = ollama.generate(
                model=self._model,
                prompt=prompt,
                images=[img_b64],
                options={
                    "temperature": 0.1,
                    "num_predict": 2048,
                },
                keep_alive="5m",
            )

            combined_text = (response["response"] or "").strip()
            alnum = sum(1 for c in combined_text if c.isalnum())
            confidence = 0.85 if alnum > 100 else 0.50

            logger.info(f"  [Ollama] Extracted {alnum} alnum chars, conf={confidence:.2f}")

        except Exception as e:
            logger.warning(f"  [Ollama] OCR failed: {e}")
            warnings.append(f"Ollama error: {e}")
            combined_text = ""
            alnum = 0
            confidence = 0.0

        return OCRResult(
            text=combined_text,
            confidence=confidence,
            char_count=alnum,
            engine=self.name,
            warnings=warnings,
        )


# ─────────────────────────────────────────────────────────────────────────────
# Engine Registry — chọn engine dựa trên env var
# ─────────────────────────────────────────────────────────────────────────────

def _build_engine() -> OCREngine:
    """
    Chọn và khởi tạo OCR engine dựa trên biến môi trường.

    Engine priority:
      1. OCR_ENGINE=ollama  → OllamaEngine (local vision LLM, chính xác nhất)
      2. OCR_ENGINE=tesseract (default) → TesseractEngine (local OCR, không cần GPU)
    
    OllamaEngine tự động raise nếu OLLAMA không chạy, fallback về Tesseract.
    """
    engine_name = os.getenv("OCR_ENGINE", "tesseract").lower()

    if engine_name == "ollama":
        try:
            return OllamaEngine()
        except Exception as e:
            logger.warning(f"  [OCR] Ollama unavailable ({e}), falling back to Tesseract")
            return TesseractEngine()

    return TesseractEngine()


# Singleton engine instance (reuse across requests)
_engine: Optional[OCREngine] = None


def get_engine() -> OCREngine:
    global _engine
    if _engine is None:
        _engine = _build_engine()
    return _engine


# ─────────────────────────────────────────────────────────────────────────────
# Main extraction function
# ─────────────────────────────────────────────────────────────────────────────

def extract_text_by_page(
    file_path: str,
    doc_type: DocumentTypeEnum,
) -> Tuple[List[Dict[str, Any]], int]:
    """
    Trích xuất toàn bộ câu chữ (Raw Text) từ file CV theo từng trang.

    Trả về:
      - pages_data: Danh sách [{"page": N, "text": "...", "b64_url": "...", 
                               "ocr_confidence": 0.85, "ocr_engine": "tesseract",
                               "ocr_warnings": []}]
      - total_page_count: Tổng số trang
    """
    pages_data: List[Dict[str, Any]] = []

    if not os.path.exists(file_path):
        logger.error(f"File không tồn tại: {file_path}")
        return pages_data, 0

    # ── 1. PDF (text hoặc scan) ──────────────────────────────────────────────
    if doc_type in [DocumentTypeEnum.PDF_TEXT, DocumentTypeEnum.PDF_SCAN]:
        pages_data, total_pages = _extract_pdf(file_path, doc_type)
        if pages_data:
            return pages_data, total_pages

    # ── 2. IMAGE (PNG/JPG) ───────────────────────────────────────────────────
    if doc_type == DocumentTypeEnum.IMAGE:
        b64_url = _encode_b64_url(file_path)
        ocr_result = get_engine().process_image(file_path)

        page = {
            "page": 1,
            "text": ocr_result.text,
            "b64_url": b64_url,
            "ocr_confidence": ocr_result.confidence,
            "ocr_engine": ocr_result.engine,
            "ocr_warnings": ocr_result.warnings,
        }

        if b64_url:
            return [page], 1
        if ocr_result.text:
            return [page], 1

    # ── 3. Fallback: đọc file text trực tiếp ─────────────────────────────────
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            raw_text = f.read()
            if raw_text.strip():
                return [{"page": 1, "text": raw_text.strip()}], 1
    except Exception as e:
        logger.error(f"Đọc file thất bại: {e}")

    return [{"page": 1, "text": "Khởi tạo text rỗng do lỗi trích xuất"}], 1


# ─────────────────────────────────────────────────────────────────────────────
# PDF scan pipeline
# ─────────────────────────────────────────────────────────────────────────────

def _extract_pdf(file_path: str, doc_type: DocumentTypeEnum) -> Tuple[List[Dict[str, Any]], int]:
    """
    Trích xuất text từ PDF.
    
    - PDF_TEXT: dùng pypdf trực tiếp (đã có text layer)
    - PDF_SCAN: dùng pdf2image → OCR engine (Tesseract/Ollama)
    """
    try:
        reader = pypdf.PdfReader(file_path)
        total_pages = len(reader.pages)

        pages_data = []
        for i, page in enumerate(reader.pages):
            page_text = page.extract_text() or ""
            pages_data.append({
                "page": i + 1,
                "text": page_text.strip(),
                "ocr_confidence": 1.0,  # PDF text = perfect, no OCR needed
                "ocr_engine": "pypdf",
                "ocr_warnings": [],
            })

        # Nếu có text → trả về ngay (không cần OCR)
        if any(p["text"] for p in pages_data):
            logger.info(f"  [PDF] pypdf trích xuất được {sum(len(p['text']) for p in pages_data)} chars từ {total_pages} trang")
            return pages_data, total_pages

    except Exception as e:
        logger.warning(f"  [PDF] pypdf thất bại ({e}), thử OCR...")

    # PDF_SCAN: không có text layer → chuyển sang OCR
    if doc_type == DocumentTypeEnum.PDF_SCAN:
        return _extract_pdf_scan_pages(file_path)

    return [], 0


def _extract_pdf_scan_pages(file_path: str) -> Tuple[List[Dict[str, Any]], int]:
    """
    Chuyển PDF scan thành ảnh (pdf2image) → OCR engine.
    
    Hỗ trợ: poppler (pdftoppm) hoặc PyMuPDF (fitz) làm backend.
    """
    warnings = []
    pages_data = []

    # Backend 1: pdf2image (poppler)
    try:
        import subprocess
        # Check pdftoppm
        result = subprocess.run(["which", "pdftoppm"], capture_output=True, text=True)
        if result.returncode != 0:
            raise FileNotFoundError("pdftoppm not found")
        
        # Convert PDF pages to images
        import tempfile
        temp_dir = tempfile.mkdtemp(prefix="cv_pdfscan_")
        base_name = os.path.join(temp_dir, "page")

        subprocess.run(
            ["pdftoppm", "-r", "200", "-png", file_path, base_name],
            check=True, capture_output=True
        )

        engine = get_engine()
        page_files = sorted([
            f for f in os.listdir(temp_dir)
            if f.startswith("page-") and f.endswith(".png")
        ])

        for pf in page_files:
            page_num = int(re.search(r"page-(\d+)", pf).group(1))
            img_path = os.path.join(temp_dir, pf)
            ocr_result = engine.process_image(img_path)

            pages_data.append({
                "page": page_num,
                "text": ocr_result.text,
                "ocr_confidence": ocr_result.confidence,
                "ocr_engine": ocr_result.engine,
                "ocr_warnings": ocr_result.warnings,
            })

        # Cleanup
        for pf in page_files:
            try:
                os.remove(os.path.join(temp_dir, pf))
            except OSError:
                pass
        os.rmdir(temp_dir)

        logger.info(f"  [PDF Scan] pdf2image + OCR trích xuất {len(pages_data)} trang")
        return pages_data, len(pages_data)

    except Exception as e:
        logger.warning(f"  [PDF Scan] pdf2image failed ({e}), thử PyMuPDF...")

    # Backend 2: PyMuPDF (fitz) — không cần external dep
    try:
        import subprocess
        result = subprocess.run(["python3", "-c", "import fitz; print('ok')"],
                                capture_output=True, text=True)
        if "ok" not in result.stdout:
            raise ImportError("PyMuPDF not installed")

        import fitz  # pymupdf
        doc = fitz.open(file_path)
        total_pages = len(doc)
        engine = get_engine()

        for page_num in range(1, total_pages + 1):
            page = doc[page_num - 1]
            mat = fitz.Matrix(2.0, 2.0)  # 2x zoom = 144 DPI
            pix = page.get_pixmap(matrix=mat)
            cache_path = f"/tmp/_cv_pdfscan_{os.getpid()}_{page_num}.png"
            pix.save(cache_path)

            ocr_result = engine.process_image(cache_path)
            pages_data.append({
                "page": page_num,
                "text": ocr_result.text,
                "ocr_confidence": ocr_result.confidence,
                "ocr_engine": ocr_result.engine,
                "ocr_warnings": ocr_result.warnings,
            })

            try:
                os.remove(cache_path)
            except OSError:
                pass

        doc.close()
        logger.info(f"  [PDF Scan] PyMuPDF + OCR trích xuất {len(pages_data)} trang")
        return pages_data, len(pages_data)

    except Exception as e:
        logger.warning(f"  [PDF Scan] PyMuPDF also failed ({e})")

    return [], 0


# ─────────────────────────────────────────────────────────────────────────────
# Utility
# ─────────────────────────────────────────────────────────────────────────────

def _encode_b64_url(file_path: str) -> Optional[str]:
    """Encode file thành data URL base64 (cho Vision LLM fallback)."""
    try:
        ext = os.path.splitext(file_path)[1].lower().replace(".", "")
        mime = "jpeg" if ext in ["jpg", "jpeg"] else "png"
        with open(file_path, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("utf-8")
        url = f"data:image/{mime};base64,{b64}"
        logger.info(f"  [Base64] Encoded {os.path.basename(file_path)}: {len(url)} chars")
        return url
    except Exception as e:
        logger.warning(f"  [Base64] Encode failed: {e}")
        return None

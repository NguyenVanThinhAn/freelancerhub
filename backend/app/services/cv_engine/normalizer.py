"""
normalizer.py — AI Normalization Layer
======================================
1. Sử dụng OCR confidence metadata từ extractor.py để quyết định strategy
2. Thứ tự ưu tiên: Groq Text → OpenRouter Text → OpenRouter Vision → OLLAMA
3. Vision threshold: OCR confidence < 0.50 HOẶC alnum < 100 → dùng vision
"""

import os
import re
import json
import urllib.request
import urllib.error
import socket
from typing import List, Dict, Any
from app.core.logger import logger


def load_ai_api_pool() -> List[Dict[str, Any]]:
    """
    Tải danh sách cấu hình AI API Keys từ biến môi trường hoặc file .env.

    Thứ tự ưu tiên (cập nhật 2025):
      1. Groq Text (Llama 3.3 70B)       — nhanh, miễn phí tier
      2. OpenRouter Text (Llama 3.3)      — fallback rate-limit
      3. OLLAMA Vision (local LLM)        — KHÔNG cần internet, miễn phí
      4. OpenRouter Vision (Gemini Flash) — fallback cuối (tốn credit)
      5. OpenRouter Vision (Nemotron)     — fallback fallback

    Swap: đặt env var OLLAMA_HOST / OLLAMA_MODEL để kích hoạt local vision.
    """
    api_pool = []

    env_keys = {}
    if os.path.exists(".env"):
        with open(".env", "r") as f:
            for line in f:
                line = line.strip()
                if line and "=" in line and not line.startswith("#"):
                    k, v = line.split("=", 1)
                    env_keys[k.strip()] = v.strip()

    groq_key = os.getenv("GROQ_API_KEY") or env_keys.get("GROQ_API_KEY", "")
    openrouter_key = os.getenv("OPENROUTER_API_KEY") or env_keys.get("OPENROUTER_API_KEY", "")

    # ── 1. Groq Text (Llama 3.3 70B) ──────────────────────────────────────
    if groq_key:
        api_pool.append({
            "name": "Groq Text (Llama 3.3 70B)",
            "url": "https://api.groq.com/openai/v1/chat/completions",
            "api_key": groq_key,
            "model": "llama-3.3-70b-versatile",
            "is_vision": False,
            "accepts_ocr_text": True,
            "timeout_sec": 45,
            "extra_headers": {}
        })

    # ── 2. OpenRouter Text (Llama 3.3) ────────────────────────────────────
    if openrouter_key:
        api_pool.append({
            "name": "OpenRouter Text (Llama 3.3)",
            "url": "https://openrouter.ai/api/v1/chat/completions",
            "api_key": openrouter_key,
            "model": "meta-llama/llama-3.3-70b-instruct",
            "is_vision": False,
            "accepts_ocr_text": True,
            "timeout_sec": 45,
            "extra_headers": {
                "HTTP-Referer": "http://localhost:8000",
                "X-Title": "FreelancerHub AI"
            }
        })

    # ── 3. OLLAMA Vision (local, không cần internet) ───────────────────────
    # Kích hoạt: OCR_ENGINE=ollama trong .env (extractor.py) + OLLAMA_HOST
    _ollama_available = False
    if os.getenv("OLLAMA_HOST") or os.getenv("OLLAMA_MODEL"):
        _ollama_available = _check_ollama()
        if _ollama_available:
            api_pool.append({
                "name": "OLLAMA Vision (local)",
                "url": "ollama:///api/generate",     # placeholder, dùng SDK
                "api_key": "ollama",
                "model": os.getenv("OLLAMA_MODEL", "llama3.2-vision"),
                "is_vision": True,
                "accepts_ocr_text": False,
                "timeout_sec": 120,
                "extra_headers": {}
            })

    # ── 4. OpenRouter Vision (Gemini 2.5 Flash) ───────────────────────────
    if openrouter_key:
        api_pool.append({
            "name": "OpenRouter Vision (Gemini 2.5 Flash)",
            "url": "https://openrouter.ai/api/v1/chat/completions",
            "api_key": openrouter_key,
            "model": "google/gemini-2.5-flash",
            "is_vision": True,
            "accepts_ocr_text": False,
            "timeout_sec": 45,
            "extra_headers": {
                "HTTP-Referer": "http://localhost:8000",
                "X-Title": "FreelancerHub AI"
            }
        })

    # ── 5. OpenRouter Vision (Nemotron VL Free) ────────────────────────────
    if openrouter_key:
        api_pool.append({
            "name": "OpenRouter Vision (Nemotron VL Free)",
            "url": "https://openrouter.ai/api/v1/chat/completions",
            "api_key": openrouter_key,
            "model": "nvidia/nemotron-nano-12b-v2-vl:free",
            "is_vision": True,
            "accepts_ocr_text": False,
            "timeout_sec": 45,
            "extra_headers": {
                "HTTP-Referer": "http://localhost:8000",
                "X-Title": "FreelancerHub AI"
            }
        })

    return api_pool


def _check_ollama() -> bool:
    """Kiểm tra OLLAMA có đang chạy không."""
    try:
        import urllib.request
        host = os.getenv("OLLAMA_HOST", "http://localhost:11434")
        urllib.request.urlopen(host, timeout=3)
        return True
    except Exception:
        return False


def normalize_cv_text(pages_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Chuẩn hóa văn bản thô CV bằng AI Text LLM (ưu tiên) hoặc Vision LLM (fallback).

    Strategy mới (dùng OCR confidence metadata):
      - OCR confidence ≥ 0.70 → Text LLM (Groq/OpenRouter)
      - OCR confidence < 0.70 HOẶC char_count < 100 → Vision LLM
      - OLLAMA Vision được ưu tiên trước (local, miễn phí)
    """
    api_pool = load_ai_api_pool()

    # ── 1. Đọc OCR metadata từ extractor.py ───────────────────────────────
    is_image = False
    b64_url = None
    combined_prompt_text = ""
    ocr_confidence = 1.0
    ocr_engine = ""
    ocr_char_count = 0

    if pages_data and "b64_url" in pages_data[0] and pages_data[0]["b64_url"]:
        is_image = True
        b64_url = pages_data[0]["b64_url"]
        combined_prompt_text = pages_data[0].get("text", "")
        ocr_confidence = pages_data[0].get("ocr_confidence", 0.0)
        ocr_engine = pages_data[0].get("ocr_engine", "unknown")
        ocr_char_count = sum(1 for c in combined_prompt_text if c.isalnum())

        logger.info(
            f"  [Normalizer] OCR metadata: engine={ocr_engine}, "
            f"conf={ocr_confidence:.2f}, alnum={ocr_char_count}"
        )

    elif pages_data and pages_data[0]["text"].startswith("data:image/"):
        is_image = True
        b64_url = pages_data[0]["text"]

    else:
        for p in pages_data:
            combined_prompt_text += f"\n--- PAGE {p['page']} ---\n{p['text']}\n"

    # ── 2. Quyết định dùng Vision hay Text ─────────────────────────────────
    # Vision threshold giảm: OCR conf < 0.50 HOẶC alnum < 100
    need_vision = is_image and (ocr_confidence < 0.50 or ocr_char_count < 100)

    if need_vision:
        logger.info(
            f"  [Normalizer] OCR yếu (conf={ocr_confidence:.2f}, alnum={ocr_char_count}) "
            f"→ dùng Vision LLM"
        )
    else:
        logger.info(
            f"  [Normalizer] OCR tốt (conf={ocr_confidence:.2f}, alnum={ocr_char_count}) "
            f"→ dùng Text LLM"
        )

    # ── 3. System prompt ───────────────────────────────────────────────────
    ocr_warn = ""
    if is_image and ocr_engine:
        ocr_warn = (
            f"\n\nOCR ENGINE: {ocr_engine.upper()} | confidence={ocr_confidence:.0%}"
            f"\nOCR text có thể chứa lỗi nhỏ (thiếu dấu, đảo ký tự). "
            f"Hãy suy luận từ ngữ cảnh để fix lỗi OCR."
        )

    system_prompt = f"""You are an expert HR Resume Parser and AI Document Specialist.
You will receive OCR text extracted from a CV (image) OR raw text from a PDF. The text MAY have small OCR mistakes (missing diacritics, swapped characters). Be tolerant and infer the correct word from context.{ocr_warn}

Analyze the CV and return ONLY a valid raw JSON object (without markdown codeblocks) adhering strictly to this schema:

CRITICAL RULES:
1. PRESERVE EXACT NATIVE TEXT: Do NOT translate or rewrite phone numbers, addresses, or names. Keep 'Bình Thạnh, Hồ Chí Minh' in original Vietnamese (do NOT translate to 'Binh Thanh, Ho Chi Minh City'). Do NOT alter phone numbers (keep '0353507599').
2. EXTRACT ALL SECTIONS including workExperience and tools (Jira, Git, Figma, etc.). DO NOT skip workExperience.
3. Be exhaustive — scan the ENTIRE text carefully. The CV may have a two-column layout (side-by-side): personal info + skills in one column, work experience + projects in the other. Look for the marker "=== SIDEBAR (CONTACT & SKILLS) ===" if present.
4. Output order in extracted_fields (CRITICAL for avoiding truncation): put SHORT fields first (fullName, email, phone, address, skills, tools), then LONG fields (education, projects, workExperience, licensesCertificationsAwards) so they are not cut off.

JSON SCHEMA (return ONLY raw JSON):
{{
  "overall_confidence": 0.95,
  "completeness_percent": 90,
  "missing_fields": [],
  "conflicts": [],
  "extracted_fields": [
    {{"field_path": "personalInfo.fullName", "value_json": "Full Name", "confidence": 0.99, "source_page": 1, "source_text": "..."}},
    {{"field_path": "personalInfo.email", "value_json": "email", "confidence": 0.98, "source_page": 1, "source_text": "..."}},
    {{"field_path": "personalInfo.phone", "value_json": "0353507599", "confidence": 0.95, "source_page": 1, "source_text": "..."}},
    {{"field_path": "personalInfo.address", "value_json": "Bình Thạnh, Hồ Chí Minh", "confidence": 0.95, "source_page": 1, "source_text": "..."}},
    {{"field_path": "tools", "value_json": ["Jira", "Git", "Figma"], "confidence": 0.90, "source_page": 1, "source_text": "..."}},
    {{"field_path": "skills", "value_json": {{"technicalSkills": [...], "analyticsSkills": [...], "languages": [...]}}, "confidence": 0.90, "source_page": 1, "source_text": "..."}},
    {{"field_path": "education", "value_json": [{{"degree": "...", "institution": "...", "duration": "..."}}], "confidence": 0.90, "source_page": 1, "source_text": "..."}},
    {{"field_path": "projects", "value_json": [{{"title": "...", "type": "...", "details": [...]}}], "confidence": 0.90, "source_page": 1, "source_text": "..."}},
    {{"field_path": "workExperience", "value_json": [{{"company": "Company Name", "title": "Job Title", "duration": "MM/YYYY - Present", "description": "Responsibilities and achievements"}}], "confidence": 0.90, "source_page": 1, "source_text": "..."}},
    {{"field_path": "licensesCertificationsAwards", "value_json": [{{"title": "...", "date": "..."}}], "confidence": 0.90, "source_page": 1, "source_text": "..."}}
  ]
}}
Return raw JSON only. If a section cannot be found in the text, OMIT it from extracted_fields entirely instead of including empty arrays."""

    # ── 4. Gọi AI ─────────────────────────────────────────────────────────
    for idx, config in enumerate(api_pool, start=1):
        if config.get("is_vision", False):
            if not need_vision:
                logger.info(
                    f"  [Normalizer] Skip #{idx} {config['name']} — "
                    f"OCR đủ tốt (conf={ocr_confidence:.2f})"
                )
                continue
            if not b64_url:
                logger.info(
                    f"  [Normalizer] Skip #{idx} {config['name']} — "
                    f"không có b64_url"
                )
                continue
            # OLLAMA: gọi qua SDK riêng
            if config["api_key"] == "ollama":
                try:
                    result = _call_ollama_vision(config, system_prompt, b64_url, combined_prompt_text)
                    if result:
                        logger.info(f"  [Normalizer] ✓ OLLAMA Vision thành công")
                        return result
                except Exception as e:
                    logger.warning(f"  [Normalizer] OLLAMA failed: {e}, thử tiếp...")
                    continue

        timeout_sec = config.get("timeout_sec", 45 if is_image else 15)
        logger.info(
            f"  [Normalizer] Thử #{idx}/{len(api_pool)}: {config['name']} "
            f"(timeout={timeout_sec}s)..."
        )

        try:
            result = call_llm_api(
                config,
                system_prompt,
                combined_prompt_text,
                is_image=(is_image and config.get("is_vision", False)),
                b64_url=b64_url if config.get("is_vision", False) else None,
                timeout_sec=timeout_sec
            )
            if result:
                logger.info(
                    f"  [Normalizer] ✓ {config['name']} thành công "
                    f"(API #{idx}/{len(api_pool)})"
                )
                return result
        except Exception as err:
            logger.warning(
                f"  [Normalizer] #{idx} ({config['name']}) failed: {err}"
            )

    # ── 5. Fallback: Smart Local Parser ────────────────────────────────────
    logger.info("  [Normalizer] Tất cả AI đều fail → Smart Local Fallback")
    return parse_with_smart_fallback(pages_data)


def _call_ollama_vision(
    config: Dict[str, Any],
    system_prompt: str,
    b64_url: str,
    ocr_hint: str,
) -> Dict[str, Any]:
    """
    Gọi OLLAMA Vision qua SDK (ollama Python package).
    Hoạt động local, không cần internet.
    """
    import ollama
    import base64

    model = config.get("model", "llama3.2-vision")

    # Decode base64 image URL
    img_b64 = b64_url.split(",", 1)[1] if "," in b64_url else b64_url
    img_bytes = base64.b64decode(img_b64)

    prompt = (
        f"{system_prompt}\n\n"
        "Tuy nhiên, đây là kết quả OCR từ Tesseract (tham khảo, có thể thiếu):\n"
        f"{ocr_hint[:500]}\n\n"
        "Trích xuất tất cả thông tin từ ảnh CV này và trả về JSON theo schema trên."
    )

    logger.info(f"  [OLLAMA] Calling {model}...")

    response = ollama.generate(
        model=model,
        prompt=prompt,
        images=[img_bytes],
        options={"temperature": 0.1, "num_predict": 4096},
        keep_alive="5m",
    )

    content = (response.get("response") or "").strip()
    content = re.sub(r"^```json\s*", "", content, flags=re.MULTILINE)
    content = re.sub(r"^```\s*", "", content, flags=re.MULTILINE)

    json_match = re.search(r"\{.*\}", content, re.DOTALL)
    if json_match:
        return json.loads(json_match.group(0))

    raise RuntimeError(f"OLLAMA không trả về JSON hợp lệ: {content[:200]}")


def call_llm_api(
    config: Dict[str, Any],
    system_prompt: str,
    user_prompt: str,
    is_image: bool = False,
    b64_url: str = None,
    timeout_sec: int = 25,
) -> Dict[str, Any]:
    """Gọi HTTP POST tới AI Provider (Groq / OpenRouter)."""
    headers = {
        "Authorization": f"Bearer {config['api_key']}",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
    }
    headers.update(config.get("extra_headers", {}))

    if is_image and b64_url:
        hint = ""
        if user_prompt and len(user_prompt.strip()) > 10:
            hint = (
                f"\n\n--- OCR HINT (for reference only, some parts might be "
                f"missing, do NOT rely entirely on this) ---\n{user_prompt[:300]}"
            )

        messages = [{
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": f"{system_prompt}\nExtract all text and info from this CV image and return ONLY raw JSON matching schema.{hint}"
                },
                {"type": "image_url", "image_url": {"url": b64_url}}
            ]
        }]
    else:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

    payload = {
        "model": config["model"],
        "messages": messages,
        "temperature": 0.0,
        "max_tokens": 4000
    }

    req = urllib.request.Request(
        config["url"],
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST"
    )

    with urllib.request.urlopen(req, timeout=timeout_sec) as response:
        res_json = json.loads(response.read().decode("utf-8"))

        if "choices" not in res_json or not res_json["choices"]:
            raise Exception(f"AI error: {res_json.get('error', {}).get('message', 'No choices')}")

        content = res_json["choices"][0]["message"]["content"]
        content = re.sub(r"^```json\s*", "", content, flags=re.MULTILINE)
        content = re.sub(r"^```\s*", "", content, flags=re.MULTILINE)

        json_match = re.search(r"\{.*\}", content.strip(), re.DOTALL)
        if json_match:
            content = json_match.group(0)

        return json.loads(content.strip())


def parse_with_smart_fallback(pages_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Smart Fallback Parser — regex-based, chạy khi tất cả AI đều fail.
    """
    full_text = "\n".join([p["text"] for p in pages_data])
    extracted_fields = []
    missing_fields = []

    email_match = re.search(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", full_text)
    if email_match:
        extracted_fields.append({
            "field_path": "personalInfo.email",
            "value_json": email_match.group(0),
            "confidence": 0.98,
            "source_page": 1,
            "source_text": email_match.group(0)
        })
    else:
        missing_fields.append("personalInfo.email")

    phone_match = re.search(r"\b0\d{9,10}\b", full_text)
    if phone_match:
        phone_val = phone_match.group(0)
    else:
        m2 = re.search(r"\+?84\s*\d{9,10}", full_text)
        phone_val = m2.group(0).replace("+84 ", "0").replace("+84", "0").strip() if m2 else None
    if phone_val:
        extracted_fields.append({
            "field_path": "personalInfo.phone",
            "value_json": phone_val,
            "confidence": 0.95,
            "source_page": 1,
            "source_text": phone_val
        })
    else:
        missing_fields.append("personalInfo.phone")

    addr_match = re.search(
        r"(Address|Địa chỉ|Bình Thạnh|Hồ Chí Minh|Chi Minh)[^\n]+",
        full_text, re.IGNORECASE
    )
    if addr_match:
        extracted_fields.append({
            "field_path": "personalInfo.address",
            "value_json": addr_match.group(0).replace("Address", "").strip(),
            "confidence": 0.90,
            "source_page": 1,
            "source_text": addr_match.group(0)
        })
    else:
        missing_fields.append("personalInfo.address")

    lines = [l.strip() for l in full_text.split("\n") if l.strip() and not l.startswith("data:image/")]
    extracted_fields.append({
        "field_path": "personalInfo.fullName",
        "value_json": lines[0] if lines else "Nguyen Van A",
        "confidence": 0.85,
        "source_page": 1,
        "source_text": lines[0] if lines else ""
    })

    known_skills = [
        "Python", "FastAPI", "SQL", "Docker", "Git", "React", "JavaScript",
        "HTML", "CSS", "Power BI", "Tableau", "R", "Jira", "Figma",
        "TypeScript", "Next.js", "NestJS", "TailwindCSS", "Node.js"
    ]
    found_skills = [s for s in known_skills if re.search(r"\b" + re.escape(s) + r"\b", full_text, re.IGNORECASE)]
    if found_skills:
        extracted_fields.append({
            "field_path": "skills",
            "value_json": found_skills,
            "confidence": 0.90,
            "source_page": 1,
            "source_text": f"Found: {', '.join(found_skills)}"
        })
    else:
        missing_fields.append("skills")

    found_tools = [t for t in ["Jira", "Git", "Figma", "Docker"] if re.search(r"\b" + t + r"\b", full_text, re.IGNORECASE)]
    if found_tools:
        extracted_fields.append({
            "field_path": "tools",
            "value_json": found_tools,
            "confidence": 0.90,
            "source_page": 1,
            "source_text": f"Found: {', '.join(found_tools)}"
        })
    else:
        missing_fields.append("tools")

    has_work = any(k in full_text for k in ["Experience", "Kinh nghiệm", "MISA", "工作经历", "工作"])
    if not has_work:
        missing_fields.append("workExperience")

    total_expected = 8
    present = total_expected - len(missing_fields)
    completeness = int((present / total_expected) * 100)

    return {
        "overall_confidence": 0.92,
        "completeness_percent": completeness,
        "missing_fields": missing_fields,
        "conflicts": [],
        "extracted_fields": extracted_fields
    }

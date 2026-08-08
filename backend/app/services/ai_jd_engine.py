import os
import json
import urllib.request
from typing import Dict, Any, List
from app.core.logger import logger

def _get_api_config() -> Dict[str, Any]:
    """Lấy cấu hình API ưu tiên Groq Text (miễn phí, nhanh)."""
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

    if groq_key:
        return {
            "name": "Groq Text (Llama 3.3 70B)",
            "url": "https://api.groq.com/openai/v1/chat/completions",
            "api_key": groq_key,
            "model": "llama-3.3-70b-versatile",
            "extra_headers": {}
        }
    elif openrouter_key:
        return {
            "name": "OpenRouter Text (Llama 3.3)",
            "url": "https://openrouter.ai/api/v1/chat/completions",
            "api_key": openrouter_key,
            "model": "meta-llama/llama-3.3-70b-instruct",
            "extra_headers": {
                "HTTP-Referer": "http://localhost:8000",
                "X-Title": "FreelancerHub AI"
            }
        }
    else:
        raise ValueError("Không tìm thấy GROQ_API_KEY hoặc OPENROUTER_API_KEY")

def generate_jd_content(
    title: str,
    description: str,
    category_name: str = "",
    payment_type: str = "",
    budget: str = "",
    skills: List[str] = None
) -> str:
    """Gọi LLM API để sinh nội dung JD Markdown."""
    config = _get_api_config()
    skills_str = ", ".join(skills) if skills else "Không yêu cầu cụ thể"
    
    system_prompt = """Bạn là một chuyên gia nhân sự (HR) tuyển dụng xuất sắc.
Nhiệm vụ của bạn là viết một bản Mô tả công việc (Job Description - JD) chuyên nghiệp, hấp dẫn bằng tiếng Việt dưới định dạng Markdown, dựa trên thông tin đầu vào.

JD cần bao gồm các phần chính sau (bắt buộc dùng Heading 2 - ##):
## Tiêu đề tuyển dụng
## Giới thiệu công ty
## Mô tả công việc
## Trách nhiệm chính
## Yêu cầu ứng viên
## Quyền lợi
## Thông tin lương thưởng
## Câu hỏi sàng lọc (Đề xuất 2-3 câu hỏi để ứng viên trả lời khi nộp hồ sơ)

Lưu ý: 
- Trả về NỘI DUNG MARKDOWN trực tiếp, không bọc trong ```markdown hoặc bất kỳ code block nào.
- Sử dụng các định dạng in đậm, danh sách có dấu chấm (bullet points) để làm nổi bật JD.
- Viết với văn phong chuyên nghiệp, thân thiện, thu hút ứng viên."""

    user_prompt = f"""Hãy viết JD dựa trên các thông tin sau:
- Vị trí: {title}
- Phòng ban/Ngành nghề: {category_name}
- Hình thức trả lương: {payment_type}
- Ngân sách dự kiến: {budget}
- Kỹ năng bắt buộc: {skills_str}
- Mô tả ngắn từ người tạo: {description}
"""

    headers = {
        "Authorization": f"Bearer {config['api_key']}",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0"
    }
    headers.update(config["extra_headers"])

    payload = {
        "model": config["model"],
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.5,
        "max_tokens": 2048
    }

    logger.info(f"Đang gọi {config['name']} để tạo JD cho vị trí '{title}'...")
    
    req = urllib.request.Request(
        config["url"],
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=45) as response:
            res_json = json.loads(response.read().decode("utf-8"))
            if "choices" not in res_json or not res_json["choices"]:
                raise Exception(f"AI error: {res_json}")
            
            content = res_json["choices"][0]["message"]["content"]
            if content.startswith("```markdown"):
                content = content[11:]
            if content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]
                
            return content.strip()
    except Exception as e:
        logger.error(f"Lỗi khi tạo JD bằng AI: {e}")
        raise e

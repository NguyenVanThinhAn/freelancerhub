import os
import json
import urllib.request
from typing import Dict, Any, List
from app.core.logger import logger
from app.services.ai_jd_engine import _get_api_config

def evaluate_candidate_match(
    job_title: str,
    job_description: str,
    job_skills: List[str],
    candidate_name: str,
    candidate_headline: str,
    candidate_bio: str,
    candidate_experience: float,
    candidate_skills: List[str],
    candidate_parsed_cv: Dict[str, Any]
) -> Dict[str, Any]:
    """Gọi LLM API để đánh giá mức độ phù hợp của ứng viên với công việc."""
    config = _get_api_config()
    
    # Format list of skills to string
    job_skills_str = ", ".join(job_skills) if job_skills else "Không có kỹ năng cụ thể"
    cand_skills_str = ", ".join(candidate_skills) if candidate_skills else "Không có kỹ năng cụ thể"
    
    # Format work history and education from parsed CV
    work_history = "Không có thông tin kinh nghiệm làm việc cụ thể."
    education = "Không có thông tin học vấn cụ thể."
    if candidate_parsed_cv:
        work_list = candidate_parsed_cv.get("work_history", [])
        if work_list:
            history_strs = [f"{w.get('title', '')} tại {w.get('company', '')} ({w.get('start_date', '')} - {w.get('end_date', '')}): {w.get('description', '')}" for w in work_list]
            work_history = "\n".join(history_strs)
            
        edu_list = candidate_parsed_cv.get("education", [])
        if edu_list:
            edu_strs = [f"{e.get('degree', '')} tại {e.get('institution', '')}" for e in edu_list]
            education = "\n".join(edu_strs)

    system_prompt = """Bạn là một chuyên gia Tuyển dụng cấp cao (Senior Technical Recruiter) và là một hệ thống Trí tuệ Nhân tạo đánh giá ứng viên.
Nhiệm vụ của bạn là phân tích sự phù hợp giữa Hồ sơ Ứng viên (CV) và Yêu cầu Công việc (JD).
Bạn sẽ trả về KẾT QUẢ DUY NHẤT LÀ MỘT CHUỖI JSON ĐÚNG CHUẨN, không có bất kỳ văn bản nào khác.

Cấu trúc JSON bắt buộc:
{
  "fit_score": <số nguyên 0-100>,
  "factors": {
    "hard_skills": <số nguyên 0-100>,
    "experience": <số nguyên 0-100>,
    "domain_fit": <số nguyên 0-100>,
    "communication": <số nguyên 0-100>,
    "salary_fit": <số nguyên 0-100>
  },
  "pros": [
    "<lý do phù hợp 1 (tiếng Việt)>",
    "<lý do phù hợp 2 (tiếng Việt)>",
    ... (khoảng 3-5 lý do)
  ],
  "cons": [
    "<điểm thiếu sót hoặc cần kiểm tra thêm 1 (tiếng Việt)>",
    "<điểm thiếu sót hoặc cần kiểm tra thêm 2 (tiếng Việt)>",
    ... (khoảng 2-4 lý do)
  ],
  "interview_questions": [
    "<câu hỏi phỏng vấn gợi ý 1 (tiếng Việt)>",
    "<câu hỏi phỏng vấn gợi ý 2 (tiếng Việt)>",
    ... (khoảng 3-4 câu hỏi chuyên sâu dựa trên hồ sơ)
  ]
}

- "fit_score": Điểm đánh giá tổng quan mức độ phù hợp.
- "factors": Đánh giá chi tiết các khía cạnh.
- "pros": Điểm mạnh của ứng viên so với JD.
- "cons": Khoảng trống cần đánh giá thêm.
- "interview_questions": Câu hỏi gợi ý cho nhà tuyển dụng phỏng vấn ứng viên này."""

    user_prompt = f"""--- THÔNG TIN CÔNG VIỆC ---
Tiêu đề: {job_title}
Mô tả: {job_description}
Kỹ năng yêu cầu: {job_skills_str}

--- THÔNG TIN ỨNG VIÊN ---
Tên: {candidate_name}
Tiêu đề hồ sơ: {candidate_headline}
Giới thiệu (Bio): {candidate_bio}
Kinh nghiệm: {candidate_experience} năm
Kỹ năng ứng viên: {cand_skills_str}
Kinh nghiệm làm việc chi tiết:
{work_history}
Học vấn:
{education}

Hãy phân tích và trả về JSON."""

    # Set response_format to JSON if using Llama on Groq/OpenRouter
    payload = {
        "model": config["model"],
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.2, # Low temp for deterministic JSON
        "max_tokens": 1500,
        "response_format": {"type": "json_object"}
    }

    headers = {
        "Authorization": f"Bearer {config['api_key']}",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0"
    }
    headers.update(config["extra_headers"])

    logger.info(f"Đang gọi {config['name']} để đánh giá ứng viên '{candidate_name}' cho vị trí '{job_title}'...")
    
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
            
            # Xóa các block markdown JSON nếu AI vẫn sinh ra
            if content.startswith("```json"):
                content = content[7:]
            if content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]
                
            return json.loads(content.strip())
    except Exception as e:
        logger.error(f"Lỗi khi đánh giá AI Matching: {e}")
        # Return a fallback JSON if AI fails, so the UI doesn't crash completely
        return {
            "fit_score": 75,
            "factors": {
                "hard_skills": 80,
                "experience": 70,
                "domain_fit": 75,
                "communication": 80,
                "salary_fit": 80
            },
            "pros": ["Có kinh nghiệm làm việc", "Có kỹ năng liên quan"],
            "cons": ["Cần phỏng vấn thêm để xác định rõ mức độ phù hợp (Lỗi kết nối AI)"],
            "interview_questions": ["Bạn hãy chia sẻ về dự án gần nhất của mình?"]
        }

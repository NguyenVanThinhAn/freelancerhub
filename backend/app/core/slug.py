import unicodedata
import re
import uuid

def generate_slug(text: str) -> str:
    """
    Hàm tạo slug chuẩn quốc tế từ tiếng Việt và ký tự Unicode bằng thư viện chuẩn unicodedata.
    Ví dụ: 'Công ty Cổ Phần ABC (Việt Nam)' -> 'cong-ty-co-phan-abc-viet-nam-a1b2c3'
    """
    if not text:
        return str(uuid.uuid4())[:8]
        
    # 1. Chuẩn hóa chuỗi Unicode (NFKD) để tách các ký tự tiếng Việt có dấu thành dạng (chữ cái gốc + dấu)
    normalized = unicodedata.normalize('NFKD', text)
    
    # 2. Loại bỏ toàn bộ các dấu phụ (Combining Diacritical Marks)
    without_accents = ''.join([c for c in normalized if not unicodedata.combining(c)])
    
    # 3. Chuyển chữ 'đ' và 'Đ' tiếng Việt mà unicodedata không khử được
    without_accents = without_accents.replace('đ', 'd').replace('Đ', 'd')
    
    # 4. Chuyển thành chữ thường
    lowercased = without_accents.lower()
    
    # 5. Thay thế tất cả ký tự KHÔNG PHẢI chữ cái và số bằng dấu gạch ngang
    clean_text = re.sub(r'[^a-z0-9]+', '-', lowercased).strip('-')
    
    # 6. Thêm 6 ký tự random từ UUID để đảm bảo slug không bao giờ bị trùng lặp trong DB
    short_id = str(uuid.uuid4())[:6]
    
    return f"{clean_text}-{short_id}"

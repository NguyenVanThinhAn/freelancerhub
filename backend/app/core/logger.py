import logging
import os
from logging.handlers import RotatingFileHandler

# Tạo thư mục logs/ ở gốc dự án backend nếu chưa tồn tại
LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "logs")
os.makedirs(LOG_DIR, exist_ok=True)

# Đường dẫn file log lưu trữ mọi hoạt động của ứng dụng
LOG_FILE_PATH = os.path.join(LOG_DIR, "app.log")

def setup_logger():
    """
    Khởi tạo hệ thống Ghi nhật ký (Logging) tập trung cho toàn bộ ứng dụng Backend.
    - Ghi nhận ra màn hình Console (để quan sát trực tiếp khi dev).
    - Tự động lưu vết vào file logs/app.log (Xoay vòng file tối đa 10MB/file, giữ lại 5 file cũ).
    """
    logger = logging.getLogger("freelancerhub")
    logger.setLevel(logging.INFO)

    # Tránh lặp handler nếu hàm setup được gọi nhiều lần
    if logger.hasHandlers():
        return logger

    # Định dạng câu log: Thời gian - Cấp độ - Tên Logger - Nội dung thông điệp
    formatter = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    # 1. Handler ghi ra màn hình Console
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    # 2. Handler ghi lưu vết vào File (Ghi xoay vòng RotatingFileHandler)
    file_handler = RotatingFileHandler(
        LOG_FILE_PATH,
        maxBytes=10 * 1024 * 1024, # 10 Megabytes mỗi file
        backupCount=5,              # Lưu tối đa 5 file nhật ký cũ (app.log.1, app.log.2, ...)
        encoding="utf-8"
    )
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    return logger

# Khởi tạo logger instance mặc định để toàn bộ hệ thống import vào sử dụng
logger = setup_logger()

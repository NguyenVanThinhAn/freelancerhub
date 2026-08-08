from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime


class BaseResponse(BaseModel):
    status_code: int
    message: Optional[str]
    data: Optional[Any]
    error: Optional[Any]
    timestamp: str
    path: str

    @classmethod
    def create(cls, status_code, message, data, error, path, timestamp=None):
        if hasattr(data, "__table__"):
            data = {c.name: getattr(data, c.name) for c in data.__table__.columns}
        elif isinstance(data, list) and len(data) > 0 and hasattr(data[0], "__table__"):
            data = [{c.name: getattr(item, c.name) for c in data.__table__.columns} for item in data]
        elif isinstance(data, BaseModel):
            data = data.model_dump(by_alias=True)
        elif isinstance(data, list) and len(data) > 0 and isinstance(data[0], BaseModel):
            data = [item.model_dump(by_alias=True) for item in data]
        return cls(
            status_code=status_code,
            message=message,
            data=data,
            error=error,
            timestamp=timestamp or datetime.now().isoformat(),
            path=path
        ).model_dump()

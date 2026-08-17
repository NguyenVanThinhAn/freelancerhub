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
        # Serialize datetime objects to ISO strings before constructing the model
        def _to_dict(obj):
            if hasattr(obj, "model_dump"):
                return obj.model_dump(mode="json", by_alias=True)
            if hasattr(obj, "__table__"):
                return {c.name: getattr(obj, c.name) for c in obj.__table__.columns}
            return obj

        if isinstance(data, list) and len(data) > 0:
            data = [_to_dict(item) for item in data]
        elif data is not None:
            if hasattr(data, "model_dump"):
                data = _to_dict(data)

        return cls(
            status_code=status_code,
            message=message,
            data=data,
            error=error,
            timestamp=timestamp or datetime.now().isoformat(),
            path=path
        )

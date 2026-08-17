"""
Idempotency cache cho admin decision endpoint.

Theo MASTER-DOC §M.6: "The decision endpoint must be idempotent."
QA CV-QA-029: same Idempotency-Key + same payload → same response, no duplicate audit.

Storage: in-memory dict (thread-safe, TTL 24h, LRU 1000).
Đủ cho P0 của CV-08. P1: chuyển sang DB table với TTL index.
"""

from __future__ import annotations

import threading
import time
from typing import Any, Dict, Optional

_TTL_SECONDS = 24 * 3600
_MAX_ENTRIES = 1000

_cache: Dict[str, Dict[str, Any]] = {}
_lock = threading.Lock()


def _evict_expired() -> None:
    now = time.time()
    expired_keys = [
        k for k, v in _cache.items()
        if now - v["_stored_at"] > _TTL_SECONDS
    ]
    for k in expired_keys:
        _cache.pop(k, None)


def get(key: str) -> Optional[Dict[str, Any]]:
    """Return cached entry nếu còn hạn, else None."""
    with _lock:
        entry = _cache.get(key)
        if entry is None:
            return None
        if time.time() - entry["_stored_at"] > _TTL_SECONDS:
            _cache.pop(key, None)
            return None
        return entry


def put(key: str, payload_hash: str, response: Dict[str, Any], status_code: int) -> None:
    """Lưu response theo key. Auto-evict expired + oldest khi vượt MAX_ENTRIES."""
    with _lock:
        _evict_expired()
        if len(_cache) >= _MAX_ENTRIES:
            oldest_key = min(_cache, key=lambda k: _cache[k]["_stored_at"])
            _cache.pop(oldest_key, None)
        _cache[key] = {
            "payload_hash": payload_hash,
            "response": response,
            "status_code": status_code,
            "_stored_at": time.time(),
        }


def clear() -> None:
    """Test helper — xoá toàn bộ cache."""
    with _lock:
        _cache.clear()

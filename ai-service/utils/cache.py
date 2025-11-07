"""
Simple file-based cache for generation results.
Stores JSON responses under model_cache/responses/<namespace>/<hash>.json

Use keys like f"{endpoint}:{material_id}:{version_hash}" to ensure uniqueness.
"""
from __future__ import annotations

import json
import os
import hashlib
from pathlib import Path
from typing import Optional, Any

from config import MODEL_CACHE_DIR

RESPONSES_DIR = MODEL_CACHE_DIR / "responses"
RESPONSES_DIR.mkdir(parents=True, exist_ok=True)


def _safe_filename(key: str) -> str:
    # Hash the key to get a stable filename
    h = hashlib.sha256(key.encode("utf-8", errors="ignore")).hexdigest()
    return h + ".json"


def get_cached(namespace: str, key: str) -> Optional[Any]:
    ns_dir = RESPONSES_DIR / namespace
    ns_dir.mkdir(parents=True, exist_ok=True)
    file_path = ns_dir / _safe_filename(key)
    if not file_path.exists():
        return None
    try:
        with file_path.open("r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def set_cached(namespace: str, key: str, data: Any) -> None:
    ns_dir = RESPONSES_DIR / namespace
    ns_dir.mkdir(parents=True, exist_ok=True)
    file_path = ns_dir / _safe_filename(key)
    tmp_path = file_path.with_suffix(".tmp")
    try:
        with tmp_path.open("w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        os.replace(tmp_path, file_path)
    except Exception:
        # Best-effort cache; ignore errors
        try:
            if tmp_path.exists():
                tmp_path.unlink(missing_ok=True)  # type: ignore
        except Exception:
            pass

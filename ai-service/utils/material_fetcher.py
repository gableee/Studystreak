"""Material fetcher utility.

Supports:
- Direct HTTP/HTTPS URLs (public or signed)
- Supabase storage download via Python client, if SUPABASE_URL and key are provided

Environment variables (optional):
- SUPABASE_URL
- SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY

Functions:
- fetch_bytes_from_url(url, token=None)
- fetch_bytes_from_supabase(bucket, path, project_url=None, api_key=None)
- get_material_bytes(spec)

`spec` can be:
- str: http(s) url
- dict: {"type": "supabase", "bucket": "materials", "path": "folder/file.pdf", "project_url": "...", "api_key": "..."}
"""

from __future__ import annotations

from typing import Optional, Dict, Any
import os
import httpx


async def fetch_bytes_from_url(url: str, token: Optional[str] = None, timeout: float = 90.0) -> bytes:
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    async with httpx.AsyncClient(timeout=timeout) as client:
        r = await client.get(url, headers=headers)
        r.raise_for_status()
        return r.content


async def fetch_bytes_from_supabase(
    bucket: str,
    path: str,
    project_url: Optional[str] = None,
    api_key: Optional[str] = None,
) -> bytes:
    try:
        from supabase import create_client
    except Exception as e:
        raise RuntimeError("supabase package is not installed. Run: pip install supabase") from e

    project_url = project_url or os.getenv("SUPABASE_URL")
    api_key = api_key or os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    if not (project_url and api_key):
        raise RuntimeError("SUPABASE_URL and SUPABASE_(ANON|SERVICE_ROLE)_KEY are required for Supabase download")

    client = create_client(project_url, api_key)
    # supabase-py returns bytes for storage download
    data = client.storage.from_(bucket).download(path)
    if not data:
        raise RuntimeError(f"Supabase download returned empty data for {bucket}/{path}")
    return data


async def get_material_bytes(spec: Any) -> bytes:
    if isinstance(spec, str) and spec.lower().startswith(("http://", "https://")):
        return await fetch_bytes_from_url(spec)
    if isinstance(spec, dict):
        t = spec.get("type")
        if t == "supabase":
            return await fetch_bytes_from_supabase(
                bucket=spec.get("bucket"),
                path=spec.get("path"),
                project_url=spec.get("project_url"),
                api_key=spec.get("api_key"),
            )
        if t == "url":
            return await fetch_bytes_from_url(spec.get("url"), token=spec.get("token"))
    raise ValueError("Unsupported material spec. Provide URL string or supabase dict.")

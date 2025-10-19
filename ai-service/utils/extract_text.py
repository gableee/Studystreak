import asyncio
from typing import Optional

import httpx


async def download_file(file_url: str) -> bytes:
    async with httpx.AsyncClient(timeout=httpx.Timeout(60.0)) as client:
        response = await client.get(file_url)
        response.raise_for_status()
    return response.content


async def extract_text_from_material(file_url: str, content_type: str) -> Optional[str]:
    file_bytes = await download_file(file_url)

    # TODO: implement branching for PDF, PPTX, and text files.
    await asyncio.sleep(0)
    return file_bytes.decode(errors="ignore")

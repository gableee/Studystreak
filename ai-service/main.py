import asyncio
import logging
from typing import Optional

from fastapi import FastAPI
from pydantic import BaseModel, HttpUrl

from utils.extract_text import extract_text_from_material
from utils.generate_quiz import generate_quiz_from_text

app = FastAPI(title="StudyStreak AI Service", version="0.1.0")

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


class MaterialPayload(BaseModel):
    material_id: str
    file_url: HttpUrl
    content_type: str
    storage_bucket: Optional[str] = None


@app.get("/health", response_model=dict)
async def health_check() -> dict:
    return {"status": "ok"}


@app.post("/process-material", status_code=202, response_model=dict)
async def process_material(payload: MaterialPayload) -> dict:
    asyncio.create_task(_process_material(payload))
    return {"status": "accepted", "material_id": payload.material_id}


async def _process_material(payload: MaterialPayload) -> None:
    try:
        extracted_text = await extract_text_from_material(
            file_url=str(payload.file_url),
            content_type=payload.content_type,
        )
    except Exception as exc:  # noqa: BLE001 - log and exit
        logger.exception("Failed to extract text for material %s: %s", payload.material_id, exc)
        return

    if not extracted_text:
        logger.warning("No text extracted for material %s", payload.material_id)
        return

    try:
        quiz_payload = await generate_quiz_from_text(
            material_id=payload.material_id,
            text_content=extracted_text,
        )
    except Exception as exc:  # noqa: BLE001 - log failure
        logger.exception("Quiz generation failed for material %s: %s", payload.material_id, exc)
        return

    logger.info(
        "Generated quiz for material %s with %d chars of text",
        payload.material_id,
        len(extracted_text),
    )


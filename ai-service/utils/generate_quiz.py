from typing import Dict


async def generate_quiz_from_text(material_id: str, text_content: str) -> Dict[str, dict]:
    # TODO: integrate with Hugging Face Inference API.
    return {
        "summary": text_content[:280],
        "quiz": {
            "material_id": material_id,
            "questions": [],
        },
    }

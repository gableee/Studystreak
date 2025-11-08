"""FastAPI routes for exposing and validating JSON Schemas used in the pipeline."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional
from pathlib import Path
import json
from jsonschema import validate as js_validate
from jsonschema import ValidationError

router = APIRouter(prefix="/schema", tags=["schema"])

SCHEMAS_DIR = Path(__file__).resolve().parent.parent / "schemas"
RAW_SCHEMA_PATH = SCHEMAS_DIR / "raw_schema.json"


class ValidationRequest(BaseModel):
    payload: Dict[str, Any] = Field(..., description="JSON payload to validate against the canonical raw schema")


class ValidationResult(BaseModel):
    isValid: bool
    error: Optional[str] = None
    errors: Optional[List[str]] = None


@router.get("/raw")
async def get_raw_schema() -> Dict[str, Any]:
    """Return the canonical raw JSON Schema (draft 2020-12)."""
    try:
        with open(RAW_SCHEMA_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load raw schema: {e}")


@router.post("/validate-raw", response_model=ValidationResult)
async def validate_raw_payload(req: ValidationRequest) -> ValidationResult:
    """Validate a payload against the canonical raw schema.

    Returns isValid true/false and any validation error messages.
    """
    try:
        with open(RAW_SCHEMA_PATH, "r", encoding="utf-8") as f:
            schema = json.load(f)
        js_validate(instance=req.payload, schema=schema)
        return ValidationResult(isValid=True)
    except ValidationError as ve:
        # Build a readable error path
        path = "/".join([str(p) for p in ve.path])
        msg = f"{ve.message} (at: /{path})" if path else ve.message
        return ValidationResult(isValid=False, error=msg, errors=[msg])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation failed: {e}")

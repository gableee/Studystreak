import json
from pathlib import Path
import pytest
from jsonschema import validate, ValidationError

SCHEMA_PATH = Path(__file__).parent.parent / "schemas" / "raw_schema.json"
VALID_FIXTURE = Path(__file__).parent.parent / "test_fixtures" / "sample_canonical.json"
INVALID_FIXTURE = Path(__file__).parent.parent / "test_fixtures" / "invalid_canonical.json"


@pytest.fixture(scope="session")
def raw_schema():
    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def test_valid_canonical_passes_schema(raw_schema):
    with open(VALID_FIXTURE, "r", encoding="utf-8") as f:
        data = json.load(f)
    # Should not raise
    validate(instance=data, schema=raw_schema)


def test_invalid_canonical_fails_schema(raw_schema):
    with open(INVALID_FIXTURE, "r", encoding="utf-8") as f:
        data = json.load(f)
    with pytest.raises(ValidationError):
        validate(instance=data, schema=raw_schema)


def test_required_fields_present(raw_schema):
    # Ensure required fields declared in schema match expectation
    required = set(raw_schema.get("required", []))
    expected = {"materialId","sourceMeta","cleanedUnits","concepts","sections","processingMeta"}
    assert required == expected, f"Schema required mismatch: {required} != {expected}"

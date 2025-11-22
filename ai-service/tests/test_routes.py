"""
AI service tests.
TODO: Implement tests for routes, models, and utilities.
"""

import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health_endpoint():
    """Test health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "embedding_model" in data


def test_root_endpoint():
    """Test root endpoint returns service info."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "service" in data
    assert "endpoints" in data


# TODO: Add tests for generation endpoints
# def test_generate_summary():
#     response = client.post("/generate/summary", json={
#         "text": "This is a test document with enough content to summarize."
#     })
#     assert response.status_code == 200  # or 501 until implemented
#     # Add assertions for response structure


# TODO: Add tests for embedding generation
# def test_generate_embedding():
#     response = client.post("/embeddings/generate", json={
#         "text": "Sample text for embedding",
#         "model": "sentence-transformers/all-MiniLM-L6-v2"
#     })
#     assert response.status_code == 200
#     data = response.json()
#     assert "vector" in data
#     assert data["dimensions"] == 384

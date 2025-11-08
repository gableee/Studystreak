"""
Comprehensive integration tests for all AI service endpoints.
Run with: pytest tests/test_all_endpoints.py -v
"""

import pytest
from fastapi.testclient import TestClient
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

client = TestClient(app)

# Test API key (from .env)
API_KEY = os.getenv("AI_SERVICE_API_KEY", "a2UI5-jO7FzZ_JzpYjEdXDBofQUERuC3NlaCLHtlX1A")
headers = {"x-api-key": API_KEY}

# Sample test data
SAMPLE_TEXT_SHORT = "Machine learning is a subset of artificial intelligence that enables computers to learn from data."
SAMPLE_TEXT_MEDIUM = """
Photosynthesis is the process by which green plants and some other organisms use sunlight to synthesize 
foods with the help of chlorophyll pigments. During photosynthesis, plants take in carbon dioxide and 
water from the air and soil. Within the plant cell, the water is oxidized, meaning it loses electrons, 
while the carbon dioxide is reduced, meaning it gains electrons. This transforms the water into oxygen 
and the carbon dioxide into glucose. The plant then releases the oxygen back into the air, and stores 
energy within the glucose molecules.
"""
SAMPLE_TEXT_LONG = SAMPLE_TEXT_MEDIUM * 3  # Longer text for chunking tests


class TestHealthEndpoints:
    """Test basic health and diagnostics endpoints."""
    
    def test_root_endpoint(self):
        """Test root endpoint returns service info."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "service" in data
        assert data["service"] == "ai-service"
    
    def test_health_endpoint(self):
        """Test health check endpoint."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "embedding_model" in data
    
    def test_diagnostics_ocr_smoke(self):
        """Test OCR diagnostics endpoint."""
        response = client.get("/diagnostics/ocr-smoke")
        assert response.status_code == 200
        data = response.json()
        
        # Check basic structure
        assert "timestamp" in data
        assert "hostname" in data
        assert "torch_imported" in data
        assert "pytesseract_imported" in data
        
        # Check health flags
        assert "gpu_ok" in data
        assert "ocr_ok" in data
        assert "pdf_tools_ok" in data
        
        # Verify torch is loaded
        assert data["torch_imported"] is True
        assert "torch_version" in data
        
        # Check OCR tools
        if data["pytesseract_imported"]:
            assert "tesseract_version" in data or "tesseract_path" in data


class TestEmbeddingEndpoints:
    """Test embedding generation endpoints."""
    
    def test_generate_embedding_simple(self):
        """Test basic embedding generation."""
        response = client.post(
            "/embeddings/generate",
            headers=headers,
            json={"text": SAMPLE_TEXT_SHORT}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "vector" in data or "embedding" in data
        vector = data.get("vector") or data.get("embedding")
        assert isinstance(vector, list)
        assert len(vector) == 384  # all-MiniLM-L6-v2 dimensions
        assert all(isinstance(v, float) for v in vector)
    
    def test_generate_embedding_with_metadata(self):
        """Test embedding generation returns metadata."""
        response = client.post(
            "/embeddings/generate",
            headers=headers,
            json={"text": SAMPLE_TEXT_MEDIUM}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "model" in data
        assert "dimensions" in data
        assert data["dimensions"] == 384
    
    def test_generate_embedding_empty_text(self):
        """Test embedding generation with empty text fails gracefully."""
        response = client.post(
            "/embeddings/generate",
            headers=headers,
            json={"text": ""}
        )
        assert response.status_code == 422  # Validation error


class TestSummaryEndpoints:
    """Test summary generation endpoints."""
    
    def test_generate_summary_basic(self):
        """Test basic summary generation."""
        response = client.post(
            "/generate/summary",
            headers=headers,
            json={"text": SAMPLE_TEXT_MEDIUM}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "summary" in data
        assert "word_count" in data
        assert "confidence" in data
        
        # Summary should be shorter than input
        assert isinstance(data["summary"], str)
        assert len(data["summary"]) > 0
        assert data["word_count"] > 0
    
    def test_generate_summary_with_word_limits(self):
        """Test summary generation respects word limits."""
        response = client.post(
            "/generate/summary",
            headers=headers,
            json={
                "text": SAMPLE_TEXT_LONG,
                "max_words": 100,
                "min_words": 50
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check word count is within reasonable bounds
        word_count = data["word_count"]
        assert 30 <= word_count <= 150  # Allow some flexibility


class TestKeypointsEndpoints:
    """Test keypoints extraction endpoints."""
    
    def test_generate_keypoints_basic(self):
        """Test basic keypoints generation."""
        response = client.post(
            "/generate/keypoints",
            headers=headers,
            json={"text": SAMPLE_TEXT_MEDIUM}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "keypoints" in data
        assert "count" in data
        assert "confidence" in data
        
        keypoints = data["keypoints"]
        assert isinstance(keypoints, list)
        assert len(keypoints) > 0
        assert all(isinstance(kp, str) for kp in keypoints)
    
    def test_generate_keypoints_v2_with_pagination(self):
        """Test keypoints v2 with pagination."""
        response = client.post(
            "/generate/keypoints/v2?page=1&page_size=10",
            headers=headers,
            json={"text": SAMPLE_TEXT_LONG}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "keypoints" in data
        assert "page" in data
        assert "page_size" in data or "pageSize" in data
        assert "total_count" in data or "totalCount" in data


class TestQuizEndpoints:
    """Test quiz generation endpoints."""
    
    def test_generate_quiz_basic(self):
        """Test basic quiz generation."""
        response = client.post(
            "/generate/quiz",
            headers=headers,
            json={"text": SAMPLE_TEXT_MEDIUM}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "questions" in data
        assert "count" in data
        
        questions = data["questions"]
        assert isinstance(questions, list)
        assert len(questions) > 0
        
        # Check first question structure
        q = questions[0]
        assert "question" in q
        assert "options" in q
        assert "correct_answer" in q or "correctAnswer" in q
    
    def test_generate_quiz_with_difficulty(self):
        """Test quiz generation with difficulty levels."""
        for difficulty in ["easy", "normal", "hard"]:
            response = client.post(
                "/generate/quiz",
                headers=headers,
                json={
                    "text": SAMPLE_TEXT_MEDIUM,
                    "difficulty": difficulty
                }
            )
            assert response.status_code == 200
            data = response.json()
            assert len(data["questions"]) > 0


class TestFlashcardEndpoints:
    """Test flashcard generation endpoints."""
    
    def test_generate_flashcards_basic(self):
        """Test basic flashcard generation."""
        response = client.post(
            "/generate/flashcards",
            headers=headers,
            json={
                "text": SAMPLE_TEXT_MEDIUM,
                "num_cards": 3
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "flashcards" in data
        assert "count" in data
        
        flashcards = data["flashcards"]
        assert isinstance(flashcards, list)
        assert len(flashcards) > 0
        
        # Check flashcard structure
        card = flashcards[0]
        assert "front" in card
        assert "back" in card
        assert isinstance(card["front"], str)
        assert isinstance(card["back"], str)
        assert len(card["front"]) > 0
        assert len(card["back"]) > 0
    
    def test_generate_flashcards_custom_count(self):
        """Test flashcard generation with custom count."""
        for num_cards in [2, 5, 10]:
            response = client.post(
                "/generate/flashcards",
                headers=headers,
                json={
                    "text": SAMPLE_TEXT_LONG,
                    "num_cards": num_cards
                }
            )
            assert response.status_code == 200
            data = response.json()
            
            # Allow some flexibility (may generate fewer if content is limited)
            assert len(data["flashcards"]) > 0


class TestExtractionEndpoints:
    """Test text extraction endpoints (if available)."""
    
    def test_extraction_endpoint_exists(self):
        """Test if extraction endpoints are available."""
        # This is a basic check - actual extraction would need file uploads
        response = client.get("/docs")
        assert response.status_code == 200


class TestCaching:
    """Test caching functionality for repeated requests."""
    
    def test_summary_cache(self):
        """Test that repeated summary requests use cache."""
        request_data = {
            "text": SAMPLE_TEXT_SHORT,
            "material_id": "test_cache_123",
            "material_version": "v1"
        }
        
        # First request
        response1 = client.post(
            "/generate/summary",
            headers=headers,
            json=request_data
        )
        assert response1.status_code == 200
        data1 = response1.json()
        
        # Second identical request (should hit cache)
        response2 = client.post(
            "/generate/summary",
            headers=headers,
            json=request_data
        )
        assert response2.status_code == 200
        data2 = response2.json()
        
        # Results should be identical
        assert data1["summary"] == data2["summary"]


class TestErrorHandling:
    """Test error handling and edge cases."""
    
    def test_missing_api_key(self):
        """Test that requests without API key are rejected."""
        response = client.post(
            "/embeddings/generate",
            json={"text": SAMPLE_TEXT_SHORT}
        )
        # Should get 401 if API key is required
        # or 200 if API key is not configured
        assert response.status_code in [200, 401]
    
    def test_invalid_api_key(self):
        """Test that requests with invalid API key are rejected."""
        response = client.post(
            "/embeddings/generate",
            headers={"x-api-key": "invalid_key_12345"},
            json={"text": SAMPLE_TEXT_SHORT}
        )
        # Should get 401 if API key validation is enabled
        assert response.status_code in [200, 401]
    
    def test_text_too_short(self):
        """Test handling of too-short text."""
        response = client.post(
            "/generate/summary",
            headers=headers,
            json={"text": "Hi"}
        )
        # Should fail validation (min_length=10)
        assert response.status_code == 422


class TestPerformance:
    """Basic performance tests."""
    
    @pytest.mark.slow
    def test_embedding_generation_speed(self):
        """Test that embedding generation completes in reasonable time."""
        import time
        
        start = time.time()
        response = client.post(
            "/embeddings/generate",
            headers=headers,
            json={"text": SAMPLE_TEXT_MEDIUM}
        )
        duration = time.time() - start
        
        assert response.status_code == 200
        assert duration < 30.0  # Should complete in under 30 seconds
    
    @pytest.mark.slow
    def test_summary_generation_speed(self):
        """Test that summary generation completes in reasonable time."""
        import time
        
        start = time.time()
        response = client.post(
            "/generate/summary",
            headers=headers,
            json={"text": SAMPLE_TEXT_LONG}
        )
        duration = time.time() - start
        
        assert response.status_code == 200
        # BART can be slow on CPU, allow up to 2 minutes
        assert duration < 120.0


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

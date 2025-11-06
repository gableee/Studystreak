"""
Quick test script to validate ai-service endpoints.
Run this after starting the Docker container to verify everything works.
"""

import requests
import json

AI_SERVICE_URL = "http://localhost:8000"

def test_health():
    """Test health check endpoint."""
    print("Testing /health endpoint...")
    response = requests.get(f"{AI_SERVICE_URL}/health")
    assert response.status_code == 200, f"Health check failed: {response.status_code}"
    data = response.json()
    print(f"✓ Health check passed: {data['status']}")
    print(f"  Model: {data['embedding_model']}")
    print(f"  Vector dimensions: {data['vector_dimensions']}")
    return data

def test_root():
    """Test root endpoint."""
    print("\nTesting / endpoint...")
    response = requests.get(f"{AI_SERVICE_URL}/")
    assert response.status_code == 200
    data = response.json()
    print(f"✓ Root endpoint passed")
    print(f"  Available endpoints: {len(data['endpoints'])}")
    return data

def test_embedding():
    """Test embedding generation (prototype mode)."""
    print("\nTesting /embeddings/generate endpoint...")
    
    test_text = "This is a test sentence for embedding generation."
    payload = {
        "text": test_text,
        "model": "sentence-transformers/all-MiniLM-L6-v2"
    }
    
    response = requests.post(
        f"{AI_SERVICE_URL}/embeddings/generate",
        json=payload
    )
    
    assert response.status_code == 200, f"Embedding failed: {response.status_code} - {response.text}"
    
    data = response.json()
    assert "vector" in data, "Response missing 'vector' field"
    assert "dimensions" in data, "Response missing 'dimensions' field"
    assert data["dimensions"] == 384, f"Expected 384 dims, got {data['dimensions']}"
    assert len(data["vector"]) == 384, f"Vector length mismatch: {len(data['vector'])}"
    
    print(f"✓ Embedding generation passed")
    print(f"  Text: '{test_text}'")
    print(f"  Dimensions: {data['dimensions']}")
    print(f"  Model: {data['model']}")
    print(f"  Vector sample (first 5): {data['vector'][:5]}")
    
    # Test deterministic behavior (same text = same vector)
    response2 = requests.post(
        f"{AI_SERVICE_URL}/embeddings/generate",
        json=payload
    )
    data2 = response2.json()
    assert data["vector"] == data2["vector"], "Vectors should be deterministic!"
    print(f"✓ Deterministic check passed (same text → same vector)")
    
    return data

def test_generation_routes():
    """Test that generation routes return 501 (not implemented yet)."""
    print("\nTesting generation endpoints (should return 501)...")
    
    endpoints = [
        "/generate/summary",
        "/generate/keypoints",
        "/generate/quiz",
        "/generate/flashcards",
    ]
    
    test_payload = {"text": "Test text", "language": "en"}
    
    for endpoint in endpoints:
        response = requests.post(f"{AI_SERVICE_URL}{endpoint}", json=test_payload)
        assert response.status_code == 501, f"{endpoint} should return 501, got {response.status_code}"
        print(f"✓ {endpoint} correctly returns 501 (not implemented)")

if __name__ == "__main__":
    print("=" * 60)
    print("AI Service Validation Tests")
    print("=" * 60)
    
    try:
        test_health()
        test_root()
        test_embedding()
        test_generation_routes()
        
        print("\n" + "=" * 60)
        print("✓ All tests passed!")
        print("=" * 60)
        print("\nNext steps:")
        print("1. Test from PHP backend (AiService.php)")
        print("2. Create a material and trigger AI generation")
        print("3. Verify material_ai_embeddings row inserted")
        
    except AssertionError as e:
        print(f"\n✗ Test failed: {e}")
        exit(1)
    except requests.ConnectionError:
        print(f"\n✗ Could not connect to {AI_SERVICE_URL}")
        print("Make sure the ai-service container is running:")
        print("  docker compose up -d ai-service")
        exit(1)
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        exit(1)

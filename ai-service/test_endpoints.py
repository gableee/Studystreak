"""
Quick endpoint verification script for AI service.
Tests all major generation endpoints using FastAPI TestClient.
"""
from fastapi.testclient import TestClient
from main import app
import json

client = TestClient(app)

def print_section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")

# Sample text for testing
SAMPLE_TEXT = """
Machine Learning is a subset of artificial intelligence that enables computers to learn from data 
without being explicitly programmed. It uses algorithms to identify patterns and make predictions.

Deep Learning is a specialized subset of machine learning that uses neural networks with multiple 
layers. These networks can automatically learn hierarchical representations of data.

Supervised Learning involves training models on labeled data, where both input and output are known.
Common applications include classification and regression tasks.

Unsupervised Learning works with unlabeled data to discover hidden patterns or structures.
Clustering and dimensionality reduction are typical examples.

Reinforcement Learning trains agents to make decisions by rewarding desired behaviors and 
punishing undesired ones. It's commonly used in game AI and robotics.
"""

def test_health():
    print_section("Testing /health")
    response = client.get("/health")
    print(f"Status: {response.status_code}")
    print(json.dumps(response.json(), indent=2))
    assert response.status_code == 200
    return response.json()

def test_embeddings():
    print_section("Testing /embeddings/generate")
    payload = {
        "text": "Machine learning is transforming technology.",
        "model": "sentence-transformers/all-MiniLM-L6-v2"
    }
    response = client.post("/embeddings/generate", json=payload)
    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"Model: {data.get('model')}")
    print(f"Dimensions: {data.get('dimensions')}")
    print(f"Vector sample (first 5): {data.get('vector', [])[:5]}")
    assert response.status_code == 200
    assert data['dimensions'] == 384
    return data

def test_summary():
    print_section("Testing /generate/summary")
    payload = {
        "text": SAMPLE_TEXT,
        "language": "en",
        "max_words": 100
    }
    response = client.post("/generate/summary", json=payload)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Word Count: {data.get('word_count')}")
        print(f"Confidence: {data.get('confidence')}")
        print(f"Summary Preview:\n{data.get('summary', '')[:200]}...")
        return data
    else:
        print(f"Error: {response.text}")
        return None

def test_keypoints():
    print_section("Testing /generate/keypoints")
    payload = {
        "text": SAMPLE_TEXT,
        "language": "en"
    }
    response = client.post("/generate/keypoints", json=payload)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Count: {data.get('count')}")
        print(f"Confidence: {data.get('confidence')}")
        print("Key Points:")
        for i, kp in enumerate(data.get('keypoints', [])[:5], 1):
            print(f"  {i}. {kp}")
        return data
    else:
        print(f"Error: {response.text}")
        return None

def test_keypoints_v2():
    print_section("Testing /generate/keypoints/v2")
    payload = {
        "text": SAMPLE_TEXT,
        "language": "en"
    }
    response = client.post("/generate/keypoints/v2?page=1&page_size=5", json=payload)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Count: {data.get('count')}")
        print(f"Total Count: {data.get('totalCount')}")
        print(f"Confidence: {data.get('confidence')}")
        print("Structured Key Points:")
        for i, item in enumerate(data.get('items', [])[:3], 1):
            print(f"  {i}. {item.get('term')}: {item.get('definition', '')[:80]}...")
        return data
    else:
        print(f"Error: {response.text}")
        return None

def test_quiz():
    print_section("Testing /generate/quiz")
    payload = {
        "text": SAMPLE_TEXT,
        "language": "en",
        "difficulty": "normal",
        "question_type": "multiple-choice"
    }
    response = client.post("/generate/quiz?num_questions=3", json=payload)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Count: {data.get('count')}")
        print(f"Confidence: {data.get('confidence')}")
        print("Sample Question:")
        if data.get('questions'):
            q = data['questions'][0]
            print(f"  Q: {q.get('question')}")
            print(f"  Options: {q.get('options')}")
            print(f"  Answer: {q.get('correct_answer')}")
        return data
    else:
        print(f"Error: {response.text}")
        return None

def test_flashcards():
    print_section("Testing /generate/flashcards")
    payload = {
        "text": SAMPLE_TEXT,
        "language": "en"
    }
    response = client.post("/generate/flashcards?num_cards=5", json=payload)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Count: {data.get('count')}")
        print(f"Confidence: {data.get('confidence')}")
        print("Sample Flashcards:")
        for i, card in enumerate(data.get('flashcards', [])[:3], 1):
            print(f"  {i}. Front: {card.get('front', '')[:60]}...")
            print(f"     Back: {card.get('back', '')[:60]}...")
        return data
    else:
        print(f"Error: {response.text}")
        return None

def test_study_note():
    print_section("Testing /generate/study-note")
    payload = {
        "text": SAMPLE_TEXT,
        "language": "en",
        "max_words": 300
    }
    response = client.post("/generate/study-note", json=payload)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Word Count: {data.get('wordCount')}")
        print(f"Confidence: {data.get('confidence')}")
        print(f"Keypoints Count: {data.get('keypointsCount')}")
        print(f"Coverage %: {data.get('coveragePct')}")
        print(f"Rescued Terms Count: {data.get('rescuedTermsCount')}")
        print(f"Outline Items: {len(data.get('outline', []))}")
        print(f"Document Preview:\n{data.get('documentMarkdown', '')[:300]}...")
        return data
    else:
        print(f"Error: {response.text}")
        return None

if __name__ == "__main__":
    print("="*60)
    print("  AI Service Endpoint Verification")
    print("="*60)
    
    results = {}
    
    try:
        results['health'] = test_health()
        results['embeddings'] = test_embeddings()
        results['summary'] = test_summary()
        results['keypoints'] = test_keypoints()
        results['keypoints_v2'] = test_keypoints_v2()
        results['quiz'] = test_quiz()
        results['flashcards'] = test_flashcards()
        results['study_note'] = test_study_note()
        
        print_section("SUMMARY")
        passed = sum(1 for v in results.values() if v is not None)
        total = len(results)
        print(f"✓ {passed}/{total} endpoints verified successfully")
        
        if passed < total:
            print("\n⚠️  Some endpoints failed. Check logs above for details.")
        else:
            print("\n✅ All endpoints working correctly!")
            
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()

"""
Example client script for StudyStreak AI Service.
Demonstrates how to generate StudyTools from content or uploaded files.
"""

import requests
import json

# AI Service URL
AI_SERVICE_URL = "http://localhost:8000"


def test_health():
    """Test if AI service is available."""
    print("=" * 60)
    print("Testing AI Service Health")
    print("=" * 60)
    
    response = requests.get(f"{AI_SERVICE_URL}/health")
    
    if response.status_code == 200:
        data = response.json()
        print("✅ Service is healthy")
        print(f"  Ollama available: {data['ollama_available']}")
        print(f"  Ollama model: {data['ollama_model']}")
        print()
        return True
    else:
        print("❌ Service is not available")
        return False


def generate_from_text():
    """Generate StudyTools from direct text content."""
    print("=" * 60)
    print("Generating StudyTools from Text Content")
    print("=" * 60)
    
    content = """
    Machine Learning is a subset of artificial intelligence that enables systems
    to learn and improve from experience without being explicitly programmed.
    
    Key types of machine learning include:
    
    1. Supervised Learning: The algorithm learns from labeled training data,
       making predictions or decisions based on input-output pairs.
       Examples: Linear regression, decision trees, neural networks.
    
    2. Unsupervised Learning: The algorithm finds patterns in unlabeled data,
       discovering hidden structures without predefined categories.
       Examples: K-means clustering, principal component analysis (PCA).
    
    3. Reinforcement Learning: The algorithm learns by interacting with an
       environment, receiving rewards or penalties for actions taken.
       Examples: Q-learning, deep Q-networks (DQN), policy gradients.
    
    Deep Learning is a specialized type of machine learning that uses neural
    networks with multiple layers (deep neural networks). It excels at processing
    unstructured data like images, text, and audio. Common architectures include
    Convolutional Neural Networks (CNNs) for image processing and Recurrent
    Neural Networks (RNNs) for sequential data.
    
    Applications of machine learning span many fields:
    - Computer Vision: Image classification, object detection, facial recognition
    - Natural Language Processing: Sentiment analysis, translation, chatbots
    - Healthcare: Disease diagnosis, drug discovery, patient monitoring
    - Finance: Fraud detection, algorithmic trading, risk assessment
    - Autonomous Systems: Self-driving cars, robotics, drones
    """
    
    payload = {
        "content": content,
        "assignment": "Create comprehensive study materials about Machine Learning",
        "num_quiz_questions": 5,
        "num_flashcards": 8
    }
    
    print("Sending request to AI service...")
    print(f"Content length: {len(content)} characters")
    print()
    
    response = requests.post(
        f"{AI_SERVICE_URL}/generate/studytools",
        json=payload,
        timeout=180
    )
    
    if response.status_code == 200:
        data = response.json()
        
        if data.get('success'):
            studytools = data['studytools']
            
            print("✅ Generation successful!\n")
            
            # Display summary
            summary = studytools['summary']
            print("📝 SUMMARY")
            print("-" * 60)
            print(summary['content'][:300] + "...")
            print(f"\nWord count: {summary['word_count']}")
            print(f"Reading time: {summary['reading_time']}")
            print()
            
            # Display keypoints
            keypoints = studytools['keypoints']
            print(f"🔑 KEYPOINTS ({len(keypoints)} topics)")
            print("-" * 60)
            for kp in keypoints[:2]:  # Show first 2 topics
                print(f"\n📚 {kp['topic']}")
                for term in kp['terms'][:3]:  # Show first 3 terms
                    print(f"  • {term['term']} ({term['importance']})")
                    print(f"    {term['definition'][:100]}...")
            print()
            
            # Display quiz
            quiz = studytools['quiz']
            print(f"❓ QUIZ ({len(quiz)} questions)")
            print("-" * 60)
            for i, q in enumerate(quiz[:2], 1):  # Show first 2 questions
                print(f"\nQ{i}. {q['question']}")
                for opt in q['options']:
                    print(f"    {opt}")
                print(f"  Answer: {q['answer']}")
                print(f"  Difficulty: {q['difficulty']}")
            print()
            
            # Display flashcards
            flashcards = studytools['flashcards']
            print(f"🗂️  FLASHCARDS ({len(flashcards)} cards)")
            print("-" * 60)
            for i, fc in enumerate(flashcards[:3], 1):  # Show first 3 cards
                print(f"\nCard {i} [{fc['category']}]")
                print(f"  Q: {fc['Q']}")
                print(f"  A: {fc['A'][:100]}...")
            print()
            
            # Display metadata
            metadata = studytools['metadata']
            print("📊 METADATA")
            print("-" * 60)
            print(f"Total score: {metadata['total_score']}")
            print(f"Completion time: {metadata['completion_time']}")
            print(f"Difficulty level: {metadata['difficulty_level']}")
            print(f"Progress: {metadata['progress']}")
            print()
            
            return True
        else:
            print("❌ Generation failed")
            print(f"Error: {data.get('error')}")
            return False
    else:
        print(f"❌ Request failed with status {response.status_code}")
        print(response.text)
        return False


def generate_summary_only():
    """Generate only summary."""
    print("=" * 60)
    print("Generating Summary Only")
    print("=" * 60)
    
    content = """
    Photosynthesis is the process by which green plants and some other organisms
    use sunlight to synthesize nutrients from carbon dioxide and water.
    Photosynthesis in plants generally involves the green pigment chlorophyll
    and generates oxygen as a by-product.
    """
    
    payload = {
        "content": content,
        "assignment": "Summarize photosynthesis"
    }
    
    response = requests.post(
        f"{AI_SERVICE_URL}/generate/summary",
        json=payload,
        timeout=60
    )
    
    if response.status_code == 200:
        data = response.json()
        summary = data['summary']
        
        print("✅ Summary generated\n")
        print(summary['content'])
        print(f"\nWord count: {summary['word_count']}")
        print(f"Reading time: {summary['reading_time']}")
        print()
        return True
    else:
        print(f"❌ Request failed: {response.status_code}")
        return False


def generate_from_supabase_file():
    """Generate StudyTools from file in Supabase storage."""
    print("=" * 60)
    print("Generating from Supabase File")
    print("=" * 60)
    
    # Example: assumes you have a file uploaded to Supabase
    payload = {
        "supabase_file_path": "user123/lecture-notes.pdf",
        "assignment": "Create study materials from lecture notes",
        "num_quiz_questions": 8,
        "num_flashcards": 12
    }
    
    print("Note: This requires valid SUPABASE_URL and SUPABASE_KEY in .env")
    print(f"File path: {payload['supabase_file_path']}")
    print()
    
    response = requests.post(
        f"{AI_SERVICE_URL}/generate/studytools",
        json=payload,
        timeout=180
    )
    
    if response.status_code == 200:
        data = response.json()
        if data.get('success'):
            print("✅ Generation from Supabase file successful")
            return True
        else:
            print(f"❌ Generation failed: {data.get('error')}")
            return False
    else:
        print(f"❌ Request failed: {response.status_code}")
        print(response.text)
        return False


def main():
    """Run example client demonstrations."""
    print("\n🚀 StudyStreak AI Service - Example Client\n")
    
    # Test health
    if not test_health():
        print("❌ AI service is not available. Please start it first:")
        print("  cd ai-service")
        print("  python main.py")
        return
    
    # Generate from text
    print("\n" + "=" * 60)
    input("Press Enter to generate StudyTools from text content...")
    generate_from_text()
    
    # Generate summary only
    print("\n" + "=" * 60)
    input("Press Enter to generate summary only...")
    generate_summary_only()
    
    # Note about Supabase integration
    print("\n" + "=" * 60)
    print("To test Supabase file integration:")
    print("1. Configure SUPABASE_URL and SUPABASE_KEY in .env")
    print("2. Upload a file to the 'learning-materials-v2' bucket")
    print("3. Use the file path in the request")
    print("=" * 60)
    
    print("\n✅ Examples completed!\n")


if __name__ == "__main__":
    main()

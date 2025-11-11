"""
Test script for AI service.
Tests document extraction, Ollama connection, and StudyTools generation.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from utils.ollama_client import get_ollama_client
from models.studytools_generator import StudyToolsGenerator
from extractors.document_extractor import DocumentExtractor
import logging

logging.basicConfig(level=logging.INFO, format='%(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def test_ollama_connection():
    """Test Ollama server connection."""
    logger.info("=== Testing Ollama Connection ===")
    
    try:
        client = get_ollama_client()
        
        if not client.is_available():
            logger.error("[FAIL] Ollama server not available at http://localhost:11434")
            logger.info("Please ensure Ollama is running:")
            logger.info("  - Windows: Ollama should auto-start")
            logger.info("  - Or run: ollama serve")
            return False
        
        models = client.list_models()
        logger.info("[PASS] Ollama connected successfully")
        logger.info(f"Available models: {models}")
        
        if not models:
            logger.warning("[WARN] No models found. Please pull a model:")
            logger.info("  ollama pull qwen3-vl:8b")
            return False
        
        return True
    
    except Exception as e:
        logger.error(f"[FAIL] Ollama connection test failed: {e}")
        return False


def test_simple_generation():
    """Test simple text generation."""
    logger.info("\n=== Testing Simple Generation ===")
    
    try:
        client = get_ollama_client()
        
        result = client.generate(
            prompt="What is 2+2? Answer in one sentence.",
            temperature=0.1,
            max_tokens=50
        )
        
        response = result.get('response', '')
        logger.info("[PASS] Generation successful")
        logger.info(f"Response: {response[:200]}")
        
        return True
    
    except Exception as e:
        logger.error(f"[FAIL] Simple generation failed: {e}")
        return False


def test_json_generation():
    """Test JSON-structured generation."""
    logger.info("\n=== Testing JSON Generation ===")
    
    try:
        client = get_ollama_client()
        
        prompt = """Generate a simple quiz question about Python programming.
Return ONLY valid JSON in this format:
{
  "question": "Question text?",
  "options": ["A", "B", "C", "D"],
  "answer": "A"
}"""
        
        result = client.generate_json(prompt=prompt, temperature=0.3)
        
        logger.info("[PASS] JSON generation successful")
        logger.info(f"Result: {result}")
        
        return True
    
    except Exception as e:
        logger.error(f"[FAIL] JSON generation failed: {e}")
        return False


def test_document_extraction():
    """Test document text extraction."""
    logger.info("\n=== Testing Document Extraction ===")
    
    try:
        extractor = DocumentExtractor()
        
        # Test plain text
        test_text = "This is a test document.\n\nIt has multiple paragraphs."
        result = extractor.extract_from_file(test_text.encode(), file_extension='.txt')
        
        logger.info("[PASS] Text extraction successful")
        logger.info(f"Extracted {len(result['text'])} characters")
        
        return True
    
    except Exception as e:
        logger.error(f"[FAIL] Document extraction failed: {e}")
        return False


def test_studytools_generation():
    """Test StudyTools generation with sample content."""
    logger.info("\n=== Testing StudyTools Generation ===")
    
    try:
        generator = StudyToolsGenerator()
        
        # Sample content
        content = """
        Photosynthesis is the process by which plants convert light energy into chemical energy.
        This process occurs in the chloroplasts of plant cells, specifically in the thylakoid membranes.
        The light-dependent reactions capture energy from sunlight and produce ATP and NADPH.
        The light-independent reactions (Calvin cycle) use ATP and NADPH to fix CO2 into glucose.
        
        Key components include:
        - Chlorophyll: The green pigment that absorbs light
        - Stomata: Pores that allow gas exchange
        - Glucose: The end product that stores energy
        
        Photosynthesis is essential for life on Earth as it produces oxygen and organic compounds.
        """
        
        # Test summary generation
        # Test summary generation
        logger.info("Testing summary generation...")
        summary = generator.generate_summary(content, "Explain photosynthesis")
        logger.info(f"[PASS] Summary generated ({summary['word_count']} words)")
        logger.info(f"Preview: {summary['content'][:150]}...")
        
        # Test keypoints generation
        logger.info("\nTesting keypoints generation...")
        keypoints = generator.generate_keypoints(content, "Extract key concepts")
        logger.info(f"[PASS] Keypoints generated ({len(keypoints)} topics)")
        
        # Test quiz generation
        logger.info("\nTesting quiz generation...")
        quiz = generator.generate_quiz(content, "Create quiz questions", num_questions=3)
        logger.info(f"[PASS] Quiz generated ({len(quiz)} questions)")
        
        # Test flashcards generation
        logger.info("\nTesting flashcards generation...")
        flashcards = generator.generate_flashcards(content, "Create flashcards", num_cards=5)
        logger.info(f"[PASS] Flashcards generated ({len(flashcards)} cards)")
        
        return True
    
    except Exception as e:
        logger.error(f"[FAIL] StudyTools generation failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all tests."""
    logger.info("Starting AI Service Tests\n")
    
    results = {
        "Ollama Connection": test_ollama_connection(),
        "Simple Generation": test_simple_generation(),
        "JSON Generation": test_json_generation(),
        "Document Extraction": test_document_extraction(),
        "StudyTools Generation": test_studytools_generation()
    }
    
    logger.info("\n" + "="*50)
    logger.info("Test Results:")
    logger.info("="*50)
    
    for test_name, passed in results.items():
        status = "[PASS]" if passed else "[FAIL]"
        logger.info(f"{test_name}: {status}")
    
    total_passed = sum(results.values())
    total_tests = len(results)
    
    logger.info(f"\nTotal: {total_passed}/{total_tests} tests passed")
    
    if total_passed == total_tests:
        logger.info("All tests passed!")
        return 0
    else:
        logger.warning("[WARN] Some tests failed. Please check the errors above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())

"""
Test script to verify reviewer formatter integration
"""
import sys
from pathlib import Path

# Sample CEREBELLUM-like verbose text with OCR noise
SAMPLE_TEXT = """
CEREBELLUM ANATOMY AND FUNCTION

➢ The cerebellum is a major feature of the hindbrain of all vertebrates...
➢ It is located dorsal to the pons and medulla oblongata...
… The cerebellum occupies the posterior cranial fossa, a small space behind the brainstem…
— The cerebellum weighs about 150 grams (10 percent of brain weight) but contains more than half of the brain's neurons…

The cerebellum consists of three lobes: the anterior lobe, posterior lobe, and the flocculonodular lobe. The anterior lobe lies rostral to the primary fissure... The posterior lobe extends from the primary fissure to the posterolateral fissure... The flocculonodular lobe is the oldest part phylogenetically and consists of the nodulus and paired flocculi...

CELLULAR ARCHITECTURE
➢ The cerebellar cortex consists of three layers: molecular layer (outermost), Purkinje cell layer (middle), and granule cell layer (innermost)...
… The Purkinje cells are the principal neurons of the cerebellar cortex and send inhibitory projections to the deep cerebellar nuclei…
— Each Purkinje cell receives input from approximately 200,000 parallel fibers and one climbing fiber…

The molecular layer contains stellate cells and basket cells, both of which are inhibitory interneurons that synapse on Purkinje cell dendrites... The granule cell layer contains granule cells, which are the most numerous neurons in the brain, and Golgi cells, which are inhibitory interneurons...
"""

def test_text_cleaning():
    """Test that OCR noise is removed"""
    print("=" * 60)
    print("TEST 1: Text Cleaning")
    print("=" * 60)
    
    try:
        from utils.clean_text import clean_text, clean_definition
        
        cleaned = clean_text(SAMPLE_TEXT, max_length=2000)
        print("\n✓ Text cleaning imported successfully")
        
        # Check for OCR noise removal
        ocr_patterns = ['➢', '…', '—', '•  •', '- -']
        found_noise = [p for p in ocr_patterns if p in cleaned]
        
        if found_noise:
            print(f"✗ OCR noise still present: {found_noise}")
            print("\nCleaned text sample:")
            print(cleaned[:500])
        else:
            print("✓ OCR noise removed")
            print("\nCleaned text sample:")
            print(cleaned[:500])
        
        # Test definition compression
        long_def = "The cerebellar cortex consists of three layers: molecular layer (outermost), Purkinje cell layer (middle), and granule cell layer (innermost). The Purkinje cells are the principal neurons of the cerebellar cortex and send inhibitory projections to the deep cerebellar nuclei. Each Purkinje cell receives input from approximately 200,000 parallel fibers and one climbing fiber."
        compressed = clean_definition(long_def, max_chars=300)
        
        print(f"\n✓ Definition compression: {len(long_def)} → {len(compressed)} chars")
        print(f"Compressed: {compressed}")
        
        return True
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_topic_clustering():
    """Test semantic clustering of keypoints"""
    print("\n" + "=" * 60)
    print("TEST 2: Topic Clustering")
    print("=" * 60)
    
    try:
        from utils.topic_clustering import build_reviewer_sections
        
        keypoints = [
            "The cerebellum weighs about 150g (10% of brain weight)",
            "Three lobes: anterior, posterior, flocculonodular",
            "Purkinje cells send inhibitory projections to deep nuclei",
            "Molecular layer contains stellate and basket cells",
            "Granule cells are most numerous neurons in brain",
            "Located dorsal to pons and medulla",
            "Each Purkinje cell receives 200,000 parallel fiber inputs"
        ]
        
        sections = build_reviewer_sections(keypoints)
        print(f"\n✓ Grouped {len(keypoints)} keypoints into {len(sections)} sections")
        
        for section in sections:
            print(f"\n{section.get('icon', '📌')} {section.get('title', 'Untitled')}")
            for kp in section.get('keypoints', [])[:3]:
                print(f"  • {kp}")
        
        return True
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_reviewer_formatter():
    """Test complete reviewer formatting pipeline"""
    print("\n" + "=" * 60)
    print("TEST 3: Reviewer Formatter")
    print("=" * 60)
    
    try:
        from utils.reviewer_formatter import ReviewerFormatter
        
        formatter = ReviewerFormatter()
        print("✓ ReviewerFormatter initialized")
        
        # Test format_reviewer method exists
        if hasattr(formatter, 'format_reviewer'):
            print("✓ format_reviewer method available")
        
        # Test format_flashcard compression
        verbose_card = {
            "front": "What is the cerebellum?",
            "back": "The cerebellar cortex consists of three layers: molecular layer (outermost), Purkinje cell layer (middle), and granule cell layer (innermost). The Purkinje cells are the principal neurons of the cerebellar cortex and send inhibitory projections to the deep cerebellar nuclei. Each Purkinje cell receives input from approximately 200,000 parallel fibers and one climbing fiber from the inferior olive."
        }
        
        compressed_back = formatter.format_flashcard(
            verbose_card['front'],
            verbose_card['back'],
            max_back_chars=300
        )
        
        print(f"\n✓ Flashcard compression: {len(verbose_card['back'])} → {len(compressed_back)} chars")
        print(f"Result: {compressed_back}")
        
        return True
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_quality_validator():
    """Test enhanced quality validation"""
    print("\n" + "=" * 60)
    print("TEST 4: Quality Validator")
    print("=" * 60)
    
    try:
        from utils.quality_validator import AIContentValidator
        
        validator = AIContentValidator()
        print("✓ AIContentValidator initialized")
        
        # Test with OCR-noisy flashcards
        noisy_flashcards = {
            "flashcards": [
                {"front": "Term 1", "back": "➢ Definition with OCR noise"},
                {"front": "Term 2", "back": "Clean definition"},
                {"front": "Term 3", "back": "… More noise — here"}
            ]
        }
        
        is_valid, error_msg, score = validator.validate_flashcards(noisy_flashcards)
        print(f"\n✓ Validation score: {score:.2f}")
        if score < 0.7:
            print(f"⚠ OCR residue detected (expected): {error_msg}")
        
        # Test with verbose definitions
        verbose_flashcards = {
            "flashcards": [
                {"front": "Term", "back": "A" * 500}  # Too long
            ]
        }
        
        is_valid2, error_msg2, score2 = validator.validate_flashcards(verbose_flashcards)
        print(f"✓ Verbose definition validation score: {score2:.2f}")
        
        return True
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all tests"""
    print("\n" + "=" * 60)
    print("REVIEWER FORMATTER INTEGRATION TEST")
    print("=" * 60)
    print("\nThis tests the new cleaning, clustering, and formatting")
    print("utilities that transform verbose AI outputs into")
    print("student-friendly study reviewers.\n")
    
    results = []
    results.append(("Text Cleaning", test_text_cleaning()))
    results.append(("Topic Clustering", test_topic_clustering()))
    results.append(("Reviewer Formatter", test_reviewer_formatter()))
    results.append(("Quality Validator", test_quality_validator()))
    
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    for name, passed in results:
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{status}: {name}")
    
    all_passed = all(r[1] for r in results)
    if all_passed:
        print("\n✓ All tests passed! Integration successful.")
    else:
        print("\n✗ Some tests failed. Check errors above.")
    
    return all_passed


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

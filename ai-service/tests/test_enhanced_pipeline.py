"""
Test script for enhanced reviewer generation pipeline.
Demonstrates concept detection, formatting, and quality validation.
"""

import sys
from pathlib import Path

# Add ai-service to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.concept_detector import ConceptDetector, ConceptType
from utils.structured_formatter import StructuredFormatter, ReviewerDocumentBuilder
from utils.enhanced_quality_validator import validate_reviewer_quality


def test_concept_detection():
    """Test automatic concept detection and separation."""
    print("=" * 60)
    print("TEST 1: Concept Detection & Separation")
    print("=" * 60)
    
    detector = ConceptDetector()
    
    test_cases = [
        # Merged concepts
        ("Data and Information: Raw facts without meaning", "Merged Concepts"),
        
        # Comparison
        ("Array vs Linked List: Contiguous memory vs dynamic allocation", "Comparison"),
        
        # Type list
        ("Types of Databases: Relational, NoSQL, Graph", "Type List"),
        
        # Definition
        ("DBMS is a software system that manages databases", "Definition"),
    ]
    
    for text, label in test_cases:
        print(f"\n📝 Input ({label}): {text}")
        concepts = detector.detect_concepts(text)
        print(f"✅ Detected {len(concepts)} concept(s):")
        for i, concept in enumerate(concepts, 1):
            print(f"   {i}. {concept.term} ({concept.concept_type.value})")
            print(f"      → {concept.definition[:80]}...")
    
    print("\n" + "=" * 60)


def test_structured_formatting():
    """Test structured formatting templates."""
    print("\n" + "=" * 60)
    print("TEST 2: Structured Formatting")
    print("=" * 60)
    
    detector = ConceptDetector()
    formatter = StructuredFormatter()
    
    # Test case: Medical comparison
    text = "Hypertension and Hypotension: High blood pressure vs low blood pressure"
    print(f"\n📝 Input: {text}")
    
    concepts = detector.detect_concepts(text)
    print(f"\n✅ Formatted Output:\n")
    
    for concept in concepts:
        formatted = formatter.format_concept(concept, style='markdown')
        print(formatted)
        print()
    
    print("=" * 60)


def test_domain_examples():
    """Test domain-specific examples."""
    print("\n" + "=" * 60)
    print("TEST 3: Domain-Specific Examples")
    print("=" * 60)
    
    detector = ConceptDetector()
    formatter = StructuredFormatter()
    builder = ReviewerDocumentBuilder()
    
    domains = {
        "Medicine": "The cerebral cortex and brainstem: The cortex handles higher functions while the brainstem controls vital reflexes",
        "Law": "Types of Legal Remedies: Compensatory damages, Punitive damages, Equitable relief",
        "Computer Science": "Bubble Sort vs Quick Sort: Simple algorithm vs divide-and-conquer algorithm",
    }
    
    for domain, text in domains.items():
        print(f"\n📚 Domain: {domain}")
        print(f"📝 Input: {text}")
        
        concepts = detector.detect_concepts(text)
        document = builder.build_document(concepts, title=f"{domain} Concepts", group_by_type=True)
        
        print(f"\n✅ Generated Document:\n")
        print(document[:300] + "..." if len(document) > 300 else document)
        print()
    
    print("=" * 60)


def test_quality_validation():
    """Test quality validation with scoring."""
    print("\n" + "=" * 60)
    print("TEST 4: Quality Validation")
    print("=" * 60)
    
    # Good reviewer
    good_reviewer = {
        "topics": [
            {
                "title": "Definitions",
                "icon": "📖",
                "keypoints": [
                    "**Data:** Raw facts without meaning or context",
                    "**Information:** Processed data with meaning and context",
                    "**Database:** Organized collection of structured data"
                ]
            },
            {
                "title": "Comparisons",
                "icon": "⚖️",
                "keypoints": [
                    "**SQL vs NoSQL:** Structured relational vs flexible document-based storage"
                ]
            }
        ],
        "documentMarkdown": "## 📖 Definitions\n- **Data:** Raw facts\n\n## ⚖️ Comparisons\n- **SQL vs NoSQL**"
    }
    
    # Poor reviewer (merged concepts, no structure)
    poor_reviewer = {
        "topics": [
            {
                "title": "Concepts",
                "icon": "",
                "keypoints": [
                    "Data and Information",  # Merged
                    "Key concept from the material"  # Generic
                ]
            }
        ],
        "documentMarkdown": "Concepts\nData and Information\nKey concept"
    }
    
    print("\n📊 Testing GOOD Reviewer:")
    metrics = validate_reviewer_quality(good_reviewer)
    print(f"   Overall Score: {metrics['overall']:.1f}/10")
    print(f"   Accuracy: {metrics['accuracy']:.1f}/10")
    print(f"   Clarity: {metrics['clarity']:.1f}/10")
    print(f"   Separation: {metrics['separation']:.1f}/10")
    print(f"   Structure: {metrics['structure']:.1f}/10")
    print(f"   Acceptable: {metrics['is_acceptable']}")
    
    print("\n📊 Testing POOR Reviewer:")
    metrics = validate_reviewer_quality(poor_reviewer)
    print(f"   Overall Score: {metrics['overall']:.1f}/10")
    print(f"   Accuracy: {metrics['accuracy']:.1f}/10")
    print(f"   Clarity: {metrics['clarity']:.1f}/10")
    print(f"   Separation: {metrics['separation']:.1f}/10")
    print(f"   Structure: {metrics['structure']:.1f}/10")
    print(f"   Acceptable: {metrics['is_acceptable']}")
    
    if metrics['issues']:
        print(f"\n   Issues Found:")
        for issue in metrics['issues']:
            print(f"      ⚠️  {issue}")
    
    if metrics['recommendations']:
        print(f"\n   Recommendations:")
        for rec in metrics['recommendations']:
            print(f"      💡 {rec}")
    
    print("\n" + "=" * 60)


def test_end_to_end():
    """Test complete pipeline end-to-end."""
    print("\n" + "=" * 60)
    print("TEST 5: End-to-End Pipeline")
    print("=" * 60)
    
    # Sample text (simulating extracted PDF content)
    sample_text = """
    Database Management System
    
    A Database Management System (DBMS) is software that manages databases.
    
    Types of DBMS:
    1. Relational DBMS (SQL)
    2. NoSQL DBMS (Document, Key-Value)
    3. Graph DBMS
    
    SQL vs NoSQL: Structured schema vs flexible schema. SQL uses tables and rows, 
    while NoSQL uses documents or key-value pairs.
    
    Primary Key and Foreign Key: Primary key uniquely identifies a record. 
    Foreign key creates relationships between tables.
    """
    
    print("📝 Input Text (simulated PDF extraction):")
    print(sample_text[:200] + "...\n")
    
    # Step 1: Detect concepts
    detector = ConceptDetector()
    formatter = StructuredFormatter()
    builder = ReviewerDocumentBuilder()
    
    # Split into segments
    segments = [s.strip() for s in sample_text.split('\n\n') if s.strip()]
    
    all_concepts = []
    for segment in segments:
        if len(segment.split()) >= 5:  # Skip short segments
            concepts = detector.detect_concepts(segment)
            all_concepts.extend(concepts)
    
    print(f"✅ Step 1: Detected {len(all_concepts)} concepts\n")
    
    # Step 2: Build document
    document = builder.build_document(all_concepts, title="DBMS Reviewer", group_by_type=True)
    
    print("✅ Step 2: Generated Reviewer Document:\n")
    print(document)
    print()
    
    # Step 3: Validate quality
    reviewer_data = {
        "topics": [{"title": t.split('\n')[0].replace('#', '').strip(), "keypoints": []} for t in document.split('##') if t.strip()],
        "documentMarkdown": document
    }
    
    metrics = validate_reviewer_quality(reviewer_data)
    
    print("✅ Step 3: Quality Validation:")
    print(f"   Overall Score: {metrics['overall']:.1f}/10")
    print(f"   Acceptable: {'✅ YES' if metrics['is_acceptable'] else '❌ NO'}")
    
    print("\n" + "=" * 60)


if __name__ == "__main__":
    print("\n" + "🚀 StudyStreak AI Service — Enhanced Reviewer Pipeline Tests")
    print("=" * 60)
    
    try:
        test_concept_detection()
        test_structured_formatting()
        test_domain_examples()
        test_quality_validation()
        test_end_to_end()
        
        print("\n✅ All tests completed successfully!")
        print("\nTo run this test:")
        print("  cd ai-service")
        print("  python tests/test_enhanced_pipeline.py")
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()

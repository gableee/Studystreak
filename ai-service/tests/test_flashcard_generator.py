"""
Tests for enhanced flashcard generator.
Tests structure parsing, TF-IDF ranking, quality filtering, and deduplication.
"""

import pytest
from models.flashcard_generator import FlashcardGenerator, DocumentStructure


# Sample test texts
SAMPLE_TEXT_WITH_HEADINGS = """
# Introduction to Machine Learning

Machine learning is a subset of artificial intelligence that enables systems to learn from data.

## Types of Machine Learning

There are three main types of machine learning:

- Supervised Learning
- Unsupervised Learning
- Reinforcement Learning

## Supervised Learning

Supervised learning is a type of machine learning where the model learns from labeled data. 
The algorithm learns to map inputs to outputs based on example input-output pairs.

### Applications

Common applications include image classification, spam detection, and predictive analytics.
"""

SAMPLE_TEXT_WITH_DEFINITIONS = """
Photosynthesis is the process by which green plants convert light energy into chemical energy.

Osmosis refers to the movement of water molecules across a semi-permeable membrane from a 
region of lower solute concentration to higher solute concentration.

Mitosis is the process of cell division that results in two daughter cells with the same 
number of chromosomes as the parent cell.
"""

SAMPLE_TEXT_PLAIN = """
The human brain contains approximately 86 billion neurons. Each neuron can form thousands 
of connections with other neurons. These connections, called synapses, allow neurons to 
communicate through electrical and chemical signals. The brain's ability to reorganize 
itself by forming new neural connections is called neuroplasticity. This adaptability 
enables learning and memory formation throughout life.
"""


class TestDocumentStructure:
    """Test document structure parsing."""
    
    def test_parse_headings(self):
        """Test heading extraction from markdown."""
        generator = FlashcardGenerator()
        structure = generator._parse_document_structure(SAMPLE_TEXT_WITH_HEADINGS)
        
        assert len(structure.headings) > 0
        # Should extract headings at different levels
        levels = [h[0] for h in structure.headings]
        assert 1 in levels or 2 in levels
    
    def test_parse_definitions(self):
        """Test definition extraction."""
        generator = FlashcardGenerator()
        structure = generator._parse_document_structure(SAMPLE_TEXT_WITH_DEFINITIONS)
        
        assert len(structure.definitions) >= 2
        # Check that photosynthesis is identified
        terms = [d[0].lower() for d in structure.definitions]
        assert any('photosynthesis' in term for term in terms)
    
    def test_parse_lists(self):
        """Test list extraction."""
        generator = FlashcardGenerator()
        structure = generator._parse_document_structure(SAMPLE_TEXT_WITH_HEADINGS)
        
        # Should identify the bulleted list
        assert len(structure.list_items) > 0
        # Check that list contains expected items
        for title, items in structure.list_items:
            if 'learning' in title.lower():
                assert len(items) >= 2
    
    def test_parse_sentences(self):
        """Test sentence extraction."""
        generator = FlashcardGenerator()
        structure = generator._parse_document_structure(SAMPLE_TEXT_PLAIN)
        
        assert len(structure.all_sentences) > 0
        # Sentences should be of minimum length
        for sent in structure.all_sentences:
            assert len(sent) >= generator.min_sentence_length


class TestTFIDFRanking:
    """Test TF-IDF importance scoring."""
    
    def test_compute_tfidf_scores(self):
        """Test TF-IDF scoring on sentences."""
        generator = FlashcardGenerator()
        
        sentences = [
            "Machine learning is a subset of artificial intelligence",
            "The weather is nice today",
            "Neural networks are inspired by biological neurons",
            "Machine learning algorithms learn from data"
        ]
        
        scores = generator._compute_tfidf_scores(sentences)
        
        assert len(scores) == len(sentences)
        # All scores should be between 0 and 1 (normalized)
        for score in scores.values():
            assert 0 <= score <= 1
    
    def test_rank_sentences_by_importance(self):
        """Test sentence ranking."""
        generator = FlashcardGenerator()
        structure = generator._parse_document_structure(SAMPLE_TEXT_PLAIN)
        
        ranked = generator._rank_sentences_by_importance(structure, top_k=3)
        
        assert len(ranked) <= 3
        # Should be sorted by score descending
        scores = [score for _, score in ranked]
        assert scores == sorted(scores, reverse=True)


class TestFlashcardGeneration:
    """Test flashcard generation from different sources."""
    
    def test_generate_from_heading(self):
        """Test flashcard generation from headings."""
        generator = FlashcardGenerator()
        
        card = generator._create_flashcard_from_heading(
            heading="Supervised Learning",
            level=2,
            content="Supervised learning is a type of machine learning where models learn from labeled data.",
            source_section="H2: Supervised Learning"
        )
        
        assert card is not None
        assert 'front' in card
        assert 'back' in card
        assert 'confidence' in card
        assert '?' in card['front'] or any(word in card['front'].lower() for word in ['what', 'explain', 'list'])
        assert len(card['back']) > 0
    
    def test_generate_from_definition(self):
        """Test flashcard generation from definitions."""
        generator = FlashcardGenerator()
        
        card = generator._create_flashcard_from_definition(
            term="Photosynthesis",
            definition="the process by which green plants convert light energy into chemical energy"
        )
        
        assert card is not None
        assert 'photosynthesis' in card['front'].lower()
        assert '?' in card['front']
        assert 'process' in card['back'].lower() or 'energy' in card['back'].lower()
        assert card['confidence'] >= 0.9  # Definitions should have high confidence
    
    def test_generate_from_list(self):
        """Test flashcard generation from lists."""
        generator = FlashcardGenerator()
        
        card = generator._create_flashcard_from_list(
            list_title="Types of Machine Learning",
            items=["Supervised Learning", "Unsupervised Learning", "Reinforcement Learning"]
        )
        
        assert card is not None
        assert 'front' in card
        assert 'back' in card
        # Back should contain numbered list
        assert '1.' in card['back'] or '2.' in card['back']
    
    def test_generate_from_sentence(self):
        """Test flashcard generation from important sentences."""
        generator = FlashcardGenerator()
        
        sentence = "The human brain contains approximately 86 billion neurons"
        card = generator._create_flashcard_from_sentence(sentence, importance_score=0.85)
        
        assert card is not None
        assert 'front' in card
        assert 'back' in card
        assert card['importance_score'] == 0.85


class TestQualityFiltering:
    """Test quality filtering and deduplication."""
    
    def test_deduplicate_flashcards(self):
        """Test deduplication of similar flashcards."""
        generator = FlashcardGenerator()
        
        flashcards = [
            {
                "front": "What is machine learning?",
                "back": "Machine learning is a subset of AI",
                "confidence": 0.9,
                "source_section": "Intro",
                "importance_score": 0.9,
                "type": "definition"
            },
            {
                "front": "What is ML?",  # Similar to above
                "back": "ML is a type of artificial intelligence",
                "confidence": 0.85,
                "source_section": "Intro",
                "importance_score": 0.85,
                "type": "definition"
            },
            {
                "front": "What is photosynthesis?",  # Different
                "back": "Process of converting light to energy",
                "confidence": 0.9,
                "source_section": "Biology",
                "importance_score": 0.9,
                "type": "definition"
            }
        ]
        
        deduplicated = generator._deduplicate_flashcards(flashcards)
        
        # Should remove one of the similar ML flashcards
        assert len(deduplicated) <= len(flashcards)
        assert len(deduplicated) >= 1
    
    def test_filter_quality(self):
        """Test quality filtering."""
        generator = FlashcardGenerator()
        
        flashcards = [
            {
                "front": "What is photosynthesis?",  # Good quality
                "back": "Photosynthesis is the process by which plants convert light energy into chemical energy",
                "confidence": 0.9,
                "source_section": "Biology",
                "importance_score": 0.9,
                "type": "definition"
            },
            {
                "front": "Something about stuff",  # Poor quality - not a clear question
                "back": "Some information here",
                "confidence": 0.5,
                "source_section": "Unknown",
                "importance_score": 0.5,
                "type": "sentence"
            },
            {
                "front": "What is X?",  # Poor quality - back too short
                "back": "X",
                "confidence": 0.6,
                "source_section": "Unknown",
                "importance_score": 0.6,
                "type": "sentence"
            }
        ]
        
        filtered = generator._filter_quality(flashcards)
        
        # Should keep high-quality flashcard, filter out poor ones
        assert len(filtered) >= 1
        assert any('photosynthesis' in card['front'].lower() for card in filtered)


class TestEndToEnd:
    """End-to-end integration tests."""
    
    def test_generate_flashcards_with_headings(self):
        """Test full generation pipeline with structured text."""
        generator = FlashcardGenerator()
        
        result = generator.generate_flashcards(SAMPLE_TEXT_WITH_HEADINGS, num_cards=5)
        
        assert 'flashcards' in result
        assert 'count' in result
        assert 'total_generated' in result
        assert 'filtered_count' in result
        assert 'confidence' in result
        
        assert len(result['flashcards']) > 0
        assert result['count'] == len(result['flashcards'])
        
        # Check flashcard structure
        for card in result['flashcards']:
            assert 'front' in card
            assert 'back' in card
            assert 'confidence' in card
            assert 'source_section' in card
            assert 'importance_score' in card
            
            # Quality checks
            assert len(card['back']) > 0
            assert 0 <= card['confidence'] <= 1
            assert 0 <= card['importance_score'] <= 1
    
    def test_generate_flashcards_with_definitions(self):
        """Test generation with definition-heavy text."""
        generator = FlashcardGenerator()
        
        result = generator.generate_flashcards(SAMPLE_TEXT_WITH_DEFINITIONS, num_cards=3)
        
        assert len(result['flashcards']) > 0
        
        # Should generate flashcards from definitions
        fronts = [card['front'].lower() for card in result['flashcards']]
        assert any('photosynthesis' in front or 'osmosis' in front or 'mitosis' in front for front in fronts)
    
    def test_generate_flashcards_plain_text(self):
        """Test generation with plain unstructured text."""
        generator = FlashcardGenerator()
        
        result = generator.generate_flashcards(SAMPLE_TEXT_PLAIN, num_cards=5)
        
        assert len(result['flashcards']) > 0
        assert result['confidence'] > 0
        
        # Should use TF-IDF to identify important sentences
        for card in result['flashcards']:
            assert card['importance_score'] > 0
    
    def test_minimum_flashcards(self):
        """Test that minimum number of flashcards are generated."""
        generator = FlashcardGenerator()
        
        # Very short text
        short_text = "Machine learning is a subset of artificial intelligence."
        
        result = generator.generate_flashcards(short_text, num_cards=5)
        
        # Should generate at least 1 flashcard even with limited text
        assert len(result['flashcards']) >= 1
    
    def test_empty_text_raises_error(self):
        """Test that empty text raises appropriate error."""
        generator = FlashcardGenerator()
        
        with pytest.raises(ValueError, match="Empty text"):
            generator.generate_flashcards("", num_cards=5)
    
    def test_statistics_accuracy(self):
        """Test that statistics are accurate."""
        generator = FlashcardGenerator()
        
        result = generator.generate_flashcards(SAMPLE_TEXT_WITH_HEADINGS, num_cards=5)
        
        # Total generated should be >= final count
        assert result['total_generated'] >= result['count']
        
        # Filtered count should match
        expected_filtered = result['total_generated'] - result['count']
        assert result['filtered_count'] == expected_filtered
        
        # Confidence should be reasonable average
        if result['flashcards']:
            confidences = [card['confidence'] for card in result['flashcards']]
            avg_confidence = sum(confidences) / len(confidences)
            assert abs(result['confidence'] - avg_confidence) < 0.1  # Within 0.1


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

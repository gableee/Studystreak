"""
Enhanced flashcard generator with structure analysis, TF-IDF ranking, and quality filtering.
Generates smarter, higher-quality flashcards from text using:
- Document structure analysis (headings, definitions, lists)
- TF-IDF importance ranking
- Semantic similarity for deduplication
- Quality filtering and validation
"""

import logging
import re
from typing import List, Dict, Optional, Tuple, Set
from collections import defaultdict
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer
import numpy as np
from transformers import pipeline, Pipeline
import torch
from config import get_device, get_hf_pipeline_device_id

logger = logging.getLogger(__name__)

# Global cache for models
_embedding_model: Optional[SentenceTransformer] = None
_qa_pipeline: Optional[Pipeline] = None


def get_embedding_model() -> SentenceTransformer:
    """
    Lazy-load and cache the embedding model for semantic similarity.
    
    Returns:
        SentenceTransformer model for computing embeddings
    """
    global _embedding_model
    
    if _embedding_model is None:
        logger.info("Loading embedding model (all-MiniLM-L6-v2) for flashcards...")
        try:
            device = get_device()
            _embedding_model = SentenceTransformer(
                "sentence-transformers/all-MiniLM-L6-v2",
                device=device
            )
            logger.info(f"✅ Flashcard embedding model loaded successfully on {device}")
        except Exception as e:
            logger.error(f"❌ Failed to load embedding model: {e}")
            raise
    
    return _embedding_model


def get_qa_pipeline() -> Pipeline:
    """
    Lazy-load and cache the T5 pipeline for question generation.
    
    Returns:
        Hugging Face text2text-generation pipeline
    """
    global _qa_pipeline
    
    if _qa_pipeline is None:
        logger.info("Loading T5 model for flashcard generation...")
        try:
            hf_device_id = get_hf_pipeline_device_id()
            _qa_pipeline = pipeline(
                "text2text-generation",
                model="t5-base",
                device=hf_device_id  # -1 CPU, >=0 GPU index
            )
            dev_label = "cpu" if hf_device_id == -1 else f"cuda:{hf_device_id}"
            logger.info(f"✅ T5 model loaded successfully on {dev_label}")
        except Exception as e:
            logger.error(f"❌ Failed to load T5 model: {e}")
            raise
    
    return _qa_pipeline


class DocumentStructure:
    """Represents parsed document structure with headings, sections, and key content."""
    
    def __init__(self):
        self.headings: List[Tuple[int, str, str]] = []  # (level, text, section_content)
        self.definitions: List[Tuple[str, str]] = []  # (term, definition)
        self.list_items: List[Tuple[str, List[str]]] = []  # (list_title, items)
        self.key_sentences: List[str] = []
        self.all_sentences: List[str] = []
    
    def __repr__(self):
        return (f"DocumentStructure(headings={len(self.headings)}, "
                f"definitions={len(self.definitions)}, "
                f"lists={len(self.list_items)}, "
                f"sentences={len(self.all_sentences)})")


class FlashcardGenerator:
    """
    Enhanced flashcard generator with intelligent content analysis and quality filtering.
    """
    
    def __init__(self):
        self.embedding_model = get_embedding_model()
        self.qa_pipeline = get_qa_pipeline()
        self.min_sentence_length = 20
        self.max_back_length = 150  # words
        self.similarity_threshold = 0.85  # for deduplication
    
    def _parse_document_structure(self, text: str) -> DocumentStructure:
        """
        Parse document structure including headings, definitions, lists, and sentences.
        
        Args:
            text: Input text (markdown or plain text)
        
        Returns:
            DocumentStructure object with parsed content
        """
        structure = DocumentStructure()
        
        # Split into lines for processing
        lines = text.split('\n')
        current_section = ""
        current_heading = None
        current_level = 0
        
        # Patterns for structure detection
        heading_pattern = re.compile(r'^(#{1,6})\s+(.+)$')
        definition_pattern = re.compile(
            r'(.+?)\s+(?:is|are|refers to|means|represents|denotes|describes)\s+(.+?)(?:\.|$)',
            re.IGNORECASE
        )
        list_item_pattern = re.compile(r'^[\s]*[-*•]\s+(.+)$')
        numbered_list_pattern = re.compile(r'^[\s]*\d+[\.)]\s+(.+)$')
        
        i = 0
        while i < len(lines):
            line = lines[i].strip()
            
            if not line:
                i += 1
                continue
            
            # 1. Check for markdown headings
            heading_match = heading_pattern.match(line)
            if heading_match:
                level = len(heading_match.group(1))
                heading_text = heading_match.group(2).strip()
                
                # Save previous section if exists
                if current_heading and current_section:
                    structure.headings.append((current_level, current_heading, current_section.strip()))
                
                # Start new section
                current_level = level
                current_heading = heading_text
                current_section = ""
                i += 1
                continue
            
            # 2. Check for lists
            list_match = list_item_pattern.match(line) or numbered_list_pattern.match(line)
            if list_match:
                # Collect all list items
                list_items = []
                list_title = current_heading if current_heading else "Key points"
                
                while i < len(lines):
                    item_line = lines[i].strip()
                    item_match = list_item_pattern.match(item_line) or numbered_list_pattern.match(item_line)
                    if item_match:
                        list_items.append(item_match.group(1).strip())
                        i += 1
                    else:
                        break
                
                if list_items:
                    structure.list_items.append((list_title, list_items))
                
                continue
            
            # 3. Check for definition patterns
            definition_match = definition_pattern.search(line)
            if definition_match:
                term = definition_match.group(1).strip()
                definition = definition_match.group(2).strip()
                
                # Validate term length (avoid overly long terms)
                # Allow single-word terms as well (e.g., "Photosynthesis")
                if 1 <= len(term.split()) <= 8:
                    structure.definitions.append((term, definition))
            
            # 4. Add to current section content
            if current_heading:
                current_section += " " + line
            
            # 5. Collect sentences
            sentences = re.split(r'[.!?]+', line)
            for sent in sentences:
                sent = sent.strip()
                if len(sent) >= self.min_sentence_length:
                    structure.all_sentences.append(sent)
            
            i += 1
        
        # Save final section
        if current_heading and current_section:
            structure.headings.append((current_level, current_heading, current_section.strip()))
        
        logger.info(f"Parsed structure: {structure}")
        return structure
    
    def _compute_tfidf_scores(self, sentences: List[str]) -> Dict[str, float]:
        """
        Compute TF-IDF scores for sentences to identify important content.
        
        Args:
            sentences: List of sentences to score
        
        Returns:
            Dictionary mapping sentence to importance score
        """
        if len(sentences) < 2:
            return {sent: 1.0 for sent in sentences}
        
        try:
            # Create TF-IDF vectorizer
            vectorizer = TfidfVectorizer(
                max_features=500,
                stop_words='english',
                ngram_range=(1, 2)
            )
            
            # Fit and transform sentences
            tfidf_matrix = vectorizer.fit_transform(sentences)
            
            # Compute importance score for each sentence (sum of TF-IDF values)
            scores = {}
            for idx, sent in enumerate(sentences):
                score = tfidf_matrix[idx].sum()
                scores[sent] = float(score)
            
            # Normalize scores to [0, 1]
            if scores:
                max_score = max(scores.values())
                min_score = min(scores.values())
                score_range = max_score - min_score
                
                if score_range > 0:
                    scores = {
                        sent: (score - min_score) / score_range
                        for sent, score in scores.items()
                    }
            
            return scores
            
        except Exception as e:
            logger.warning(f"TF-IDF scoring failed: {e}, using uniform scores")
            return {sent: 0.5 for sent in sentences}
    
    def _rank_sentences_by_importance(
        self,
        structure: DocumentStructure,
        top_k: int = 20,
        rescued_terms: Optional[List[str]] = None
    ) -> List[Tuple[str, float]]:
        """
        Rank sentences by importance using TF-IDF scores.
        
        Args:
            structure: Parsed document structure
            top_k: Number of top sentences to return
        
        Returns:
            List of (sentence, score) tuples, sorted by importance
        """
        if not structure.all_sentences:
            return []
        
        # Compute TF-IDF scores
        scores = self._compute_tfidf_scores(structure.all_sentences)

        # Boost sentences that include rescued (visual) terms
        if rescued_terms:
            rescued_lower = [t.lower() for t in rescued_terms]
            for sent in list(scores.keys()):
                s_lower = sent.lower()
                match_count = sum(1 for t in rescued_lower if t in s_lower)
                if match_count > 0:
                    # Up to 60% boost if many terms match
                    boost = 1.0 + min(0.6, 0.2 * match_count)
                    scores[sent] *= boost
        
        # Sort by score descending
        ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        
        # Return top k
        return ranked[:top_k]
    
    def _generate_front_from_heading(self, heading: str, level: int) -> str:
        """
        Generate flashcard front (question) from a heading.
        
        Args:
            heading: Heading text
            level: Heading level (1-6)
        
        Returns:
            Question text for flashcard front
        """
        heading = heading.strip().rstrip('?')
        
        # Different question formats based on heading level and content
        if level == 1:  # Main topic
            return f"What is {heading}?"
        elif any(keyword in heading.lower() for keyword in ['how', 'what', 'why', 'when', 'where']):
            # Already a question-like heading
            return heading + "?" if not heading.endswith('?') else heading
        elif any(keyword in heading.lower() for keyword in ['types', 'kinds', 'categories']):
            return f"List the main {heading.lower()}"
        elif any(keyword in heading.lower() for keyword in ['benefits', 'advantages', 'features']):
            return f"What are the {heading.lower()}?"
        else:
            return f"Explain {heading}"
    
    def _generate_front_from_definition(self, term: str) -> str:
        """
        Generate flashcard front from a definition term.
        
        Args:
            term: Term being defined
        
        Returns:
            Question text for flashcard front
        """
        return f"What is {term}?"
    
    def _generate_front_from_sentence(self, sentence: str, use_t5: bool = True) -> str:
        """
        Generate flashcard front from a sentence using T5 or heuristics.
        
        Args:
            sentence: Source sentence
            use_t5: Whether to use T5 model (default: True)
        
        Returns:
            Question text for flashcard front
        """
        if use_t5:
            try:
                # Use T5 to generate question
                prompt = f"generate question: {sentence[:300]}"
                result = self.qa_pipeline(
                    prompt,
                    max_length=60,
                    num_return_sequences=1,
                    truncation=True,
                    clean_up_tokenization_spaces=True
                )
                
                if result and len(result) > 0:
                    return result[0]['generated_text']
            except Exception as e:
                logger.warning(f"T5 question generation failed: {e}")
        
        # Fallback: Extract key concept and create question
        words = sentence.split()
        key_words = [w for w in words if len(w) > 5 and not w.lower() in {'about', 'which', 'these', 'those', 'their', 'there'}]
        
        if key_words:
            concept = key_words[0]
            return f"What is important about {concept.lower()}?"
        
        return "What is the main concept discussed?"
    
    def _generate_back_from_content(
        self,
        content: str,
        max_words: int = 150
    ) -> str:
        """
        Generate flashcard back (answer) from content, limiting to max words.
        
        Args:
            content: Source content
            max_words: Maximum words for back (default: 150)
        
        Returns:
            Answer text for flashcard back
        """
        # Clean content
        content = content.strip()
        
        # Split into sentences
        sentences = re.split(r'[.!?]+', content)
        sentences = [s.strip() for s in sentences if s.strip()]
        
        # Build answer within word limit
        answer_parts = []
        word_count = 0
        
        for sent in sentences:
            sent_words = len(sent.split())
            if word_count + sent_words <= max_words:
                answer_parts.append(sent)
                word_count += sent_words
            else:
                # Add partial sentence if space remains
                remaining_words = max_words - word_count
                if remaining_words > 10:
                    from utils.truncate_helpers import _strip_trailing_punctuation, ELLIPSIS
                    words = sent.split()
                    snippet = ' '.join(words[:remaining_words]).rstrip()
                    snippet = _strip_trailing_punctuation(snippet) + ELLIPSIS
                    answer_parts.append(snippet)
                break
        
        from utils.truncate_helpers import finalize_with_ellipsis
        answer = '. '.join(answer_parts)
        # Ensure terminal punctuation (treat entire back as not truncated here)
        answer = finalize_with_ellipsis(answer, False) if answer else answer
        
        return answer if answer else content[:500]
    
    def _create_flashcard_from_heading(
        self,
        heading: str,
        level: int,
        content: str,
        source_section: str
    ) -> Optional[Dict]:
        """
        Create flashcard from a heading and its content.
        
        Args:
            heading: Heading text
            level: Heading level
            content: Section content under heading
            source_section: Full section name for reference
        
        Returns:
            Flashcard dictionary or None if invalid
        """
        try:
            front = self._generate_front_from_heading(heading, level)
            back = self._generate_back_from_content(content, self.max_back_length)
            
            if len(back.split()) < 5:  # Skip if answer too short
                return None
            
            # Estimate confidence based on content quality
            confidence = 0.9 if level <= 2 else 0.8
            
            return {
                "front": front,
                "back": back,
                "confidence": confidence,
                "source_section": source_section,
                "importance_score": 0.9,  # Headings are high importance
                "type": "heading"
            }
        except Exception as e:
            logger.warning(f"Failed to create flashcard from heading: {e}")
            return None
    
    def _create_flashcard_from_definition(
        self,
        term: str,
        definition: str
    ) -> Optional[Dict]:
        """
        Create flashcard from a definition.
        
        Args:
            term: Term being defined
            definition: Definition text
        
        Returns:
            Flashcard dictionary or None if invalid
        """
        try:
            front = self._generate_front_from_definition(term)
            back = self._generate_back_from_content(definition, self.max_back_length)
            
            if len(back.split()) < 3:
                return None
            
            return {
                "front": front,
                "back": back,
                "confidence": 0.95,  # Definitions are high quality
                "source_section": "Definition",
                "importance_score": 0.95,
                "type": "definition"
            }
        except Exception as e:
            logger.warning(f"Failed to create flashcard from definition: {e}")
            return None
    
    def _create_flashcard_from_list(
        self,
        list_title: str,
        items: List[str]
    ) -> Optional[Dict]:
        """
        Create flashcard from a list.
        
        Args:
            list_title: Title/context of the list
            items: List items
        
        Returns:
            Flashcard dictionary or None if invalid
        """
        try:
            # Generate front asking for list
            if any(keyword in list_title.lower() for keyword in ['types', 'kinds', 'categories']):
                front = f"List the main {list_title.lower()}"
            else:
                front = f"What are the key {list_title.lower()}?"
            
            # Generate back with numbered list
            if len(items) <= 7:  # Show all items if reasonable number
                back = '\n'.join(f"{i+1}. {item}" for i, item in enumerate(items))
            else:  # Show top items and indicate more
                back = '\n'.join(f"{i+1}. {item}" for i, item in enumerate(items[:5]))
                back += f"\n(and {len(items) - 5} more)"
            
            return {
                "front": front,
                "back": back,
                "confidence": 0.85,
                "source_section": list_title,
                "importance_score": 0.85,
                "type": "list"
            }
        except Exception as e:
            logger.warning(f"Failed to create flashcard from list: {e}")
            return None
    
    def _create_flashcard_from_sentence(
        self,
        sentence: str,
        importance_score: float
    ) -> Optional[Dict]:
        """
        Create flashcard from an important sentence.
        
        Args:
            sentence: Source sentence
            importance_score: TF-IDF importance score
        
        Returns:
            Flashcard dictionary or None if invalid
        """
        try:
            front = self._generate_front_from_sentence(sentence, use_t5=True)
            back = self._generate_back_from_content(sentence, self.max_back_length)
            
            if len(back.split()) < 5:
                return None
            
            # Confidence based on importance score
            confidence = min(0.9, 0.6 + (importance_score * 0.3))
            
            return {
                "front": front,
                "back": back,
                "confidence": confidence,
                "source_section": "Content",
                "importance_score": importance_score,
                "type": "sentence"
            }
        except Exception as e:
            logger.warning(f"Failed to create flashcard from sentence: {e}")
            return None
    
    def _deduplicate_flashcards(
        self,
        flashcards: List[Dict]
    ) -> List[Dict]:
        """
        Remove duplicate/similar flashcards using semantic similarity.
        
        Args:
            flashcards: List of flashcard dictionaries
        
        Returns:
            Deduplicated list of flashcards
        """
        if len(flashcards) <= 1:
            return flashcards
        
        try:
            # Extract fronts for comparison
            fronts = [card['front'] for card in flashcards]
            
            # Compute embeddings
            embeddings = self.embedding_model.encode(fronts, convert_to_tensor=True)
            
            # Compute pairwise cosine similarity
            similarities = cosine_similarity(embeddings.cpu().numpy())
            
            # Track which flashcards to keep
            keep_indices = []
            seen_similar = set()
            
            for i in range(len(flashcards)):
                if i in seen_similar:
                    continue
                
                # Keep this flashcard
                keep_indices.append(i)
                
                # Mark similar flashcards as seen
                for j in range(i + 1, len(flashcards)):
                    if similarities[i][j] > self.similarity_threshold:
                        seen_similar.add(j)
            
            deduplicated = [flashcards[i] for i in keep_indices]
            
            if len(deduplicated) < len(flashcards):
                logger.info(f"Removed {len(flashcards) - len(deduplicated)} duplicate flashcards")
            
            return deduplicated
            
        except Exception as e:
            logger.warning(f"Deduplication failed: {e}, returning original flashcards")
            return flashcards
    
    def _filter_quality(self, flashcards: List[Dict]) -> List[Dict]:
        """
        Filter out low-quality flashcards.
        
        Args:
            flashcards: List of flashcard dictionaries
        
        Returns:
            Filtered list of high-quality flashcards
        """
        filtered = []
        
        for card in flashcards:
            front = card['front']
            back = card['back']
            
            # Quality checks
            # 1. Front must be a question or prompt
            has_question_mark = '?' in front
            has_question_word = any(word in front.lower() for word in ['what', 'how', 'why', 'when', 'where', 'list', 'explain', 'describe'])
            
            if not (has_question_mark or has_question_word):
                logger.debug(f"Filtered: not a question: {front[:50]}")
                continue
            
            # 2. Back must have sufficient content
            back_word_count = len(back.split())
            if back_word_count < 5:
                logger.debug(f"Filtered: back too short ({back_word_count} words)")
                continue
            
            # 3. Front and back should not be too similar (avoid redundancy)
            front_words = set(front.lower().split())
            back_words = set(back.lower().split())
            
            if front_words and back_words:
                overlap = len(front_words & back_words) / len(front_words)
                if overlap > 0.8:  # More than 80% overlap
                    logger.debug(f"Filtered: too much overlap ({overlap:.2f})")
                    continue
            
            # 4. Avoid overly generic questions
            generic_patterns = [
                'what is the main',
                'what is important',
                'what can be inferred',
                'what does this mean'
            ]
            if any(pattern in front.lower() for pattern in generic_patterns):
                # Allow only if confidence is high
                if card.get('confidence', 0) < 0.75:
                    logger.debug(f"Filtered: generic question with low confidence")
                    continue
            
            filtered.append(card)
        
        logger.info(f"Quality filter: {len(flashcards)} -> {len(filtered)} flashcards")
        return filtered
    
    def generate_flashcards(
        self,
        text: str,
        num_cards: int = 10,
        rescued_terms: Optional[List[str]] = None
    ) -> Dict:
        """
        Generate high-quality flashcards from text using structure analysis and TF-IDF ranking.
        
        Args:
            text: Input text (markdown or plain text)
            num_cards: Desired number of flashcards (default: 10)
        
        Returns:
            Dictionary with flashcards, metadata, and statistics
        """
        try:
            logger.info(f"Generating {num_cards} enhanced flashcards")
            
            # Validate input
            text = text.strip()
            if not text:
                raise ValueError("Empty text provided for flashcard generation")
            
            # Parse document structure
            structure = self._parse_document_structure(text)
            
            # Generate flashcards from different sources
            all_flashcards = []
            
            # 1. Generate from headings (highest priority)
            for level, heading, content in structure.headings:
                if len(all_flashcards) >= num_cards * 2:  # Generate extra for filtering
                    break
                
                card = self._create_flashcard_from_heading(
                    heading, level, content,
                    source_section=f"H{level}: {heading}"
                )
                if card:
                    all_flashcards.append(card)
            
            # 2. Generate from definitions (high priority)
            for term, definition in structure.definitions:
                if len(all_flashcards) >= num_cards * 2:
                    break
                
                card = self._create_flashcard_from_definition(term, definition)
                if card:
                    all_flashcards.append(card)
            
            # 3. Generate from lists (medium priority)
            for list_title, items in structure.list_items:
                if len(all_flashcards) >= num_cards * 2:
                    break
                
                card = self._create_flashcard_from_list(list_title, items)
                if card:
                    all_flashcards.append(card)
            
            # 4. Generate from important sentences (fill remaining)
            if len(all_flashcards) < num_cards * 1.5:
                ranked_sentences = self._rank_sentences_by_importance(
                    structure,
                    top_k=num_cards * 2,
                    rescued_terms=rescued_terms
                )
                
                for sentence, score in ranked_sentences:
                    if len(all_flashcards) >= num_cards * 2:
                        break
                    
                    card = self._create_flashcard_from_sentence(sentence, score)
                    if card:
                        all_flashcards.append(card)
            
            # 4.5. Add visual-term flashcards for rescued terms not already covered
            if rescued_terms:
                existing_terms: Set[str] = set()
                for lvl, heading, content in structure.headings:
                    existing_terms.add(heading.lower())
                for term, _defn in structure.definitions:
                    existing_terms.add(term.lower())

                for term in rescued_terms:
                    t = term.strip()
                    if not t:
                        continue
                    if t.lower() in existing_terms:
                        continue

                    # Find a contextual sentence mentioning the term
                    context_sent = None
                    for s in structure.all_sentences:
                        if t.lower() in s.lower():
                            context_sent = s
                            break
                    back_text = (
                        self._generate_back_from_content(context_sent, self.max_back_length)
                        if context_sent else
                        "A key visual term identified in the material (from diagrams or images)."
                    )
                    all_flashcards.append({
                        "front": f"What is {t}?",
                        "back": back_text,
                        "confidence": 0.7,
                        "source_section": "Visual term",
                        "importance_score": 0.75,
                        "type": "visual-term"
                    })

            # 5. Deduplicate similar flashcards
            deduplicated = self._deduplicate_flashcards(all_flashcards)
            
            # 6. Filter for quality
            filtered = self._filter_quality(deduplicated)
            
            # 7. Sort by importance and confidence
            filtered.sort(
                key=lambda x: (x['importance_score'] * 0.6 + x['confidence'] * 0.4),
                reverse=True
            )
            
            # 8. Select top num_cards
            final_flashcards = filtered[:num_cards]
            
            # 9. Ensure minimum flashcards (fallback)
            if len(final_flashcards) < max(1, num_cards // 2):
                logger.warning("Insufficient high-quality flashcards, using fallback generation")
                
                # Simple fallback from sentences
                sentences = structure.all_sentences[:num_cards]
                for sent in sentences:
                    if len(final_flashcards) >= num_cards:
                        break
                    
                    prefix = sent[:50].strip()
                    was_truncated = len(sent) > 50
                    prefix = re.sub(r"[\.,;:!\?\u2026]+$", "", prefix) + ("\u2026" if was_truncated else "")
                    card = {
                        "front": f"What is discussed about: {prefix}?",
                        "back": self._generate_back_from_content(sent, 100),
                        "confidence": 0.5,
                        "source_section": "Fallback",
                        "importance_score": 0.5,
                        "type": "fallback"
                    }
                    final_flashcards.append(card)
            
            # 10. Format output (remove internal fields)
            output_flashcards = []
            for card in final_flashcards:
                output_flashcards.append({
                    "front": card['front'],
                    "back": card['back'],
                    "confidence": round(card['confidence'], 2),
                    "source_section": card['source_section'],
                    "importance_score": round(card['importance_score'], 2)
                })
            
            logger.info(f"✅ Generated {len(output_flashcards)} high-quality flashcards")
            
            return {
                "flashcards": output_flashcards,
                "total_generated": len(all_flashcards),
                "filtered_count": len(all_flashcards) - len(final_flashcards),
                "count": len(output_flashcards),
                "confidence": round(np.mean([c['confidence'] for c in output_flashcards]), 2) if output_flashcards else 0.0
            }
            
        except Exception as e:
            logger.error(f"❌ Enhanced flashcard generation failed: {e}", exc_info=True)
            raise


# Singleton instance for module-level access
_flashcard_generator: Optional[FlashcardGenerator] = None


def get_flashcard_generator() -> FlashcardGenerator:
    """
    Get or create singleton FlashcardGenerator instance.
    
    Returns:
        FlashcardGenerator instance
    """
    global _flashcard_generator
    
    if _flashcard_generator is None:
        _flashcard_generator = FlashcardGenerator()
    
    return _flashcard_generator

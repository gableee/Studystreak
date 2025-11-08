"""
Question-Answer generator for quiz questions and flashcards using T5 or similar models.
Uses sentence-transformers for semantic similarity-based distractor generation.
"""

import logging
import re
import random
from typing import List, Dict, Optional, Tuple
from transformers import pipeline, Pipeline
from sentence_transformers import SentenceTransformer
import torch
import config

logger = logging.getLogger(__name__)

# Global cache for models
_qa_pipeline: Optional[Pipeline] = None
_embedding_model: Optional[SentenceTransformer] = None


def get_qa_model() -> Pipeline:
    """
    Lazy-load and cache the question generation pipeline.
    
    Returns:
        Hugging Face text2text-generation pipeline (T5)
    """
    global _qa_pipeline
    
    if _qa_pipeline is None:
        logger.info("Loading QA generation model (t5-base)...")
        try:
            # Using t5-base for question generation
            # Alternative: "valhalla/t5-small-qg-hl" (specialized for QG)
            hf_dev = config.get_hf_pipeline_device_id()
            _qa_pipeline = pipeline(
                "text2text-generation",
                model="t5-base",
                device=hf_dev  # -1 CPU, >=0 GPU index
            )
            logger.info("✅ QA generation model loaded successfully")
        except Exception as e:
            logger.error(f"❌ Failed to load QA model: {e}")
            raise
    
    return _qa_pipeline


def get_embedding_model() -> SentenceTransformer:
    """
    Lazy-load and cache the embedding model for semantic similarity.
    
    Returns:
        SentenceTransformer model for computing embeddings
    """
    global _embedding_model
    
    if _embedding_model is None:
        logger.info("Loading embedding model (all-MiniLM-L6-v2)...")
        try:
            device = config.get_device()
            _embedding_model = SentenceTransformer(
                "sentence-transformers/all-MiniLM-L6-v2",
                device=device
            )
            logger.info("✅ Embedding model loaded successfully")
        except Exception as e:
            logger.error(f"❌ Failed to load embedding model: {e}")
            raise
    
    return _embedding_model


class QAGenerator:
    """
    Generates quiz questions and flashcards from text using T5 model.
    Uses semantic similarity for intelligent distractor generation.
    """
    
    def __init__(self):
        self.pipeline = get_qa_model()
        self.embedding_model = get_embedding_model()
    
    def _generate_semantic_distractors(
        self,
        correct_answer: str,
        text: str,
        num_distractors: int = 3
    ) -> List[str]:
        """
        Generate semantically similar but incorrect distractors using embeddings.
        
        Args:
            correct_answer: The correct answer text
            text: Full context text to extract candidates from
            num_distractors: Number of distractors to generate (default: 3)
        
        Returns:
            List of distractor strings
        """
        try:
            # Extract candidate phrases from text (nouns, key terms)
            words = text.split()
            # Filter for substantial words (>4 chars, capitalized or common nouns)
            candidates = []
            punctuation = ',.!?;:"()[]{}'
            for i, word in enumerate(words):
                cleaned = word.strip(punctuation)
                if len(cleaned) > 4 and cleaned not in candidates and cleaned.lower() != correct_answer.lower():
                    candidates.append(cleaned)
                    # Also include 2-word phrases for better context
                    if i < len(words) - 1:
                        next_word = words[i+1].strip(punctuation)
                        phrase = f"{cleaned} {next_word}".strip()
                        if len(phrase) < 30 and phrase not in candidates:
                            candidates.append(phrase)
            
            if len(candidates) < num_distractors:
                # Fallback: Add generic distractors
                generic = ["Not mentioned", "None of these", "All of the above"]
                candidates.extend([g for g in generic if g not in candidates])
            
            if not candidates:
                return ["Option A", "Option B", "Option C"][:num_distractors]
            
            # Encode correct answer and all candidates
            correct_emb = self.embedding_model.encode([correct_answer], convert_to_tensor=True)
            candidate_embs = self.embedding_model.encode(candidates, convert_to_tensor=True)
            
            # Compute cosine similarity
            similarities = self.embedding_model.similarity(correct_emb, candidate_embs)[0]
            
            # Select distractors in similarity range [0.4, 0.8] - similar enough to be plausible, different enough to be wrong
            distractor_candidates = []
            for idx, sim_score in enumerate(similarities):
                # Exclude candidates too similar (>0.9) or too different (<0.3)
                if 0.3 < sim_score < 0.9:
                    distractor_candidates.append((candidates[idx], sim_score.item()))
            
            # Sort by similarity score (descending) and take top num_distractors
            distractor_candidates.sort(key=lambda x: x[1], reverse=True)
            distractors = [d[0] for d in distractor_candidates[:num_distractors]]
            
            # If not enough, add random candidates
            if len(distractors) < num_distractors:
                remaining = [c for c in candidates if c not in distractors]
                random.shuffle(remaining)
                distractors.extend(remaining[:num_distractors - len(distractors)])
            
            # Final fallback
            if len(distractors) < num_distractors:
                fallback = ["None of the above", "All of these", "Not applicable"]
                distractors.extend(fallback[:num_distractors - len(distractors)])
            
            return distractors[:num_distractors]
            
        except Exception as e:
            logger.warning(f"Semantic distractor generation failed: {e}, using fallback")
            # Fallback to simple random selection
            words = [w.strip(',.!?;:"()[]{}') for w in text.split() if len(w) > 4]
            filtered = [w for w in words if w.lower() != correct_answer.lower()]
            random.shuffle(filtered)
            return (filtered + ["None", "Other", "N/A"])[:num_distractors]
    
    def _get_difficulty_prompt(self, sentence: str, difficulty: str) -> str:
        """
        Generate T5 prompt based on difficulty level.
        
        Args:
            sentence: Source sentence for question generation
            difficulty: 'easy', 'normal', or 'hard'
        
        Returns:
            Formatted prompt string for T5
        """
        sentence_clip = sentence[:200]  # Limit sentence length
        
        if difficulty == "easy":
            # Simple recall questions
            return f"generate easy recall question: {sentence_clip}"
        elif difficulty == "hard":
            # Complex analytical questions
            return f"generate complex analytical question: {sentence_clip}"
        else:  # normal (default)
            # Application/understanding questions
            return f"generate question: {sentence_clip}"
    
    def _generate_true_false(self, sentence: str, difficulty: str) -> Dict:
        """
        Generate a true/false question from a factual statement.
        
        Args:
            sentence: Source sentence containing factual information
            difficulty: 'easy', 'normal', or 'hard'
        
        Returns:
            Dictionary with question, options, correct_answer, explanation, type
        """
        try:
            # Decide whether to use true statement or create negation
            is_true_statement = random.choice([True, False])
            
            if is_true_statement:
                # Use original sentence as true statement
                if difficulty == "easy":
                    question_text = f"True or False: {sentence}"
                elif difficulty == "hard":
                    # Make it more challenging by being less direct
                    question_text = f"The following statement is accurate: {sentence}"
                else:
                    question_text = f"Is this statement correct? {sentence}"
                
                correct_answer = "True"
                from utils.truncate_helpers import clip_chars
                snippet, _ = clip_chars(sentence, 100)
                explanation = f"This is true based on: {snippet}"
            else:
                # Create negation for false statement
                # Simple negation strategy: add "not" or swap key terms
                negated = sentence
                if " is " in sentence.lower():
                    negated = sentence.replace(" is ", " is not ", 1)
                elif " are " in sentence.lower():
                    negated = sentence.replace(" are ", " are not ", 1)
                elif " can " in sentence.lower():
                    negated = sentence.replace(" can ", " cannot ", 1)
                else:
                    # Fallback: prefix with negation
                    negated = f"It is not true that {sentence.lower()}"
                
                if difficulty == "easy":
                    question_text = f"True or False: {negated}"
                elif difficulty == "hard":
                    question_text = f"Evaluate the accuracy of this claim: {negated}"
                else:
                    question_text = f"Is this statement correct? {negated}"
                
                correct_answer = "False"
                from utils.truncate_helpers import clip_chars
                snippet, _ = clip_chars(sentence, 100)
                explanation = f"This is false. The correct information is: {snippet}"
            
            return {
                "question": question_text,
                "options": ["True", "False"],
                "correct_answer": correct_answer,
                "explanation": explanation,
                "type": "true-false"
            }
        
        except Exception as e:
            logger.warning(f"True/false generation failed: {e}, using fallback")
            from utils.truncate_helpers import clip_chars
            snippet, _ = clip_chars(sentence, 100)
            return {
                "question": f"True or False: {snippet}",
                "options": ["True", "False"],
                "correct_answer": "True",
                "explanation": "Based on the provided material.",
                "type": "true-false"
            }
    
    def _generate_short_answer(self, sentence: str, difficulty: str) -> Dict:
        """
        Generate an open-ended short-answer question.
        
        Args:
            sentence: Source sentence for question generation
            difficulty: 'easy', 'normal', or 'hard'
        
        Returns:
            Dictionary with question, correct_answer (sample), explanation, type
        """
        try:
            # Generate question using T5 with difficulty-aware prompt
            prompt = self._get_difficulty_prompt(sentence, difficulty)
            
            result = self.pipeline(
                prompt,
                max_length=50,
                num_return_sequences=1,
                truncation=True,
                clean_up_tokenization_spaces=True
            )
            
            if result and len(result) > 0:
                question_text = result[0]['generated_text']
            else:
                # Fallback question based on difficulty
                if difficulty == "easy":
                    question_text = f"What is mentioned in this text?"
                elif difficulty == "hard":
                    question_text = f"Analyze and explain the main concept discussed."
                else:
                    question_text = f"Describe the key idea presented."
            
            # Extract sample answer from sentence (for grading reference)
            # For MVP, this is stored but grading is manual
            from utils.truncate_helpers import clip_chars
            sample_answer, _ = clip_chars(sentence, 150)
            
            return {
                "question": question_text,
                "options": [],  # Empty for short-answer
                "correct_answer": sample_answer,  # Sample answer for reference
                "explanation": f"Sample answer based on: {clip_chars(sentence, 100)[0]}",
                "type": "short-answer"
            }
        
        except Exception as e:
            logger.warning(f"Short-answer generation failed: {e}, using fallback")
            return {
                "question": "Explain the main concept from this material.",
                "options": [],
                "correct_answer": sentence[:150],
                "explanation": "Provide a brief explanation based on the text.",
                "type": "short-answer"
            }
    
    def generate_quiz(
        self,
        text: str,
        num_questions: int = 5,
        difficulty: str = "normal",
        question_type: str = "multiple-choice"
    ) -> dict:
        """
        Generate quiz questions from text with configurable difficulty and type.
        
        Args:
            text: Input text to generate questions from
            num_questions: Number of questions to generate (default: 5)
            difficulty: 'easy', 'normal', or 'hard' (default: 'normal')
            question_type: 'multiple-choice', 'true-false', or 'short-answer' (default: 'multiple-choice')
        
        Returns:
            dict with 'questions' (list of QuizQuestion), 'count', 'confidence'
        """
        try:
            logger.info(f"Generating {num_questions} {difficulty} {question_type} quiz questions")
            
            # Validate difficulty
            if difficulty not in ["easy", "normal", "hard"]:
                logger.warning(f"Invalid difficulty '{difficulty}', defaulting to 'normal'")
                difficulty = "normal"
            
            # Validate question_type
            if question_type not in ["multiple-choice", "true-false", "short-answer"]:
                logger.warning(f"Invalid question_type '{question_type}', defaulting to 'multiple-choice'")
                question_type = "multiple-choice"
            
            # Clean and validate text
            text = text.strip()
            if not text:
                raise ValueError("Empty text provided for quiz generation")
            
            # Split text into sentences for question generation
            sentences = [s.strip() for s in text.replace('\n', '. ').split('.') if len(s.strip()) > 20]
            
            if len(sentences) < num_questions:
                logger.warning(f"Only {len(sentences)} sentences available, adjusting question count")
                num_questions = max(1, len(sentences))
            
            questions = []
            
            # Generate questions from selected sentences
            selected_sentences = random.sample(sentences, min(num_questions, len(sentences)))
            
            for i, sentence in enumerate(selected_sentences):
                try:
                    # Route to appropriate question generator based on type
                    if question_type == "true-false":
                        question_data = self._generate_true_false(sentence, difficulty)
                        questions.append(question_data)
                    
                    elif question_type == "short-answer":
                        question_data = self._generate_short_answer(sentence, difficulty)
                        questions.append(question_data)
                    
                    else:  # multiple-choice (default)
                        # Generate multiple-choice question with difficulty-aware prompt
                        prompt = self._get_difficulty_prompt(sentence, difficulty)
                        
                        # Generate question
                        result = self.pipeline(
                            prompt,
                            max_length=50,
                            num_return_sequences=1,
                            truncation=True,
                            clean_up_tokenization_spaces=True
                        )
                        
                        if not result or len(result) == 0:
                            logger.warning(f"Empty result for question {i+1}, using fallback")
                            # Build a clipped prompt prefix with typographic ellipsis if truncated
                            prefix = sentence[:50].strip()
                            was_truncated = len(sentence) > 50
                            if was_truncated:
                                prefix = re.sub(r"[\.,;:!\?\u2026]+$", "", prefix) + "\u2026"
                            else:
                                prefix = re.sub(r"[\.,;:!\?\u2026]+$", "", prefix)
                            if difficulty == "easy":
                                question_text = f"What is mentioned about: {prefix}?"
                            elif difficulty == "hard":
                                question_text = f"Analyze the relationship between concepts in: {prefix}?"
                            else:
                                question_text = f"What can be inferred from: {prefix}?"
                        else:
                            question_text = result[0]['generated_text']
                        
                        # Extract correct answer from sentence
                        words = sentence.split()
                        key_words = [w.strip(',.!?;:"()[]{}') for w in words if len(w) > 4]
                        
                        if not key_words:
                            logger.warning(f"No key words found in sentence {i+1}, skipping")
                            continue
                        
                        correct_answer = random.choice(key_words)
                        
                        # Generate semantic similarity-based distractors
                        distractors = self._generate_semantic_distractors(
                            correct_answer, 
                            text,
                            num_distractors=3
                        )
                        
                        # Combine correct answer with distractors
                        options = [correct_answer] + distractors
                        random.shuffle(options)
                        
                        from utils.truncate_helpers import clip_chars
                        mc_snippet, _ = clip_chars(sentence, 100)
                        questions.append({
                            "question": question_text,
                            "options": options,
                            "correct_answer": correct_answer,
                            "explanation": f"Based on: {mc_snippet}",
                            "type": "multiple-choice"
                        })
                
                except Exception as e:
                    logger.warning(f"Failed to generate question {i+1}: {e}", exc_info=True)
                    continue
            
            # Ensure at least one question
            if not questions:
                logger.warning("No questions generated, creating fallback question")
                questions.append({
                    "question": "What is the main topic of this material?",
                    "options": ["Topic A", "Topic B", "Topic C", "Topic D"],
                    "correct_answer": "Topic A",
                    "explanation": "Based on the provided material.",
                    "type": question_type
                })
            
            logger.info(f"✅ Generated {len(questions)} {difficulty} {question_type} quiz questions")
            
            return {
                "questions": questions,
                "count": len(questions),
                "confidence": 0.75
            }
            
        except Exception as e:
            logger.error(f"❌ Quiz generation failed: {e}", exc_info=True)
            raise
        
    
    def generate_flashcards(
        self,
        text: str,
        num_cards: int = 10
    ) -> dict:
        """
        Generate flashcards (front/back pairs) from text.
        
        Args:
            text: Input text
            num_cards: Number of flashcards to generate (default: 10)
        
        Returns:
            dict with 'flashcards' (list of {front, back}), 'count', 'confidence'
        """
        try:
            logger.info(f"Generating {num_cards} flashcards")
            
            # Clean and validate text
            text = text.strip()
            if not text:
                raise ValueError("Empty text provided for flashcard generation")
            
            # Split text into meaningful chunks (sentences or paragraphs)
            sentences = [s.strip() for s in text.replace('\n', '. ').split('.') if len(s.strip()) > 30]
            
            if len(sentences) < num_cards:
                logger.warning(f"Only {len(sentences)} sentences, adjusting card count")
                num_cards = max(1, len(sentences))
            
            flashcards = []
            selected_sentences = random.sample(sentences, min(num_cards, len(sentences)))
            
            for sentence in selected_sentences:
                try:
                    # Extract key concept for front
                    words = sentence.split()
                    key_words = [w for w in words if len(w) > 5]
                    
                    if key_words:
                        # Front: Key concept or question
                        front_text = f"What is {random.choice(key_words)}?"
                        
                        # Back: Definition/explanation (use sentence or generate with T5)
                        back_text = sentence
                        
                        flashcards.append({
                            "front": front_text,
                            "back": back_text
                        })
                except Exception as card_err:
                    logger.warning(f"Failed to create flashcard: {card_err}")
                    continue
            
            # Ensure at least one flashcard
            if not flashcards:
                logger.warning("No flashcards generated, creating fallback")
                flashcards.append({
                    "front": "What is the main topic?",
                    "back": "Review the material for key concepts."
                })
            
            logger.info(f"✅ Generated {len(flashcards)} flashcards")
            
            return {
                "flashcards": flashcards,
                "count": len(flashcards),
                "confidence": 0.70
            }
            
        except Exception as e:
            logger.error(f"❌ Flashcard generation failed: {e}", exc_info=True)
            raise

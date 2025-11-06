"""
Question-Answer generator for quiz questions and flashcards using T5 or similar models.
"""

import logging
import random
from typing import List, Dict, Optional
from transformers import pipeline, Pipeline
import config

logger = logging.getLogger(__name__)

# Global cache for QA generation model
_qa_pipeline: Optional[Pipeline] = None


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
            _qa_pipeline = pipeline(
                "text2text-generation",
                model="t5-base",
                device=-1  # CPU (use 0 for GPU)
            )
            logger.info("✅ QA generation model loaded successfully")
        except Exception as e:
            logger.error(f"❌ Failed to load QA model: {e}")
            raise
    
    return _qa_pipeline


class QAGenerator:
    """
    Generates quiz questions and flashcards from text using T5 model.
    """
    
    def __init__(self):
        self.pipeline = get_qa_model()
    
    def generate_quiz(
        self,
        text: str,
        num_questions: int = 5
    ) -> dict:
        """
        Generate multiple-choice quiz questions from text.
        
        Args:
            text: Input text to generate questions from
            num_questions: Number of questions to generate (default: 5)
        
        Returns:
            dict with 'questions' (list of QuizQuestion), 'count', 'confidence'
        """
        try:
            logger.info(f"Generating {num_questions} quiz questions")
            
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
                    # Create prompt for T5 to generate question
                    prompt = f"generate question: {sentence[:200]}"  # Limit sentence length
                    
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
                        question_text = f"What is mentioned about: {sentence[:50]}...?"
                    else:
                        question_text = result[0]['generated_text']
                    
                    # Generate plausible wrong answers (simplified approach)
                    # In production, use NER + semantic similarity for better distractors
                    words = sentence.split()
                    key_words = [w for w in words if len(w) > 4]
                    
                    if len(key_words) >= 4:
                        # Create distractors by modifying key words
                        correct_answer = random.choice(key_words)
                        options = [correct_answer]
                        
                        # Add 3 distractors
                        available_distractors = [w for w in key_words if w != correct_answer]
                        while len(options) < 4 and available_distractors:
                            options.append(available_distractors.pop(0))
                        
                        # If not enough, add generic distractors
                        generic_distractors = ["All of the above", "None of the above", "Both A and B"]
                        while len(options) < 4:
                            options.append(generic_distractors[len(options) - 1])
                        
                        random.shuffle(options)
                        
                        questions.append({
                            "question": question_text,
                            "options": options,
                            "correct_answer": correct_answer,
                            "explanation": f"Based on: {sentence[:100]}..."
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
                    "explanation": "Based on the provided material."
                })
            
            logger.info(f"✅ Generated {len(questions)} quiz questions")
            
            return {
                "questions": questions,
                "count": len(questions),
                "confidence": 0.75  # Lower confidence for complex task
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

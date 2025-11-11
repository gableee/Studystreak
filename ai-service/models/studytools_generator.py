"""
StudyTools generator using Ollama for educational content generation.
Generates summaries, keypoints, quizzes, and flashcards from extracted text.
"""

import logging
import json
from typing import Dict, Any, List, Optional
import os
from utils.ollama_client import get_ollama_client

logger = logging.getLogger(__name__)


class StudyToolsGenerator:
    """Generate educational content (summary, keypoints, quiz, flashcards) using Ollama."""
    
    def __init__(self, model: Optional[str] = None):
        """
        Initialize StudyTools generator.
        
        Args:
            model: Ollama model name (default: from env or 'qwen3-vl:8b')
        """
        # Use a strong text model for prose and a lighter model for JSON structuring
        text_model = os.getenv('OLLAMA_MODEL_TEXT', model or 'qwen3-vl:8b')
        json_model = os.getenv('OLLAMA_MODEL_JSON', 'phi3:mini')

        self.ollama_text = get_ollama_client(model=text_model)
        self.ollama_json = get_ollama_client(model=json_model)
        logger.info(f"StudyTools generator initialized (text_model={text_model}, json_model={json_model})")
    
    def generate_summary(self, content: str, assignment: Optional[str] = None) -> Dict[str, Any]:
        """
        Generate a concise summary from content.
        
        Args:
            content: Extracted text content
            assignment: Optional task description
        
        Returns:
            dict with 'content', 'word_count', 'reading_time'
        """
        try:
            # Validate input content
            if not content or not isinstance(content, str):
                logger.error("Invalid or empty content provided for summary generation")
                return {
                    "content": "No content available for summarization.",
                    "word_count": 0,
                    "reading_time": "0 min"
                }
            
            content = content.strip()
            if len(content) < 50:
                logger.warning(f"Content too short for meaningful summary ({len(content)} chars)")
                return {
                    "content": content,
                    "word_count": len(content.split()),
                    "reading_time": "1 min"
                }
            
            logger.info("Generating summary...")
            
            system_prompt = """You are an academic assistant AI specialized in creating concise, reviewer-style summaries.
Your summaries should be 3-5 paragraphs maximum, focusing on key concepts and main ideas.
Maintain academic tone and ensure accuracy."""
            
            user_prompt = f"""Assignment: {assignment or 'Generate a comprehensive study summary'}

Content:
{content[:15000]}

Instructions:
- Create a concise, reviewer-style summary (3-5 paragraphs max)
- Focus on main ideas, key concepts, and important details
- Use clear, academic language
- Avoid unnecessary details or repetition

Generate the summary now:"""
            
            result = self.ollama_text.generate(
                prompt=user_prompt,
                system=system_prompt,
                temperature=0.5,
                max_tokens=800
            )
            
            summary_text = result.get('response', '').strip()
            word_count = len(summary_text.split())
            reading_time = f"{max(1, word_count // 200)} min"
            
            logger.info(f"Summary generated ({word_count} words)")
            
            return {
                "content": summary_text,
                "word_count": word_count,
                "reading_time": reading_time
            }
        
        except Exception as e:
            logger.error(f"Summary generation failed: {e}")
            raise
    
    def generate_keypoints(self, content: str, assignment: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Generate structured keypoints with terms and definitions.
        
        Args:
            content: Extracted text content
            assignment: Optional task description
        
        Returns:
            List of topics with terms, definitions, and importance levels
        """
        try:
            logger.info("Generating keypoints...")
            
            system_prompt = """You are an academic assistant AI specialized in extracting key concepts and definitions.
Create structured keypoints with clear term-definition pairs.
Organize by topics and assess importance levels (high/medium/low).
Always respond with valid JSON format."""
            
            user_prompt = f"""Assignment: {assignment or 'Extract key concepts and definitions'}

Content:
{content[:15000]}

Instructions:
- Extract the most important terms, concepts, and definitions
- Organize into logical topics/sections
- Format as: Topic -> Term: Definition
- Assign importance level to each term (high, medium, or low)
- Include 5-10 key terms per topic
- Use clear, concise definitions (1-2 sentences)

You MUST respond with ONLY valid JSON. No explanations, no markdown, just the JSON object.

Format:
{{
  "keypoints": [
    {{
      "topic": "Topic Name",
      "terms": [
        {{"term": "Term", "definition": "Clear definition.", "importance": "high"}},
        {{"term": "Another Term", "definition": "Another definition.", "importance": "medium"}}
      ]
    }}
  ]
}}

Generate the JSON now:"""
            
            try:
                result = self.ollama_json.generate_json(
                    prompt=user_prompt,
                    system=system_prompt,
                    temperature=0.3,
                    max_tokens=1000
                )
            except Exception as e:
                logger.warning(f"Keypoints JSON generation failed, using fallback: {e}")
                result = {"keypoints": []}
            
            keypoints = result.get('keypoints', [])
            
            # Validate and normalize structure
            normalized_keypoints = []
            for kp in keypoints:
                if isinstance(kp, dict) and 'topic' in kp and 'terms' in kp:
                    terms = []
                    for term in kp.get('terms', []):
                        if isinstance(term, dict):
                            terms.append({
                                'term': term.get('term', ''),
                                'definition': term.get('definition', ''),
                                'importance': term.get('importance', 'medium')
                            })
                    
                    if terms:
                        normalized_keypoints.append({
                            'topic': kp.get('topic', 'General Concepts'),
                            'terms': terms
                        })
            
            if not normalized_keypoints:
                # Fallback if JSON parsing failed
                logger.warning("Using fallback keypoints structure")
                normalized_keypoints = [{
                    'topic': 'Key Concepts',
                    'terms': [{
                        'term': 'Content Summary',
                        'definition': 'Please review the original material for detailed concepts.',
                        'importance': 'high'
                    }]
                }]
            
            logger.info(f"Keypoints generated ({len(normalized_keypoints)} topics)")
            
            return normalized_keypoints
        
        except Exception as e:
            logger.error(f"Keypoints generation failed: {e}")
            raise
    
    def generate_quiz(self, content: str, assignment: Optional[str] = None, num_questions: int = 5, question_type: str = 'multiple-choice', difficulty: str = 'normal') -> List[Dict[str, Any]]:
        """
        Generate quiz questions with answers and explanations.
        
        Args:
            content: Extracted text content
            assignment: Optional task description
            num_questions: Number of questions to generate
            question_type: Type of questions (multiple-choice, true-false, short-answer)
            difficulty: Difficulty level (easy, normal, hard)
        
        Returns:
            List of quiz question dicts
        """
        try:
            logger.info(f"Generating {num_questions} {difficulty} {question_type} quiz questions...")
            
            # Customize prompt based on question type
            if question_type == 'true-false':
                type_instructions = """- Generate EXACTLY {num_questions} TRUE/FALSE questions
- EVERY question MUST have exactly 2 options: ["True", "False"]
- Questions should be clear statements that are definitively true or false
- Answer must be either "True" or "False"""
                type_example = '''{
      "question": "Machine learning algorithms can only work with numerical data. True or False?",
      "options": ["True", "False"],
      "answer": "False",
      "explanation": "Machine learning can work with various data types including text, images, and categorical data.",
      "difficulty": "normal",
      "time_estimate": "1 minute"
    }'''
            elif question_type == 'short-answer':
                type_instructions = """- Generate EXACTLY {num_questions} SHORT ANSWER questions
- Questions should require a brief written response (1-3 sentences)
- DO NOT include options array
- Provide a model answer that demonstrates the expected response"""
                type_example = '''{
      "question": "Explain the difference between supervised and unsupervised learning.",
      "options": [],
      "answer": "Supervised learning uses labeled training data to learn a mapping from inputs to outputs, while unsupervised learning finds patterns in unlabeled data without predefined categories.",
      "explanation": "This answer correctly identifies the key difference: labeled vs unlabeled data.",
      "difficulty": "normal",
      "time_estimate": "3 minutes"
    }'''
            else:  # multiple-choice
                type_instructions = """- Generate EXACTLY {num_questions} MULTIPLE CHOICE quiz questions covering key concepts
- EVERY question MUST have exactly 4 distinct, meaningful options
- DO NOT use letter prefixes like "A. ", "B. ", "C. ", "D. " in the options array
- DO NOT use generic text like "Option A", "Option B", "Option C", "Option D"
- Each option should be ONLY the answer text itself, without any prefix
- The 'answer' field MUST contain the EXACT text of the correct option (copy it word-for-word)
- DO NOT include the options in the question text - keep them separate
- Question text should end with a question mark"""
                type_example = '''{
      "question": "Which algorithm is commonly used for classification tasks in supervised learning?",
      "options": [
        "Decision Trees",
        "K-Means Clustering", 
        "Principal Component Analysis",
        "Apriori Algorithm"
      ],
      "answer": "Decision Trees",
      "explanation": "Decision Trees are a popular supervised learning algorithm used for classification tasks, while the other options are used for clustering, dimensionality reduction, and association rule learning respectively.",
      "difficulty": "normal",
      "time_estimate": "2 minutes"
    }'''

            system_prompt = f"""You are an academic assistant AI specialized in creating educational quiz questions.
Generate {question_type} questions at {difficulty} difficulty level.
Include correct answers, explanations, and time estimates."""
            
            user_prompt = f"""Assignment: {assignment or 'Generate quiz questions from the material'}

Content:
{content[:15000]}

Instructions:
{type_instructions.format(num_questions=num_questions)}
- Difficulty level: {difficulty} (easy = basic recall, normal = understanding, hard = analysis/application)
- Provide detailed explanation for why the answer is correct
- Estimate time to answer each question (1-3 minutes)
- Questions should test understanding, not just memorization

CRITICAL RULES FOR OPTIONS AND ANSWERS:
1. Options array must contain ONLY the answer text (no "A. ", "B. ", "C. ", "D. " prefixes)
2. The 'answer' field MUST be the EXACT TEXT of one of the options (copy-paste it exactly)
3. DO NOT use "Option A", "Option B", etc. in the answer field
4. Example: If options are ["Apple", "Banana", "Cherry", "Date"], answer must be one of these exact words

Return ONLY valid JSON in this exact format:
{{
  "quiz": [
    {type_example}
  ]
}}

IMPORTANT: 
- Question type: {question_type}
- Difficulty: {difficulty}
- Answer must match one option EXACTLY (character-by-character)

Generate the quiz JSON now:"""
            
            try:
                result = self.ollama_json.generate_json(
                    prompt=user_prompt,
                    system=system_prompt,
                    temperature=0.35,
                    max_tokens=1200
                )
            except Exception as e:
                logger.warning(f"Quiz JSON generation failed, using fallback: {e}")
                result = {"quiz": []}
            
            quiz = result.get('quiz', [])
            
            # Validate and normalize structure
            normalized_quiz = []
            for q in quiz[:num_questions]:
                if isinstance(q, dict) and 'question' in q:
                    options = q.get('options', [])
                    answer = q.get('answer', '')
                    
                    # Clean up options: remove letter prefixes like "A. ", "B. ", etc.
                    cleaned_options = []
                    for opt in options:
                        if isinstance(opt, str):
                            # Remove patterns like "A. ", "B. ", "1. ", etc.
                            import re
                            cleaned = re.sub(r'^[A-D][\.\)]\s*', '', opt.strip())
                            cleaned_options.append(cleaned)
                    
                    options = cleaned_options
                    
                    # Clean up answer field: handle "Option A", "Option B" format
                    if answer and isinstance(answer, str):
                        # If answer is "Option X", try to map to actual option
                        option_pattern = re.match(r'Option\s+([A-D])', answer, re.IGNORECASE)
                        if option_pattern:
                            letter = option_pattern.group(1).upper()
                            index = ord(letter) - ord('A')
                            if 0 <= index < len(options):
                                answer = options[index]
                                logger.info(f"Converted '{q.get('answer')}' to '{answer}'")
                        else:
                            # Try to clean the answer like we did options
                            answer = re.sub(r'^[A-D][\.\)]\s*', '', answer.strip())
                    
                    # Validate based on question type
                    if question_type == 'true-false':
                        # Must have exactly 2 options
                        if len(options) != 2 or not all(opt in ['True', 'False'] for opt in options):
                            options = ['True', 'False']
                    elif question_type == 'short-answer':
                        # No options needed for short answer
                        options = []
                    else:  # multiple-choice
                        # Must have exactly 4 options with actual content
                        if len(options) < 4:
                            logger.warning(f"Question has only {len(options)} options, skipping: {q.get('question', '')[:50]}")
                            continue  # Skip questions with incomplete options
                        elif len(options) > 4:
                            options = options[:4]
                        
                        # Validate options are not generic placeholders
                        generic_patterns = [
                            ['option a', 'option b', 'option c', 'option d'],
                            ['a', 'b', 'c', 'd'],
                            ['', '', '', '']
                        ]
                        options_lower = [opt.lower().strip() for opt in options]
                        if options_lower in generic_patterns or all(len(opt) < 3 for opt in options):
                            logger.warning(f"Question has generic/empty options, skipping: {q.get('question', '')[:50]}")
                            continue  # Skip questions with placeholder options
                        
                        # Ensure answer matches one of the options
                        if answer not in options:
                            logger.warning(f"Answer '{answer}' not in options, using first option as fallback")
                            answer = options[0] if options else ''
                    
                    normalized_quiz.append({
                        'question': q.get('question', ''),
                        'options': options,
                        'answer': answer,
                        'explanation': q.get('explanation', ''),
                        'difficulty': q.get('difficulty', 'normal'),
                        'time_estimate': q.get('time_estimate', '2 minutes'),
                        'userAnswer': None,
                        'score': None
                    })
            
            if not normalized_quiz:
                # Fallback question based on question type
                logger.warning(f"Using fallback {question_type} quiz structure")
                if question_type == 'true-false':
                    normalized_quiz = [{
                        'question': 'The material covers multiple important concepts. True or False?',
                        'options': ['True', 'False'],
                        'answer': 'True',
                        'explanation': 'The material contains several key concepts worth studying.',
                        'difficulty': 'easy',
                        'time_estimate': '1 minute',
                        'userAnswer': None,
                        'score': None
                    }]
                elif question_type == 'short-answer':
                    normalized_quiz = [{
                        'question': 'What are the main concepts covered in this material?',
                        'options': [],
                        'answer': 'The material covers several key concepts related to the subject matter.',
                        'explanation': 'Your answer should identify the main topics discussed.',
                        'difficulty': 'easy',
                        'time_estimate': '3 minutes',
                        'userAnswer': None,
                        'score': None
                    }]
                else:  # multiple-choice
                    normalized_quiz = [{
                        'question': 'What are the main concepts covered in this material?',
                        'options': ['Fundamental principles', 'Advanced applications', 'Practical examples', 'All of the above'],
                        'answer': 'All of the above',
                        'explanation': 'The material covers multiple key concepts including principles, applications, and examples.',
                        'difficulty': 'easy',
                        'time_estimate': '2 minutes',
                        'userAnswer': None,
                        'score': None
                    }]
            
            logger.info(f"Quiz generated ({len(normalized_quiz)} questions)")
            
            return normalized_quiz
        
        except Exception as e:
            logger.error(f"Quiz generation failed: {e}")
            raise
    
    def generate_flashcards(self, content: str, assignment: Optional[str] = None, num_cards: int = 10) -> List[Dict[str, str]]:
        """
        Generate flashcards for study.
        
        Args:
            content: Extracted text content
            assignment: Optional task description
            num_cards: Number of flashcards to generate
        
        Returns:
            List of flashcard dicts with Q, A, category
        """
        try:
            logger.info(f"Generating {num_cards} flashcards...")
            
            system_prompt = """You are an academic assistant AI specialized in creating effective study flashcards.
Create clear, concise question-answer pairs that help students review and memorize key concepts."""
            
            user_prompt = f"""Assignment: {assignment or 'Create study flashcards from the material'}

Content:
{content[:15000]}

Instructions:
- Generate {num_cards} flashcards covering important concepts, definitions, and facts
- Question should be clear and specific
- Answer should be concise but complete (1-3 sentences)
- Categorize each card by topic/subject area
- Focus on testable knowledge and understanding

Return ONLY valid JSON in this exact format:
{{
  "flashcards": [
    {{
      "Q": "Question?",
      "A": "Answer.",
      "category": "Topic/Category"
    }}
  ]
}}

Generate the flashcards JSON now:"""
            
            try:
                result = self.ollama_json.generate_json(
                    prompt=user_prompt,
                    system=system_prompt,
                    temperature=0.35,
                    max_tokens=1000
                )
            except Exception as e:
                logger.warning(f"Flashcards JSON generation failed, using fallback: {e}")
                result = {"flashcards": []}
            
            flashcards = result.get('flashcards', [])
            
            # Validate and normalize structure
            normalized_flashcards = []
            for fc in flashcards[:num_cards]:
                if isinstance(fc, dict) and 'Q' in fc and 'A' in fc:
                    normalized_flashcards.append({
                        'Q': fc.get('Q', ''),
                        'A': fc.get('A', ''),
                        'category': fc.get('category', 'General')
                    })
            
            if not normalized_flashcards:
                # Fallback flashcard
                logger.warning("Using fallback flashcards structure")
                normalized_flashcards = [{
                    'Q': 'What is the main topic of this material?',
                    'A': 'Review the material to identify key concepts and themes.',
                    'category': 'General'
                }]
            
            logger.info(f"Flashcards generated ({len(normalized_flashcards)} cards)")
            
            return normalized_flashcards
        
        except Exception as e:
            logger.error(f"Flashcards generation failed: {e}")
            raise
    
    def generate_all_studytools(
        self,
        content: str,
        assignment: Optional[str] = None,
        num_quiz_questions: int = 5,
        num_flashcards: int = 10
    ) -> Dict[str, Any]:
        """
        Generate all study tools (summary, keypoints, quiz, flashcards) at once.
        
        Args:
            content: Extracted text content
            assignment: Optional task description
            num_quiz_questions: Number of quiz questions
            num_flashcards: Number of flashcards
        
        Returns:
            Complete studytools dict with all components and metadata
        """
        try:
            logger.info("Generating complete StudyTools package...")
            
            # Generate all components
            summary = self.generate_summary(content, assignment)
            keypoints = self.generate_keypoints(content, assignment)
            quiz = self.generate_quiz(content, assignment, num_quiz_questions)
            flashcards = self.generate_flashcards(content, assignment, num_flashcards)
            
            # Calculate metadata
            total_questions = len(quiz)
            total_score = f"0/{total_questions}"
            
            # Estimate completion time
            quiz_time = sum([int(q.get('time_estimate', '2').split()[0]) for q in quiz])
            reading_time = int(summary.get('reading_time', '5').split()[0])
            completion_time = f"{reading_time + quiz_time + 10} min"
            
            # Determine difficulty level
            difficulty_counts = {'easy': 0, 'normal': 0, 'hard': 0}
            for q in quiz:
                diff = q.get('difficulty', 'normal')
                difficulty_counts[diff] = difficulty_counts.get(diff, 0) + 1
            
            if difficulty_counts['hard'] > difficulty_counts['easy']:
                difficulty_level = 'hard'
            elif difficulty_counts['easy'] > difficulty_counts['normal']:
                difficulty_level = 'easy'
            else:
                difficulty_level = 'normal'
            
            # Build complete studytools structure
            studytools = {
                "summary": summary,
                "keypoints": keypoints,
                "quiz": quiz,
                "flashcards": flashcards,
                "metadata": {
                    "total_score": total_score,
                    "completion_time": completion_time,
                    "difficulty_level": difficulty_level,
                    "progress": "0/4 sections complete",
                    "next_steps": [
                        "Review the summary and keypoints",
                        "Test your knowledge with the quiz",
                        "Practice with flashcards",
                        "Revisit difficult concepts"
                    ]
                }
            }
            
            logger.info("Complete StudyTools package generated")
            
            return studytools
        
        except Exception as e:
            logger.error(f"StudyTools generation failed: {e}")
            raise

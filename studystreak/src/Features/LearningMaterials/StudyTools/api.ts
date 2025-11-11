import { apiClient } from '@/lib/apiClient';
import type {
  StudySummary,
  StudyKeyPoints,
  StructuredKeyPoints,
  StudyNote,
  StudyQuiz,
  StudyFlashcards,
  QuizType,
  QuizDifficulty,
} from './types';

const BASE_PATH = '/api/materials';

export async function fetchSummary(
  materialId: string,
  minWords?: number,
  maxWords?: number,
  regenerate?: boolean
): Promise<StudySummary> {
  const response = await apiClient.post<{ success: boolean; summary: StudySummary['summary'] }>(
    `${BASE_PATH}/${materialId}/study-tools/summary`,
    { min_words: minWords, max_words: maxWords, regenerate }
  );
  // Backend wraps response in {success, summary}, unwrap it
  return {
    materialId,
    summary: response.summary,
    generatedAt: new Date().toISOString(),
  };
}

export async function fetchKeyPoints(materialId: string): Promise<StudyKeyPoints> {
  const response = await apiClient.get<{ success: boolean; keypoints: Array<{topic: string; terms: Array<{term: string; definition: string; importance: string}>}> }>(
    `${BASE_PATH}/${materialId}/study-tools/keypoints`
  );
  // Backend wraps response, unwrap and transform to frontend format
  const keypoints = response.keypoints.flatMap(topic => 
    topic.terms.map(term => ({
      id: `${topic.topic}-${term.term}`.replace(/\s+/g, '-'),
      text: `${term.term}: ${term.definition}`,
      category: topic.topic,
    }))
  );
  return {
    materialId,
    keypoints,
    generatedAt: new Date().toISOString(),
  };
}

export async function fetchKeyPointsV2(
  materialId: string,
  page = 1,
  pageSize = 24
): Promise<StructuredKeyPoints> {
  const response = await apiClient.get<{ success: boolean; keypoints: Array<{topic: string; terms: Array<{term: string; definition: string; importance: string}>}> }>(
    `${BASE_PATH}/${materialId}/study-tools/keypoints-v2?page=${page}&page_size=${pageSize}`
  );
  // Backend wraps response, unwrap and transform to StructuredKeyPoints format
  const items = response.keypoints.flatMap(topic =>
    topic.terms.map(term => ({
      term: term.term,
      definition: term.definition,
      shortDefinition: term.definition,
      icon: '📌',
      importance: term.importance === 'high' ? 0.9 : term.importance === 'medium' ? 0.6 : 0.3,
      usage: null,
    }))
  );
  return {
    materialId,
    items,
    count: items.length,
    total_count: items.length,
    page,
    pageSize,
    confidence: 0.85,
    generatedAt: new Date().toISOString(),
  };
}

export async function fetchQuiz(
  materialId: string,
  type: QuizType,
  difficulty: QuizDifficulty,
  questionCount: number
): Promise<StudyQuiz> {
  const response = await apiClient.post<{ success: boolean; quiz: Array<{question: string; options: string[]; answer: string; explanation: string; difficulty: string}> }>(
    `${BASE_PATH}/${materialId}/study-tools/quiz`,
    { question_type: type, difficulty, question_count: questionCount }
  );
  // Backend wraps response, unwrap and transform to frontend format
  const questions = response.quiz.map((q, idx) => ({
    id: `q-${idx}`,
    question: q.question,
    type: (q.options && q.options.length > 0) ? 'multiple-choice' as QuizType : 'short-answer' as QuizType,
    options: q.options || undefined,
    correctAnswer: q.answer,
    explanation: q.explanation,
  }));
  return {
    materialId,
    type,
    difficulty,
    questions,
    generatedAt: new Date().toISOString(),
  };
}

export async function fetchFlashcards(materialId: string): Promise<StudyFlashcards> {
  const response = await apiClient.get<{ success: boolean; flashcards: Array<{Q: string; A: string; category: string}> }>(
    `${BASE_PATH}/${materialId}/study-tools/flashcards`
  );
  // Backend wraps response, unwrap and transform to frontend format
  const flashcards = response.flashcards.map((fc, idx) => ({
    id: `fc-${idx}`,
    question: fc.Q,
    answer: fc.A,
    category: fc.category,
  }));
  return {
    materialId,
    flashcards,
    generatedAt: new Date().toISOString(),
  };
}

export async function fetchStudyNote(
  materialId: string,
  minWords?: number,
  maxWords?: number
): Promise<StudyNote> {
  const response = await apiClient.post<StudyNote>(
    `${BASE_PATH}/${materialId}/study-tools/study-note`,
    { min_words: minWords, max_words: maxWords }
  );
  return response;
}

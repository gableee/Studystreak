import { apiClient } from '@/lib/apiClient';
import type {
  StudySummary,
  StudyKeyPoints,
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
  const response = await apiClient.post<StudySummary>(
    `${BASE_PATH}/${materialId}/study-tools/summary`,
    { min_words: minWords, max_words: maxWords, regenerate }
  );
  return response;
}

export async function fetchKeyPoints(materialId: string): Promise<StudyKeyPoints> {
  const response = await apiClient.get<StudyKeyPoints>(
    `${BASE_PATH}/${materialId}/study-tools/keypoints`
  );
  return response;
}

export async function fetchQuiz(
  materialId: string,
  type: QuizType,
  difficulty: QuizDifficulty,
  questionCount: number
): Promise<StudyQuiz> {
  const response = await apiClient.post<StudyQuiz>(
    `${BASE_PATH}/${materialId}/study-tools/quiz`,
    { question_type: type, difficulty, question_count: questionCount }
  );
  return response;
}

export async function fetchFlashcards(materialId: string): Promise<StudyFlashcards> {
  const response = await apiClient.get<StudyFlashcards>(
    `${BASE_PATH}/${materialId}/study-tools/flashcards`
  );
  return response;
}

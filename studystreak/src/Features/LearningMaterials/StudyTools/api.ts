import { apiClient } from '@/lib/apiClient';
import type {
  StudySummary,
  StudyKeyPoints,
  StudyQuiz,
  StudyFlashcards,
  QuizType,
  QuizDifficulty,
} from './types';

const BASE_PATH = '/materials';

export async function fetchSummary(materialId: string): Promise<StudySummary> {
  const response = await apiClient.get<StudySummary>(
    `${BASE_PATH}/${materialId}/study-tools/summary`
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
  difficulty: QuizDifficulty
): Promise<StudyQuiz> {
  const response = await apiClient.post<StudyQuiz>(
    `${BASE_PATH}/${materialId}/study-tools/quiz`,
    { type, difficulty }
  );
  return response;
}

export async function fetchFlashcards(materialId: string): Promise<StudyFlashcards> {
  const response = await apiClient.get<StudyFlashcards>(
    `${BASE_PATH}/${materialId}/study-tools/flashcards`
  );
  return response;
}

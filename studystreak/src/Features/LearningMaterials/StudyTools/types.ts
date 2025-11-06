export type StudyToolTab = 'summary' | 'keypoints' | 'quiz' | 'flashcards';

export interface StudySummary {
  materialId: string;
  summary: string;
  generatedAt: string;
}

export interface KeyPoint {
  id: string;
  text: string;
  category?: string;
}

export interface StudyKeyPoints {
  materialId: string;
  keypoints: KeyPoint[];
  generatedAt: string;
}

export type QuizType = 'multiple-choice' | 'true-false' | 'short-answer';
export type QuizDifficulty = 'easy' | 'normal' | 'hard';

export interface QuizQuestion {
  id: string;
  question: string;
  type: QuizType;
  options?: string[]; // For multiple-choice
  correctAnswer: string | string[]; // Support multiple correct answers
  explanation?: string;
}

export interface StudyQuiz {
  materialId: string;
  type: QuizType;
  difficulty: QuizDifficulty;
  questions: QuizQuestion[];
  generatedAt: string;
}

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  category?: string;
}

export interface StudyFlashcards {
  materialId: string;
  flashcards: Flashcard[];
  generatedAt: string;
}

export interface StudyToolsData {
  summary: StudySummary | null;
  keypoints: StudyKeyPoints | null;
  quiz: StudyQuiz | null;
  flashcards: StudyFlashcards | null;
}

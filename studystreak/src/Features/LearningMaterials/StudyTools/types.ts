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

export interface KeyPointV2Item {
  term: string;
  definition: string; // Backwards compatible: maps to shortDefinition
  shortDefinition?: string; // Concise 1-2 sentences (~25 words)
  fullDefinition?: string; // Complete definition with all details
  bulletedHighlights?: string[]; // 2-6 key facts as bullet points
  usage?: string | null;
  icon: string;
  importance: number; // 0..1
  sourceSpan?: string | null;
}

export interface StructuredKeyPoints {
  materialId: string;
  items: KeyPointV2Item[];
  count: number;
  total_count: number;
  page: number;
  pageSize: number;
  confidence: number;
  generatedAt: string;
}

export interface StudyNoteOutlineItem {
  title: string;
  level: number;
}

export interface StudyNote {
  materialId: string;
  documentMarkdown: string;
  outline: StudyNoteOutlineItem[];
  wordCount: number;
  confidence: number;
  keypointsCount: number;
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

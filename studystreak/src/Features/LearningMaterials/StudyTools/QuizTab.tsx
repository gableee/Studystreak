import { useState } from 'react';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { fetchQuiz } from './api';
import type { StudyQuiz, QuizType, QuizDifficulty } from './types';

interface QuizTabProps {
  materialId: string;
}

export function QuizTab({ materialId }: QuizTabProps) {
  const [quiz, setQuiz] = useState<StudyQuiz | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<QuizType>('multiple-choice');
  const [selectedDifficulty, setSelectedDifficulty] = useState<QuizDifficulty>('normal');

  const types: { value: QuizType; label: string }[] = [
    { value: 'multiple-choice', label: 'Multiple Choice' },
    { value: 'true-false', label: 'True/False' },
    { value: 'short-answer', label: 'Short Answer' },
  ];

  const difficulties: { value: QuizDifficulty; label: string }[] = [
    { value: 'easy', label: 'Easy' },
    { value: 'normal', label: 'Normal' },
    { value: 'hard', label: 'Hard' },
  ];

  async function handleGenerateQuiz() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchQuiz(materialId, selectedType, selectedDifficulty);
      setQuiz(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate quiz');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Quiz Controls */}
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-lg border border-slate-200/60 dark:bg-white/5 dark:border-slate-700/60 space-y-6">
        {/* Type Selector */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
            Quiz Type
          </label>
          <div className="bg-slate-100/80 p-1 rounded-2xl inline-flex gap-1 dark:bg-slate-800/80">
            {types.map((type) => (
              <button
                key={type.value}
                onClick={() => setSelectedType(type.value)}
                disabled={loading}
                className={`
                  px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300
                  ${
                    selectedType === type.value
                      ? 'bg-white text-slate-900 shadow-md dark:bg-slate-700 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty Selector */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
            Difficulty
          </label>
          <div className="bg-slate-100/80 p-1 rounded-2xl inline-flex gap-1 dark:bg-slate-800/80">
            {difficulties.map((diff) => (
              <button
                key={diff.value}
                onClick={() => setSelectedDifficulty(diff.value)}
                disabled={loading}
                className={`
                  px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300
                  ${
                    selectedDifficulty === diff.value
                      ? 'bg-white text-slate-900 shadow-md dark:bg-slate-700 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                {diff.label}
              </button>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerateQuiz}
          disabled={loading}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold py-3.5 px-6 rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Generating Quiz...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>Generate Quiz</span>
            </>
          )}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50/50 backdrop-blur-sm rounded-3xl p-6 border border-red-100 dark:bg-red-500/10 dark:border-red-500/30">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 dark:text-red-200 mb-1">Failed to generate quiz</h3>
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Quiz Display (placeholder for now) */}
      {quiz && quiz.questions.length > 0 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-lg border border-slate-200/60 dark:bg-white/5 dark:border-slate-700/60">
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            <span>AI Generated Quiz</span>
            <span className="text-slate-400 dark:text-slate-500">
              • {quiz.questions.length} questions
            </span>
          </div>
          
          <div className="space-y-6">
            {quiz.questions.map((question, index) => (
              <div key={question.id} className="border-b border-slate-200 dark:border-slate-700 last:border-0 pb-6 last:pb-0">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-slate-900 dark:text-white font-medium mb-3">{question.question}</p>
                    {question.options && (
                      <div className="space-y-2">
                        {question.options.map((option, optIndex) => (
                          <div
                            key={optIndex}
                            className="p-3 bg-slate-50 rounded-xl text-slate-700 dark:bg-slate-800/50 dark:text-slate-200 text-sm"
                          >
                            {option}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

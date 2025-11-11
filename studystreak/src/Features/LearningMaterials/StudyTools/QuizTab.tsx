import { useState } from 'react';
import { Sparkles, Loader2, AlertCircle, History, Play } from 'lucide-react';
import { fetchQuiz, submitQuizAttempt } from './api';
import { apiClient } from '@/lib/apiClient';
import { supabase } from '@/lib/supabaseClient';
import { QuizHistoryView } from '@/components/QuizHistoryView';
import type { StudyQuiz, QuizType, QuizDifficulty } from './types';

interface QuizTabProps {
  materialId: string;
}

type QuizMode = 'take-quiz' | 'history';

export function QuizTab({ materialId }: QuizTabProps) {
  const [mode, setMode] = useState<QuizMode>('take-quiz');
  const [quiz, setQuiz] = useState<StudyQuiz | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<QuizType>('multiple-choice');
  const [selectedDifficulty, setSelectedDifficulty] = useState<QuizDifficulty>('normal');
  const [questionCount, setQuestionCount] = useState<number>(5);
  
  // Quiz attempt state
  const [userAnswers, setUserAnswers] = useState<Record<string, string[]>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<{ correct: number; total: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [quizStartTime, setQuizStartTime] = useState<number | null>(null);

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
      const data = await fetchQuiz(materialId, selectedType, selectedDifficulty, questionCount);
      setQuiz(data);
      // Reset quiz attempt state
      setUserAnswers({});
      setSubmitted(false);
      setScore(null);
      setSubmitError(null);
      setQuizStartTime(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate quiz');
    } finally {
      setLoading(false);
    }
  }

  function handleAnswerSelect(questionId: string, answer: string, isMultipleCorrect: boolean) {
    if (submitted) return; // Can't change answers after submission

    setUserAnswers((prev) => {
      const current = prev[questionId] || [];
      
      // For short-answer (text input), always replace with new text
      if (!quiz) return prev;
      const question = quiz.questions.find(q => q.id === questionId);
      if (question && question.options && question.options.length === 0) {
        // Short answer: store the text directly
        return { ...prev, [questionId]: [answer] };
      }
      
      if (isMultipleCorrect) {
        // Checkbox behavior: toggle selection
        if (current.includes(answer)) {
          return { ...prev, [questionId]: current.filter((a) => a !== answer) };
        } else {
          return { ...prev, [questionId]: [...current, answer] };
        }
      } else {
        // Radio button behavior: replace selection
        return { ...prev, [questionId]: [answer] };
      }
    });
  }

  async function handleSubmit() {
    if (!quiz) return;

    let correct = 0;
    const responses: Array<{
      question_id: string;
      user_answer: string | string[];
      is_correct: boolean;
      response_time_ms?: number;
    }> = [];

    quiz.questions.forEach((question) => {
      const userAnswer = userAnswers[question.id] || [];
      const correctAnswer = question.correctAnswer;
      
      // Compare answers (case-insensitive, trimmed)
      const userAnswerSet = new Set(userAnswer.map((a) => a.toLowerCase().trim()));
      const correctAnswerSet = new Set(
        Array.isArray(correctAnswer) 
          ? correctAnswer.map((a) => a.toLowerCase().trim())
          : [correctAnswer.toLowerCase().trim()]
      );

      // Check if sets are equal
      const isCorrect = (
        userAnswerSet.size === correctAnswerSet.size &&
        [...userAnswerSet].every((a) => correctAnswerSet.has(a))
      );

      if (isCorrect) {
        correct++;
      }

      responses.push({
        question_id: question.id,
        user_answer: userAnswer.length === 1 ? userAnswer[0] : userAnswer,
        is_correct: isCorrect,
      });
    });

    setScore({ correct, total: quiz.questions.length });
    setSubmitted(true);

    // Submit to backend
    setSubmitting(true);
    setSubmitError(null);
    try {
      const timeSpent = quizStartTime ? Math.round((Date.now() - quizStartTime) / 1000) : 0;
      
      await submitQuizAttempt(materialId, {
        quiz_id: `${selectedType}-${selectedDifficulty}-${Date.now()}`,
        score: Math.round((correct / quiz.questions.length) * 100),
        total_questions: quiz.questions.length,
        correct_answers: correct,
        time_spent: timeSpent,
        responses,
      });

      // Success - quiz saved to history
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save quiz results');
      console.error('Failed to submit quiz:', err);
    } finally {
      setSubmitting(false);
    }
  }

  function isAnswerCorrect(questionId: string): boolean | null {
    if (!submitted || !quiz) return null;
    
    const question = quiz.questions.find((q) => q.id === questionId);
    if (!question) return null;

    const userAnswer = userAnswers[questionId] || [];
    const correctAnswer = question.correctAnswer;
    
    const userAnswerSet = new Set(userAnswer.map((a) => a.toLowerCase().trim()));
    const correctAnswerSet = new Set(
      Array.isArray(correctAnswer) 
        ? correctAnswer.map((a) => a.toLowerCase().trim())
        : [correctAnswer.toLowerCase().trim()]
    );

    return (
      userAnswerSet.size === correctAnswerSet.size &&
      [...userAnswerSet].every((a) => correctAnswerSet.has(a))
    );
  }

  function isOptionCorrect(questionId: string, option: string): boolean {
    if (!quiz) return false;
    
    const question = quiz.questions.find((q) => q.id === questionId);
    if (!question) return false;

    const correctAnswer = question.correctAnswer;
    const correctAnswerSet = new Set(
      Array.isArray(correctAnswer) 
        ? correctAnswer.map((a) => a.toLowerCase().trim())
        : [correctAnswer.toLowerCase().trim()]
    );

    return correctAnswerSet.has(option.toLowerCase().trim());
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Mode Switcher */}
      <div className="bg-slate-100/80 backdrop-blur-sm p-1 rounded-2xl inline-flex gap-1 shadow-inner dark:bg-slate-800/80">
        <button
          onClick={() => setMode('take-quiz')}
          className={`
            px-6 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 flex items-center gap-2
            ${
              mode === 'take-quiz'
                ? 'bg-white text-slate-900 shadow-md scale-[1.02] dark:bg-slate-700 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
            }
          `}
        >
          <Play className="w-4 h-4" />
          <span>Take Quiz</span>
        </button>
        <button
          onClick={() => setMode('history')}
          className={`
            px-6 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 flex items-center gap-2
            ${
              mode === 'history'
                ? 'bg-white text-slate-900 shadow-md scale-[1.02] dark:bg-slate-700 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
            }
          `}
        >
          <History className="w-4 h-4" />
          <span>History</span>
        </button>
      </div>

      {/* Content Based on Mode */}
      {mode === 'history' ? (
        <QuizHistoryView materialId={materialId} />
      ) : (
        <>
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

            {/* Question Count */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
                Number of Questions
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={questionCount}
                onChange={(e) => setQuestionCount(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
                className="w-28 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700"
              />
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

          {/* Quiz Display */}
          {quiz && quiz.questions.length > 0 && (
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-lg border border-slate-200/60 dark:bg-white/5 dark:border-slate-700/60">
              <div className="flex items-center justify-between gap-2 mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 text-sm font-medium">
                    <Sparkles className="w-4 h-4" />
                    <span>AI Generated Quiz</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="px-2.5 py-1 bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 rounded-lg font-medium capitalize">
                      {selectedType.replace('-', ' ')}
                    </span>
                    <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg font-medium capitalize">
                      {selectedDifficulty}
                    </span>
                    <span className="text-slate-400 dark:text-slate-500">
                      • {quiz.questions.length} questions
                    </span>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const { data } = await supabase.auth.getSession();
                    const token = data.session?.access_token;
                    const url = `${apiClient.baseUrl}/api/materials/${materialId}/study-tools/quiz.pdf`;
                    const res = await fetch(url, {
                      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                    });
                    const blob = await res.blob();
                    const dlUrl = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = dlUrl;
                    a.download = 'quiz.pdf';
                    document.body.appendChild(a);
                    a.click();
                    URL.revokeObjectURL(dlUrl);
                    a.remove();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition text-sm"
                >
                  Download PDF
                </button>
              </div>

              {/* Score Display */}
              {submitted && score && (
                <div className="mb-6 p-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-500/10 dark:to-blue-500/10 rounded-2xl border border-purple-200 dark:border-purple-500/30">
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                      Quiz Complete!
                    </h3>
                    <p className="text-lg text-slate-700 dark:text-slate-300">
                      You scored{' '}
                      <span className="font-bold text-purple-600 dark:text-purple-400">
                        {score.correct} out of {score.total}
                      </span>
                      {' '}({Math.round((score.correct / score.total) * 100)}%)
                    </p>
                    {submitting && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                        Saving to history...
                      </p>
                    )}
                    {submitError && (
                      <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                        Failed to save: {submitError}
                      </p>
                    )}
                    {!submitting && !submitError && (
                      <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                        ✓ Saved to quiz history
                      </p>
                    )}
                  </div>
                </div>
              )}
              
              <div className="space-y-8">
                {quiz.questions.map((question, index) => {
                  const isMultipleCorrect = Array.isArray(question.correctAnswer) && question.correctAnswer.length > 1;
                  const questionCorrect = isAnswerCorrect(question.id);
                  const userSelectedAnswers = userAnswers[question.id] || [];

                  return (
                    <div key={question.id} className="border-b border-slate-200 dark:border-slate-700 last:border-0 pb-8 last:pb-0">
                      <div className="flex gap-4">
                        <div className={`
                          flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm
                          ${submitted && questionCorrect === true ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300' : ''}
                          ${submitted && questionCorrect === false ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300' : ''}
                          ${!submitted ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300' : ''}
                        `}>
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          {/* Question Text */}
                          <p className="text-slate-900 dark:text-white font-semibold mb-4 text-lg">
                            {question.question}
                          </p>

                          {/* Short Answer Input */}
                          {question.type === 'short-answer' && (
                            <div className="space-y-3">
                              <textarea
                                value={userSelectedAnswers[0] || ''}
                                onChange={(e) => handleAnswerSelect(question.id, e.target.value, false)}
                                disabled={submitted}
                                placeholder="Type your answer here..."
                                rows={4}
                                className={`
                                  w-full p-4 rounded-xl border-2 transition-all duration-200
                                  ${!submitted ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:border-purple-400 dark:focus:border-purple-500 focus:outline-none' : ''}
                                  ${submitted ? 'bg-slate-100 dark:bg-slate-800/30 border-slate-300 dark:border-slate-600 cursor-not-allowed' : ''}
                                  text-slate-900 dark:text-white
                                `}
                              />
                              {submitted && (
                                <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-xl border border-blue-200 dark:border-blue-500/30">
                                  <p className="text-sm text-blue-900 dark:text-blue-100">
                                    <span className="font-semibold">Model Answer: </span>
                                    {question.correctAnswer}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Multiple Choice / True-False Options */}
                          {question.options && question.options.length > 0 && (
                            <div className="space-y-2">
                              {question.options.map((option, optIndex) => {
                                const isSelected = userSelectedAnswers.includes(option);
                                const isCorrectOption = isOptionCorrect(question.id, option);
                                const showCorrect = submitted && isCorrectOption;
                                const showWrong = submitted && isSelected && !isCorrectOption;

                                return (
                                  <button
                                    key={optIndex}
                                    onClick={() => handleAnswerSelect(question.id, option, isMultipleCorrect)}
                                    disabled={submitted}
                                    className={`
                                      w-full p-4 rounded-xl text-left transition-all duration-200 flex items-center gap-3 border-2
                                      ${!submitted && !isSelected ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-500 hover:bg-slate-100 dark:hover:bg-slate-700/50' : ''}
                                      ${!submitted && isSelected ? 'bg-purple-100 dark:bg-purple-500/20 border-purple-400 dark:border-purple-500' : ''}
                                      ${showCorrect && isSelected ? 'bg-green-50 dark:bg-green-500/20 border-2 border-green-600 dark:border-green-500' : ''}
                                        ${showCorrect && !isSelected ? 'bg-green-50 dark:bg-green-900/10 border-2 border-green-500 dark:border-green-800/70' : ''}
                                      ${showWrong ? 'bg-red-100 dark:bg-red-500/20 border-red-500 dark:border-red-400' : ''}
                                      ${submitted ? 'cursor-not-allowed' : 'cursor-pointer'}
                                    `}
                                  >
                                    {/* Checkbox/Radio Circle */}
                                    <div className={`
                                      flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center
                                      ${!submitted && isSelected ? 'border-purple-500 bg-purple-500' : ''}
                                      ${!submitted && !isSelected ? 'border-slate-300 dark:border-slate-600' : ''}
                                      ${showCorrect && isSelected ? 'border-green-600 bg-white' : ''}
                                      ${showCorrect && !isSelected ? 'border-green-700 bg-transparent' : ''}
                                      ${showWrong ? 'border-red-500 bg-red-500' : ''}
                                      ${submitted && !showCorrect && !showWrong ? 'border-slate-300 dark:border-slate-600' : ''}
                                    `}>
                                      {(isSelected || showCorrect) && (
                                        <div className={`w-2 h-2 rounded-full ${
                                          showCorrect && isSelected ? 'bg-green-600' : 
                                          showCorrect && !isSelected ? 'bg-white' :
                                          'bg-white'
                                        }`}></div>
                                      )}
                                    </div>

                                    {/* Option Text */}
                                    <span className={`
                                      flex-1 text-sm font-medium
                                      ${showCorrect && isSelected ? 'text-green-900 dark:text-white font-semibold' : ''}
                                      ${showCorrect && !isSelected ? 'text-green-800 dark:text-green-200' : ''}
                                      ${showWrong ? 'text-red-900 dark:text-red-100' : ''}
                                      ${!submitted ? 'text-slate-700 dark:text-slate-200' : ''}
                                      ${submitted && !showCorrect && !showWrong ? 'text-slate-500 dark:text-slate-400' : ''}
                                    `}>
                                      {option}
                                    </span>

                                    {/* Correct/Wrong Indicators */}
                                    {showCorrect && isSelected && (
                                      <span className="text-xs font-semibold text-white bg-green-700 dark:bg-green-800 px-2 py-1 rounded-lg">
                                        ✓ Correct
                                      </span>
                                    )}
                                    {showCorrect && !isSelected && (
                                      <span className="text-xs font-semibold text-green-700 dark:text-green-300 bg-green-200/60 dark:bg-green-900/20 px-2 py-1 rounded-lg">
                                        ✓ Correct Answer
                                      </span>
                                    )}
                                    {showWrong && (
                                      <span className="text-xs font-semibold text-red-700 dark:text-red-300 bg-red-200 dark:bg-red-900/30 px-2 py-1 rounded-lg">
                                        ✗ Wrong
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {/* Explanation (shown after submission) */}
                          {submitted && question.explanation && (
                            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-500/10 rounded-xl border border-blue-200 dark:border-blue-500/30">
                              <p className="text-sm text-blue-900 dark:text-blue-100">
                                <span className="font-semibold">Explanation: </span>
                                {question.explanation}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Submit Button */}
              {!submitted && (
                <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                  <button
                    onClick={handleSubmit}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold py-3.5 px-6 rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                  >
                    Submit Quiz
                  </button>
                </div>
              )}

              {/* Retake Button */}
              {submitted && (
                <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => {
                      setUserAnswers({});
                      setSubmitted(false);
                      setScore(null);
                    }}
                    className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold py-3.5 px-6 rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                  >
                    Retake Quiz
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

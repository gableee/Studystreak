import { useState, useEffect } from 'react';
import {
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertCircle,
  Trophy,
  Target,
  BarChart3,
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// ==================== TypeScript Interfaces ====================

interface QuizAttemptResponse {
  question_id: string;
  user_answer: string | string[] | null;
  is_correct: boolean;
  correct_answer: string | string[];
  response_time_ms: number | null;
}

interface QuizAttempt {
  attempt_id: string;
  quiz_id: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  percentage: number;
  time_spent: number;
  completed_at: string;
  responses: QuizAttemptResponse[];
}

interface QuizHistoryResponse {
  material_id: string;
  attempts: QuizAttempt[];
  total_attempts: number;
}

interface QuizHistoryViewProps {
  materialId: string;
}

// ==================== Helper Functions ====================

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

function formatShortDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getScoreColor(percentage: number): string {
  if (percentage >= 90) return 'text-green-600 dark:text-green-400';
  if (percentage >= 70) return 'text-blue-600 dark:text-blue-400';
  if (percentage >= 50) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

function getScoreBgColor(percentage: number): string {
  if (percentage >= 90) return 'bg-green-100 dark:bg-green-500/20';
  if (percentage >= 70) return 'bg-blue-100 dark:bg-blue-500/20';
  if (percentage >= 50) return 'bg-yellow-100 dark:bg-yellow-500/20';
  return 'bg-red-100 dark:bg-red-500/20';
}

// ==================== Loading Skeleton ====================

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Chart Skeleton */}
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-lg border border-slate-200/60 dark:bg-white/5 dark:border-slate-700/60">
        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-xl w-48 mb-6"></div>
        <div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-2xl"></div>
      </div>

      {/* Attempt Cards Skeleton */}
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-lg border border-slate-200/60 dark:bg-white/5 dark:border-slate-700/60"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 space-y-3">
              <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded-lg w-32"></div>
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-lg w-48"></div>
            </div>
            <div className="h-16 w-16 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ==================== Empty State ====================

function EmptyState() {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-12 shadow-lg border border-slate-200/60 dark:bg-white/5 dark:border-slate-700/60 text-center">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 mb-6">
        <BarChart3 className="w-10 h-10 text-slate-400 dark:text-slate-500" />
      </div>
      <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
        No Quiz Attempts Yet
      </h3>
      <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
        Take your first quiz to see your progress and track your performance over time.
      </p>
    </div>
  );
}

// ==================== Error State ====================

interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}

function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div className="bg-red-50/50 backdrop-blur-sm rounded-3xl p-8 border border-red-100 dark:bg-red-500/10 dark:border-red-500/30">
      <div className="flex flex-col items-center text-center gap-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-500/20">
          <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>
        <div>
          <h3 className="font-semibold text-red-900 dark:text-red-200 mb-2 text-lg">
            Failed to Load Quiz History
          </h3>
          <p className="text-red-700 dark:text-red-300 text-sm mb-4">{error}</p>
        </div>
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry</span>
        </button>
      </div>
    </div>
  );
}

// ==================== Question Detail Modal ====================

interface QuestionDetailModalProps {
  attempt: QuizAttempt;
  onClose: () => void;
}

function QuestionDetailModal({ attempt, onClose }: QuestionDetailModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-8 py-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                Question Breakdown
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {formatDate(attempt.completed_at)} • {attempt.correct_answers}/{attempt.total_questions} correct
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              aria-label="Close modal"
            >
              <XCircle className="w-6 h-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
          {attempt.responses.map((response, index) => {
            const isCorrect = response.is_correct;
            const userAnswer = Array.isArray(response.user_answer)
              ? response.user_answer.join(', ')
              : String(response.user_answer || 'Not answered');
            const correctAnswer = Array.isArray(response.correct_answer)
              ? response.correct_answer.join(', ')
              : String(response.correct_answer);

            return (
              <div
                key={response.question_id}
                className={`
                  p-6 rounded-2xl border-2 transition-all duration-200
                  ${
                    isCorrect
                      ? 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30'
                      : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30'
                  }
                `}
              >
                {/* Question Number & Status */}
                <div className="flex items-start gap-4 mb-4">
                  <div
                    className={`
                    flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm
                    ${
                      isCorrect
                        ? 'bg-green-500 text-white'
                        : 'bg-red-500 text-white'
                    }
                  `}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      {isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                      )}
                      <span
                        className={`text-sm font-semibold ${
                          isCorrect
                            ? 'text-green-700 dark:text-green-300'
                            : 'text-red-700 dark:text-red-300'
                        }`}
                      >
                        {isCorrect ? 'Correct' : 'Incorrect'}
                      </span>
                      {response.response_time_ms && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 ml-auto">
                          {(response.response_time_ms / 1000).toFixed(1)}s
                        </span>
                      )}
                    </div>

                    {/* User Answer */}
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Your Answer:
                      </p>
                      <p
                        className={`text-sm font-medium ${
                          isCorrect
                            ? 'text-green-900 dark:text-green-100'
                            : 'text-red-900 dark:text-red-100'
                        }`}
                      >
                        {userAnswer}
                      </p>
                    </div>

                    {/* Correct Answer (shown if wrong) */}
                    {!isCorrect && (
                      <div>
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Correct Answer:
                        </p>
                        <p className="text-sm font-medium text-green-900 dark:text-green-100">
                          {correctAnswer}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="px-8 py-6 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold py-3.5 px-6 rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== Attempt Card ====================

interface AttemptCardProps {
  attempt: QuizAttempt;
  attemptNumber: number;
  onViewDetails: () => void;
}

function AttemptCard({ attempt, attemptNumber, onViewDetails }: AttemptCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-slate-200/60 dark:bg-white/5 dark:border-slate-700/60 overflow-hidden transition-all duration-300 hover:shadow-xl">
      {/* Card Header */}
      <div className="p-6">
        <div className="flex items-center justify-between gap-4">
          {/* Left Side - Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Attempt #{attemptNumber}
              </h3>
              <span
                className={`
                px-3 py-1 rounded-xl text-xs font-semibold
                ${getScoreBgColor(attempt.percentage)}
                ${getScoreColor(attempt.percentage)}
              `}
              >
                {Math.round(attempt.percentage)}%
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(attempt.completed_at)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>{formatTime(attempt.time_spent)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Target className="w-4 h-4" />
                <span>
                  {attempt.correct_answers}/{attempt.total_questions} correct
                </span>
              </div>
            </div>
          </div>

          {/* Right Side - Score Circle */}
          <div className="flex-shrink-0">
            <div
              className={`
              w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-bold shadow-md
              ${getScoreBgColor(attempt.percentage)}
            `}
            >
              <span className={`text-2xl ${getScoreColor(attempt.percentage)}`}>
                {attempt.correct_answers}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                /{attempt.total_questions}
              </span>
            </div>
          </div>
        </div>

        {/* Expand/Collapse Button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <span>{expanded ? 'Hide Details' : 'Show Details'}</span>
          {expanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-6 pb-6 animate-fade-in">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            {/* Stats Cards */}
            <div className="bg-green-50 dark:bg-green-500/10 rounded-2xl p-4 text-center">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mx-auto mb-2" />
              <div className="text-xl font-bold text-green-900 dark:text-green-100">
                {attempt.correct_answers}
              </div>
              <div className="text-xs text-green-700 dark:text-green-300">Correct</div>
            </div>

            <div className="bg-red-50 dark:bg-red-500/10 rounded-2xl p-4 text-center">
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 mx-auto mb-2" />
              <div className="text-xl font-bold text-red-900 dark:text-red-100">
                {attempt.total_questions - attempt.correct_answers}
              </div>
              <div className="text-xs text-red-700 dark:text-red-300">Wrong</div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-500/10 rounded-2xl p-4 text-center">
              <Trophy className="w-5 h-5 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
              <div className="text-xl font-bold text-blue-900 dark:text-blue-100">
                {Math.round(attempt.percentage)}%
              </div>
              <div className="text-xs text-blue-700 dark:text-blue-300">Score</div>
            </div>

            <div className="bg-purple-50 dark:bg-purple-500/10 rounded-2xl p-4 text-center">
              <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
              <div className="text-xl font-bold text-purple-900 dark:text-purple-100">
                {formatTime(attempt.time_spent)}
              </div>
              <div className="text-xs text-purple-700 dark:text-purple-300">Duration</div>
            </div>
          </div>

          {/* View Question Details Button */}
          <button
            onClick={onViewDetails}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold py-3 px-6 rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            View Question Breakdown
          </button>
        </div>
      )}
    </div>
  );
}

// ==================== Progress Chart ====================

interface ProgressChartProps {
  attempts: QuizAttempt[];
}

function ProgressChart({ attempts }: ProgressChartProps) {
  // Prepare chart data (reverse to show oldest to newest)
  const chartData = [...attempts].reverse().map((attempt, index) => ({
    attemptNumber: index + 1,
    percentage: Math.round(attempt.percentage),
    date: formatShortDate(attempt.completed_at),
  }));

  const averageScore = Math.round(
    attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length
  );

  const bestScore = Math.max(...attempts.map((a) => a.percentage));

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-lg border border-slate-200/60 dark:bg-white/5 dark:border-slate-700/60">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-500/20 rounded-xl">
            <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Performance Trend
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Track your progress over time
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="hidden sm:flex items-center gap-6">
          <div className="text-right">
            <div className="text-sm text-slate-600 dark:text-slate-400">Average</div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {averageScore}%
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-600 dark:text-slate-400">Best</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {Math.round(bestScore)}%
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Stats */}
      <div className="sm:hidden flex items-center justify-around mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
        <div className="text-center">
          <div className="text-sm text-slate-600 dark:text-slate-400">Average</div>
          <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
            {averageScore}%
          </div>
        </div>
        <div className="w-px h-12 bg-slate-200 dark:bg-slate-700"></div>
        <div className="text-center">
          <div className="text-sm text-slate-600 dark:text-slate-400">Best</div>
          <div className="text-xl font-bold text-green-600 dark:text-green-400">
            {Math.round(bestScore)}%
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-slate-200 dark:stroke-slate-700"
            />
            <XAxis
              dataKey="attemptNumber"
              label={{ value: 'Attempt #', position: 'insideBottom', offset: -5 }}
              className="text-xs text-slate-600 dark:text-slate-400"
              tick={{ fill: 'currentColor' }}
            />
            <YAxis
              domain={[0, 100]}
              label={{ value: 'Score %', angle: -90, position: 'insideLeft' }}
              className="text-xs text-slate-600 dark:text-slate-400"
              tick={{ fill: 'currentColor' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '12px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
              labelFormatter={(value: number) => `Attempt #${value}`}
              formatter={(value: number) => [`${value}%`, 'Score']}
            />
            <Line
              type="monotone"
              dataKey="percentage"
              stroke="#8b5cf6"
              strokeWidth={3}
              dot={{
                fill: '#8b5cf6',
                strokeWidth: 2,
                r: 5,
                stroke: '#fff',
              }}
              activeDot={{
                r: 7,
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ==================== Main Component ====================

export function QuizHistoryView({ materialId }: QuizHistoryViewProps) {
  const [history, setHistory] = useState<QuizHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAttempt, setSelectedAttempt] = useState<QuizAttempt | null>(null);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get<QuizHistoryResponse>(
        `/api/materials/${materialId}/quiz-attempts/history`
      );

      setHistory(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quiz history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materialId]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={fetchHistory} />;
  }

  if (!history || history.attempts.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-6 animate-fade-in" role="main" aria-label="Quiz History">
      {/* Progress Chart */}
      {history.attempts.length > 1 && <ProgressChart attempts={history.attempts} />}

      {/* Attempts List */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-xl">
            <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          All Attempts ({history.total_attempts})
        </h2>

        {history.attempts.map((attempt, index) => (
          <AttemptCard
            key={attempt.attempt_id}
            attempt={attempt}
            attemptNumber={history.total_attempts - index}
            onViewDetails={() => setSelectedAttempt(attempt)}
          />
        ))}
      </div>

      {/* Question Detail Modal */}
      {selectedAttempt && (
        <QuestionDetailModal
          attempt={selectedAttempt}
          onClose={() => setSelectedAttempt(null)}
        />
      )}
    </div>
  );
}

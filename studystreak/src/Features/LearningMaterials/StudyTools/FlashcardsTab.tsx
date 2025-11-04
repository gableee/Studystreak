import { useEffect, useState } from 'react';
import { Sparkles, Loader2, AlertCircle, RotateCw } from 'lucide-react';
import { fetchFlashcards } from './api';
import type { StudyFlashcards } from './types';

interface FlashcardsTabProps {
  materialId: string;
}

export function FlashcardsTab({ materialId }: FlashcardsTabProps) {
  const [flashcards, setFlashcards] = useState<StudyFlashcards | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    async function loadFlashcards() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchFlashcards(materialId);
        setFlashcards(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load flashcards');
      } finally {
        setLoading(false);
      }
    }

    loadFlashcards();
  }, [materialId]);

  const handleNext = () => {
    if (flashcards && currentIndex < flashcards.flashcards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setIsFlipped(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-purple-600 dark:text-purple-400 animate-spin" />
          <p className="text-slate-600 dark:text-slate-300 text-sm">Loading flashcards...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50/50 backdrop-blur-sm rounded-3xl p-8 border border-red-100 dark:bg-red-500/10 dark:border-red-500/30">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900 dark:text-red-200 mb-1">Failed to load flashcards</h3>
            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!flashcards || flashcards.flashcards.length === 0) {
    return (
      <div className="bg-slate-50/50 backdrop-blur-sm rounded-3xl p-12 border border-slate-200 text-center dark:bg-white/5 dark:border-slate-700">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center dark:bg-purple-500/20">
            <Sparkles className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">No flashcards available yet</h3>
            <p className="text-slate-600 dark:text-slate-300 text-sm max-w-md mx-auto">
              AI flashcards have not been generated for this material. They will appear here once processing is complete.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currentCard = flashcards.flashcards[currentIndex];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* AI Generated Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 text-sm font-medium">
          <Sparkles className="w-4 h-4" />
          <span>AI Generated</span>
          {flashcards.generatedAt && (
            <span className="text-slate-400 dark:text-slate-500">
              • {new Date(flashcards.generatedAt).toLocaleDateString()}
            </span>
          )}
        </div>
        <div className="text-sm text-slate-600 dark:text-slate-300 font-medium">
          {currentIndex + 1} / {flashcards.flashcards.length}
        </div>
      </div>

      {/* Flashcard */}
      <div
        className="relative h-96 cursor-pointer perspective-1000"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div
          className={`
            absolute inset-0 transition-transform duration-500 preserve-3d
            ${isFlipped ? 'rotate-y-180' : ''}
          `}
        >
          {/* Front (Question) */}
          <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-purple-600 to-blue-600 rounded-3xl shadow-2xl p-12 flex flex-col items-center justify-center text-white">
            <div className="text-sm font-semibold mb-4 opacity-90">Question</div>
            <p className="text-2xl font-bold text-center leading-relaxed">
              {currentCard.question}
            </p>
            <div className="mt-8 flex items-center gap-2 text-sm opacity-75">
              <RotateCw className="w-4 h-4" />
              <span>Click to flip</span>
            </div>
          </div>

          {/* Back (Answer) */}
          <div className="absolute inset-0 backface-hidden rotate-y-180 bg-white rounded-3xl shadow-2xl p-12 flex flex-col items-center justify-center border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
            <div className="text-sm font-semibold mb-4 text-purple-600 dark:text-purple-400">Answer</div>
            <p className="text-xl font-medium text-slate-900 dark:text-white text-center leading-relaxed">
              {currentCard.answer}
            </p>
            {currentCard.category && (
              <span className="mt-6 px-4 py-2 bg-purple-50 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 text-sm font-medium rounded-full">
                {currentCard.category}
              </span>
            )}
            <div className="mt-8 flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500">
              <RotateCw className="w-4 h-4" />
              <span>Click to flip back</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className="px-6 py-3 bg-white text-slate-700 font-semibold rounded-2xl shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
        >
          Previous
        </button>
        <button
          onClick={handleNext}
          disabled={currentIndex === flashcards.flashcards.length - 1}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          Next
        </button>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Sparkles, Loader2, AlertCircle, ChevronDown } from 'lucide-react';
import { fetchKeyPoints } from './api';
import type { StudyKeyPoints, KeyPoint } from './types';

interface KeyPointsTabProps {
  materialId: string;
}

export function KeyPointsTab({ materialId }: KeyPointsTabProps) {
  const [keypoints, setKeypoints] = useState<StudyKeyPoints | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function loadKeyPoints() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchKeyPoints(materialId);
        setKeypoints(data);
        // Auto-expand all on load
        setExpandedIds(new Set(data.keypoints.map((kp) => kp.id)));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load key points');
      } finally {
        setLoading(false);
      }
    }

    loadKeyPoints();
  }, [materialId]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-purple-600 dark:text-purple-400 animate-spin" />
          <p className="text-slate-600 dark:text-slate-300 text-sm">Loading key points...</p>
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
            <h3 className="font-semibold text-red-900 dark:text-red-200 mb-1">Failed to load key points</h3>
            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!keypoints || keypoints.keypoints.length === 0) {
    return (
      <div className="bg-slate-50/50 backdrop-blur-sm rounded-3xl p-12 border border-slate-200 text-center dark:bg-white/5 dark:border-slate-700">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center dark:bg-purple-500/20">
            <Sparkles className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">No key points available yet</h3>
            <p className="text-slate-600 dark:text-slate-300 text-sm max-w-md mx-auto">
              AI key points have not been generated for this material. They will appear here once processing is complete.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* AI Generated Badge */}
      <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 text-sm font-medium">
        <Sparkles className="w-4 h-4" />
        <span>AI Generated</span>
        {keypoints.generatedAt && (
          <span className="text-slate-400 dark:text-slate-500">
            • {new Date(keypoints.generatedAt).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Key Points List */}
      <div className="space-y-3">
        {keypoints.keypoints.map((point, index) => {
          const isExpanded = expandedIds.has(point.id);
          return (
            <div
              key={point.id}
              className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md border border-slate-200/60 overflow-hidden transition-all duration-300 dark:bg-white/5 dark:border-slate-700/60"
            >
              <button
                onClick={() => toggleExpand(point.id)}
                className="w-full flex items-start gap-4 p-6 text-left hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors duration-200"
              >
                <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 font-semibold text-sm mt-0.5">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-900 dark:text-white font-medium leading-relaxed">
                    {point.text}
                  </p>
                  {point.category && (
                    <span className="inline-block mt-2 px-3 py-1 bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 text-xs font-medium rounded-full">
                      {point.category}
                    </span>
                  )}
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-slate-400 dark:text-slate-500 flex-shrink-0 mt-1 transition-transform duration-300 ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { fetchSummary } from './api';
import type { StudySummary } from './types';

interface SummaryTabProps {
  materialId: string;
}

export function SummaryTab({ materialId }: SummaryTabProps) {
  const [summary, setSummary] = useState<StudySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSummary() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchSummary(materialId);
        setSummary(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load summary');
      } finally {
        setLoading(false);
      }
    }

    loadSummary();
  }, [materialId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-purple-600 dark:text-purple-400 animate-spin" />
          <p className="text-slate-600 dark:text-slate-300 text-sm">Loading summary...</p>
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
            <h3 className="font-semibold text-red-900 dark:text-red-200 mb-1">Failed to load summary</h3>
            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!summary || !summary.summary) {
    return (
      <div className="bg-slate-50/50 backdrop-blur-sm rounded-3xl p-12 border border-slate-200 text-center dark:bg-white/5 dark:border-slate-700">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center dark:bg-purple-500/20">
            <Sparkles className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">No summary available yet</h3>
            <p className="text-slate-600 dark:text-slate-300 text-sm max-w-md mx-auto">
              AI summary has not been generated for this material. The summary will appear here once processing is complete.
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
        {summary.generatedAt && (
          <span className="text-slate-400 dark:text-slate-500">
            • {new Date(summary.generatedAt).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Summary Content */}
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-lg border border-slate-200/60 dark:bg-white/5 dark:border-slate-700/60">
        <p className="text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap text-base">
          {summary.summary}
        </p>
      </div>
    </div>
  );
}

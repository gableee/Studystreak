import { useEffect, useState } from 'react';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { fetchSummary } from './api';
import { apiClient } from '@/lib/apiClient';
import { supabase } from '@/lib/supabaseClient';
import type { StudySummary } from './types';

interface SummaryTabProps {
  materialId: string;
}

export function SummaryTab({ materialId }: SummaryTabProps) {
  const [summary, setSummary] = useState<StudySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [minWords, setMinWords] = useState<number>(100);
  const [maxWords, setMaxWords] = useState<number>(400);
  const [generating, setGenerating] = useState(false);

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

  async function handleGenerateWithSettings() {
    try {
      setGenerating(true);
      setError(null);
      const data = await fetchSummary(materialId, minWords, maxWords, true);
      setSummary(data);
      setShowSettings(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate summary');
    } finally {
      setGenerating(false);
    }
  }

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

  // Extract summary content (handle both string and object formats)
  const summaryContent = summary?.summary 
    ? typeof summary.summary === 'string' 
      ? summary.summary 
      : summary.summary.content
    : null;

  const summaryWordCount = summary?.summary && typeof summary.summary === 'object' 
    ? summary.summary.word_count 
    : null;

  const summaryReadingTime = summary?.summary && typeof summary.summary === 'object'
    ? summary.summary.reading_time
    : null;

  if (!summary || !summaryContent) {
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
      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-lg border border-slate-200/60 dark:bg-white/5 dark:border-slate-700/60">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Summary Settings</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                Minimum Words
              </label>
              <input
                type="number"
                min={50}
                max={2000}
                value={minWords}
                onChange={(e) => setMinWords(Math.max(50, Math.min(2000, Number(e.target.value) || 100)))}
                className="w-32 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                Maximum Words
              </label>
              <input
                type="number"
                min={100}
                max={4000}
                value={maxWords}
                onChange={(e) => setMaxWords(Math.max(100, Math.min(4000, Number(e.target.value) || 400)))}
                className="w-32 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleGenerateWithSettings}
                disabled={generating}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold py-2.5 px-4 rounded-xl shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Summary</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setShowSettings(false)}
                disabled={generating}
                className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Generated Badge */}
      <div className="flex items-center justify-between gap-2 text-purple-600 dark:text-purple-400 text-sm font-medium">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          <span>AI Generated</span>
          {summaryWordCount && (
            <span className="text-slate-400 dark:text-slate-500">
              • {summaryWordCount} words
            </span>
          )}
          {summaryReadingTime && (
            <span className="text-slate-400 dark:text-slate-500">
              • {summaryReadingTime}
            </span>
          )}
          {summary.generatedAt && (
            <span className="text-slate-400 dark:text-slate-500">
              • {new Date(summary.generatedAt).toLocaleDateString()}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="px-3 py-1.5 rounded-xl bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:hover:bg-purple-500/30 transition"
          >
            Settings
          </button>
          <button
            onClick={async () => {
              const { data } = await supabase.auth.getSession();
              const token = data.session?.access_token;
              const url = `${apiClient.baseUrl}/api/materials/${materialId}/study-tools/summary.pdf`;
              const res = await fetch(url, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
              });
              const blob = await res.blob();
              const dlUrl = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = dlUrl;
              a.download = 'summary.pdf';
              document.body.appendChild(a);
              a.click();
              URL.revokeObjectURL(dlUrl);
              a.remove();
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition"
          >
            Download PDF
          </button>
        </div>
      </div>

      {/* Summary Content */}
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-lg border border-slate-200/60 dark:bg-white/5 dark:border-slate-700/60">
        <p className="text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap text-base">
          {summaryContent}
        </p>
      </div>
    </div>
  );
}

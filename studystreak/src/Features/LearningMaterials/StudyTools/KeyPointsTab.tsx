import { useEffect, useState, lazy, Suspense } from 'react';
import { Sparkles, Loader2, AlertCircle, FileText, LayoutGrid, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { fetchKeyPointsV2, fetchStudyNote } from './api';
import { apiClient } from '@/lib/apiClient';
import { supabase } from '@/lib/supabaseClient';
import type { StructuredKeyPoints, StudyNote } from './types';

const MarkdownView = lazy(() => import('@/components/MarkdownView'));

// Helper to filter markdown content based on view mode
function processDocumentForView(markdown: string, view: 'concise' | 'full', items: StructuredKeyPoints | null): string {
  if (view === 'full' || !items) {
    return markdown; // Show original full markdown
  }
  
  // For concise view, rebuild the key concepts section with short definitions only
  const lines = markdown.split('\n');
  let result: string[] = [];
  let inKeyConcepts = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detect Key Concepts section
    if (line.includes('## 📌')) {
      inKeyConcepts = true;
      result.push(line);
      
      // Replace with concise items
      result.push('');
      items.items.forEach((item) => {
        const def = item.shortDefinition || item.definition;
        result.push(`- **${item.term}:** ${item.icon} ${def}`);
        
        // Add bulleted highlights if available
        if (item.bulletedHighlights && item.bulletedHighlights.length > 0) {
          item.bulletedHighlights.forEach((highlight) => {
            result.push(`  - ${highlight}`);
          });
        }
      });
      
      // Skip the rest of the original key concepts section
      i++;
      while (i < lines.length && !lines[i].startsWith('##')) {
        i++;
      }
      i--; // Back up one to process the next heading
      continue;
    }
    
    if (!inKeyConcepts || line.startsWith('##')) {
      inKeyConcepts = false;
      result.push(line);
    }
  }
  
  return result.join('\n');
}

interface KeyPointsTabProps {
  materialId: string;
}

export function KeyPointsTab({ materialId }: KeyPointsTabProps) {
  type Mode = 'cards' | 'document';
  type DocumentView = 'concise' | 'full';
  const [mode, setMode] = useState<Mode>('cards');
  const [documentView, setDocumentView] = useState<DocumentView>('concise');
  const [cards, setCards] = useState<StructuredKeyPoints | null>(null);
  const [doc, setDoc] = useState<StudyNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [showDebugModal, setShowDebugModal] = useState(false);
  const pageSize = 24;

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        if (mode === 'cards') {
          const data = await fetchKeyPointsV2(materialId, page, pageSize);
          setCards(data);
        } else {
          // In document mode, load both doc and cards (for concise view processing)
          const [docData, cardsData] = await Promise.all([
            fetchStudyNote(materialId),
            fetchKeyPointsV2(materialId, 1, 100) // Load more items for document view
          ]);
          setDoc(docData);
          setCards(cardsData);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load key points');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [materialId, mode, page]);

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

  if (mode === 'cards' && (!cards || cards.items.length === 0)) {
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
      {/* Mode Toggle + Actions */}
      <div className="flex items-center justify-between gap-2 print:hidden">
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-sm font-medium">
          <span className="inline-flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1">
            <button
              onClick={() => { setMode('cards'); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg inline-flex items-center gap-1 ${mode === 'cards' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow' : 'hover:bg-white/60 dark:hover:bg-slate-700/60'}`}
            >
              <LayoutGrid className="w-4 h-4" /> Cards
            </button>
            <button
              onClick={() => setMode('document')}
              className={`px-3 py-1.5 rounded-lg inline-flex items-center gap-1 ${mode === 'document' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow' : 'hover:bg-white/60 dark:hover:bg-slate-700/60'}`}
            >
              <FileText className="w-4 h-4" /> Document
            </button>
          </span>
          <span className="text-purple-600 dark:text-purple-400 inline-flex items-center gap-1">
            <Sparkles className="w-4 h-4" /> AI Generated
          </span>
        </div>
        {mode === 'cards' ? (
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2 py-1 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span>Page {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              className="px-2 py-1 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="inline-flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1 text-sm">
              <button
                onClick={() => setDocumentView('concise')}
                className={`px-3 py-1.5 rounded-lg ${documentView === 'concise' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow' : 'hover:bg-white/60 dark:hover:bg-slate-700/60 text-slate-600 dark:text-slate-300'}`}
              >
                Concise
              </button>
              <button
                onClick={() => setDocumentView('full')}
                className={`px-3 py-1.5 rounded-lg ${documentView === 'full' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow' : 'hover:bg-white/60 dark:hover:bg-slate-700/60 text-slate-600 dark:text-slate-300'}`}
              >
                Full
              </button>
            </span>
            <button
              onClick={async () => {
                const { data } = await supabase.auth.getSession();
                const token = data.session?.access_token;
                const url = `${apiClient.baseUrl}/api/materials/${materialId}/study-tools/study-note`;
                const res = await fetch(url, {
                  method: 'POST',
                  headers: token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' },
                  body: JSON.stringify({})
                });
                const json = await res.json();
                const blob = new Blob([json.documentMarkdown ?? ''], { type: 'text/markdown;charset=utf-8' });
                const dlUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = dlUrl;
                a.download = 'study-note.md';
                document.body.appendChild(a);
                a.click();
                URL.revokeObjectURL(dlUrl);
                a.remove();
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition text-sm"
            >
              Download Markdown
            </button>
            <button
              onClick={() => setShowDebugModal(true)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 text-sm transition"
            >
              🔍 View Raw
            </button>
          </div>
        )}
      </div>

      {/* Cards mode */}
      {mode === 'cards' && cards && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {cards.items.map((item, idx) => {
            const isExpanded = expandedCards.has(idx);
            const hasFullDetails = item.fullDefinition || (item.bulletedHighlights && item.bulletedHighlights.length > 0);
            const displayDefinition = item.shortDefinition || item.definition;

            return (
              <div
                key={`${page}-${idx}-${item.term}`}
                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md border border-slate-200/60 overflow-hidden transition-all duration-300 dark:bg-white/5 dark:border-slate-700/60 hover:shadow-lg"
              >
                <div className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl leading-none flex-shrink-0">{item.icon}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold text-slate-900 dark:text-white">{item.term}</div>
                        {hasFullDetails && (
                          <button
                            onClick={() => {
                              const newSet = new Set(expandedCards);
                              if (isExpanded) {
                                newSet.delete(idx);
                              } else {
                                newSet.add(idx);
                              }
                              setExpandedCards(newSet);
                            }}
                            className="flex-shrink-0 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            aria-label={isExpanded ? 'Collapse' : 'Expand'}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                            )}
                          </button>
                        )}
                      </div>

                      {/* Concise view (always shown) */}
                      <div className="text-slate-700 dark:text-slate-300 mt-1 text-sm leading-relaxed">
                        {displayDefinition}
                      </div>

                      {/* Expanded view */}
                      {isExpanded && hasFullDetails && (
                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2 animate-in slide-in-from-top-2 duration-200">
                          {item.fullDefinition && (
                            <div className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                              {item.fullDefinition}
                            </div>
                          )}

                          {item.bulletedHighlights && item.bulletedHighlights.length > 0 && (
                            <ul className="space-y-1 ml-2">
                              {item.bulletedHighlights.map((highlight, hIdx) => (
                                <li key={hIdx} className="text-slate-600 dark:text-slate-400 text-sm flex items-start gap-2">
                                  <span className="text-purple-500 dark:text-purple-400 mt-1">•</span>
                                  <span className="flex-1">{highlight}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}

                      {item.usage && (
                        <div className="text-slate-500 dark:text-slate-400 text-sm mt-2 italic">
                          Use: {item.usage}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Document mode */}
      {mode === 'document' && (
        <div className="max-w-[210mm] mx-auto print:bg-white print:text-black print:shadow-none print:border-0 print:p-0">
          <div className="bg-white/80 dark:bg-white/5 border border-slate-200 dark:border-slate-700 rounded-2xl shadow p-6 print:border-0 print:shadow-none print:rounded-none">
            {doc ? (
              <Suspense fallback={<div className="flex items-center gap-2 text-slate-500 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading document…</div>}>
                <MarkdownView markdown={processDocumentForView(doc.documentMarkdown, documentView, cards)} />
              </Suspense>
            ) : (
              <div className="flex items-center gap-2 text-slate-500 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading document…</div>
            )}
          </div>
        </div>
      )}
      {/* Debug Modal */}
      {showDebugModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-6 overflow-y-auto">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDebugModal(false)} />
          <div className="relative z-10 max-w-4xl w-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 my-8">
            <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="font-semibold text-lg text-slate-900 dark:text-white">🔍 Raw Study Tools JSON</h3>
              <button
                onClick={() => setShowDebugModal(false)}
                className="px-3 py-1.5 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
              >
                Close
              </button>
            </div>
            <div className="p-6 max-h-[70vh] overflow-auto">
              <pre className="text-xs font-mono whitespace-pre-wrap break-words bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
                {JSON.stringify({ doc, cards, mode, documentView, page }, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

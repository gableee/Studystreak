import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import type { StudyToolTab } from './types';
import { SummaryTab } from './SummaryTab';
import { KeyPointsTab } from './KeyPointsTab';
import { QuizTab } from './QuizTab';
import { FlashcardsTab } from './FlashcardsTab';

export function StudyToolsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<StudyToolTab>('summary');

  if (!id) {
    // If no id is present, send users back to the main learning materials list
    navigate('/learning-materials');
    return null;
  }

  const tabs: { value: StudyToolTab; label: string }[] = [
    { value: 'summary', label: 'Summary' },
    { value: 'keypoints', label: 'Key Points' },
    { value: 'quiz', label: 'Quiz' },
    { value: 'flashcards', label: 'Flashcards' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      {/* iOS-style Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm dark:bg-slate-900/80 dark:border-slate-700/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => {
                // Prefer going back in history when possible (returns to the exact previous page)
                // otherwise fall back to the learning materials list.
                try {
                  if (window.history.length > 1) {
                    navigate(-1);
                  } else {
                    navigate('/learning-materials');
                  }
                } catch (e) {
                  navigate('/learning-materials');
                }
              }}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200 font-medium"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Materials</span>
            </button>
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
              <Sparkles className="w-5 h-5" />
              <span className="font-semibold">Study Tools</span>
            </div>
          </div>
        </div>
      </header>

      {/* Segmented Control Tabs */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-slate-100/80 backdrop-blur-sm p-1 rounded-2xl inline-flex gap-1 shadow-inner dark:bg-slate-800/80">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`
                px-6 py-2.5 rounded-xl font-medium text-sm transition-all duration-300
                ${
                  activeTab === tab.value
                    ? 'bg-white text-slate-900 shadow-md scale-[1.02] dark:bg-slate-700 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="transition-opacity duration-300">
          {activeTab === 'summary' && <SummaryTab materialId={id} />}
          {activeTab === 'keypoints' && <KeyPointsTab materialId={id} />}
          {activeTab === 'quiz' && <QuizTab materialId={id} />}
          {activeTab === 'flashcards' && <FlashcardsTab materialId={id} />}
        </div>
      </div>
    </div>
  );
}

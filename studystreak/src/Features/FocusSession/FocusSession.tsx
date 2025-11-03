/**
 * Pomodoro Component - Main container for Pomodoro timer feature
 */

import { useState, useCallback, useEffect } from 'react';
import { PomodoroProvider } from './context/PomodoroContext';
import { usePomodoroContext } from './context/PomodoroContextHooks';
import type { SessionData } from './types/PomodoroTypes';
import { TimerDisplay } from './components/TimerDisplay';
import { Controls } from './components/Controls';
import { CycleTracker } from './components/CycleTracker';
import { PomodoroSettings } from './components/PomodoroSettings';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../Auth/hooks/useAuth';
import { ensureUserTimezone } from '@/lib/timezone';
import { useStreakActivation } from '@/Features/Gamification/hooks/useStreakActivation';
import { AlertCircle, CheckCircle2, Clock3 } from 'lucide-react';

function PomodoroInner() {
  const { user } = useAuth();
  const pomodoro = usePomodoroContext();
  // Assert provider exists (RootLayout should provide it). Use `p` shorthand so TS sees non-null usage.
  const p = pomodoro!;
  const [showSettings, setShowSettings] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { activate: activateStreak } = useStreakActivation();

  // Note: don't return early here — hooks must be called in the same order on every render.
  // The page is usually wrapped with PomodoroProvider (RootLayout). If pomodoro is undefined
  // something is wrong with the provider placement; we'll still declare hooks to satisfy
  // React rules and rely on the provider wrapper in the app.

  type SupabaseResult = { data?: unknown; error?: { message?: string } | null };
  const isSupabaseResult = useCallback((r: unknown): r is SupabaseResult => typeof r === 'object' && r !== null && 'error' in (r as Record<string, unknown>), []);

  const saveSessionToDb = useCallback(async (session: SessionData | Record<string, unknown>, userId: string) => {
    const s = session as SessionData;
    const payload: Record<string, unknown> = {
      user_id: userId,
      date: typeof s.startTime === 'string' && s.startTime.includes('T') ? s.startTime.split('T')[0] : s.startTime,
      time_started: s.startTime,
      time_end: s.endTime,
      duration: s.durationMinutes,
      cycles: s.cyclesCompleted,
    };

    // Ensure profiles row exists to satisfy FK
    try {
      const { data: profileData, error: profileCheckError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();

      if (profileCheckError) {
        const code = (profileCheckError as { code?: string } | null)?.code;
        if (code && code !== 'PGRST116') console.debug('Profile check returned error:', profileCheckError);
      }

      if (!profileData) {
        try {
          const { data: authData, error: authErr } = await supabase.auth.getUser();
          if (authErr) console.debug('Could not fetch auth user for profile metadata:', authErr);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const authUser = (authData as any)?.user ?? null;
          const meta = authUser?.user_metadata ?? {};
          const first_name = meta?.first_name ?? 'First';
          const last_name = meta?.last_name ?? 'Last';
          const email = authUser?.email ?? user?.email ?? null;

          let username = meta?.username ?? null;
          if (!username && email) username = String(email).split('@')[0];
          if (!username) username = `user_${String(userId).slice(0, 8)}`;

          const preferred_name = (meta?.full_name as string | undefined) || (username as string | undefined) || undefined;
          const upsertPayload: Record<string, unknown> = { id: userId, username, first_name, last_name };
          if (preferred_name) upsertPayload.preferred_name = preferred_name;
          if (email) upsertPayload.email = email;

          const { error: upsertErr } = await supabase.from('profiles').upsert([upsertPayload]);
          if (upsertErr) console.warn('Failed to upsert profile automatically:', upsertErr);
          else console.debug('Inserted missing profile for user', userId);
        } catch (upsertEx) {
          console.warn('Upsert profile attempt threw:', upsertEx);
        }
      }
    } catch (checkErr) {
      console.warn('Error while checking/creating profile prior to session insert:', checkErr);
    }

    const tableCandidates = ['studysession', 'study_session', 'StudySession'];
    let lastError: unknown = null;
    for (const table of tableCandidates) {
      try {
        const res = (await supabase.from(table).insert([payload]).select()) as SupabaseResult;
        console.debug(`Insert attempt to ${table}:`, res);
        if (res.error) {
          lastError = res.error;
          if (/relation "?\w+"? does not exist/i.test(String(res.error.message || res.error))) continue;
          return res;
        }
        return res;
      } catch (err) {
        console.error(`Insert to ${table} threw:`, err);
        lastError = err;
      }
    }
    throw lastError ?? new Error('Insert failed for all table candidates');
  }, [user]);

  const handleEndSession = useCallback(async () => {
    const sessionData = await p.endSession();
    if (!sessionData || !user) return;

    await ensureUserTimezone();
    setSaveStatus('saving');
    setErrorMessage(null);
    try {
      const result = await saveSessionToDb(sessionData, user.id);
      if (isSupabaseResult(result) && result.error) throw result.error;

      const activationResult = await activateStreak({
        occurredAt: sessionData.endTime ?? new Date().toISOString(),
        studyMinutes: sessionData.durationMinutes,
      });

      if (!activationResult.ok) {
        console.warn('[Pomodoro] Streak activation failed after session save', activationResult.error);
      }

      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err: unknown) {
      console.error('Failed to save session (detailed):', err);
      setSaveStatus('error');
      if (err instanceof Error) setErrorMessage(err.message);
      else if (err && typeof err === 'object' && 'message' in err) {
        const maybeMsg = (err as { message?: unknown }).message;
        setErrorMessage(typeof maybeMsg === 'string' ? maybeMsg : String(maybeMsg ?? 'Failed to save session'));
      } else setErrorMessage(String(err ?? 'Failed to save session'));

      const failedSessions = JSON.parse(localStorage.getItem('failedPomodoros') || '[]');
      failedSessions.push({ ...sessionData, userId: user.id });
      localStorage.setItem('failedPomodoros', JSON.stringify(failedSessions));
    }
  }, [p, user, saveSessionToDb, isSupabaseResult, activateStreak]);

  const retryFailedSessions = useCallback(async () => {
    if (!user) return;
    await ensureUserTimezone();
    const failedSessions = JSON.parse(localStorage.getItem('failedPomodoros') || '[]');
    if (failedSessions.length === 0) return;
    for (const session of failedSessions) {
      try {
        const result = await saveSessionToDb(session as Record<string, unknown>, user.id);
        if (isSupabaseResult(result) && result.error) {
          console.error('Retry insert error:', result.error);
          continue;
        }
        const activationResult = await activateStreak({
          occurredAt: (session as SessionData).endTime ?? new Date().toISOString(),
          studyMinutes: (session as SessionData).durationMinutes,
        });

        if (!activationResult.ok) {
          console.warn('[Pomodoro] Streak activation failed for retried session', activationResult.error);
        }
      } catch (error) {
        console.error('Failed to retry session save:', error);
      }
    }
    localStorage.removeItem('failedPomodoros');
  }, [user, saveSessionToDb, isSupabaseResult, activateStreak]);

  const handleStartSession = useCallback(() => {
    void ensureUserTimezone();
    p.startSession();
  }, [p]);

  useEffect(() => {
    if (user) retryFailedSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <div className="relative mx-auto max-w-4xl space-y-6 pb-12">
      <header className="surface-section space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <span className="badge badge-info uppercase tracking-wide">Focus session</span>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">Pomodoro timer</h2>
            <p className="max-w-xl text-sm text-slate-600 dark:text-slate-300">
              Keep your deep work sprints, short breaks, and streak tracking aligned with the rest of StudyStreak’s calm design system.
            </p>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="pill-tab-active inline-flex items-center gap-2"
          >
            {showSettings ? 'Hide settings' : 'Adjust settings'}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-300">
          {p.sessionStartTime && (
            <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 font-medium text-slate-600 dark:bg-white/10 dark:text-slate-200">
              <Clock3 className="h-3.5 w-3.5" />
              Started {new Date(p.sessionStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 font-medium text-slate-600 dark:bg-white/10 dark:text-slate-200">
            Remaining {Math.max(0, Math.floor(p.remainingSeconds / 60))}m
          </span>
        </div>
      </header>

      {showSettings && (
        <div className="surface-card border border-white/15 bg-white/70 p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
          <PomodoroSettings settings={p.settings} onUpdateSettings={p.updateSettings} onClose={() => setShowSettings(false)} />
        </div>
      )}

      <div className="surface-card border border-white/15 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
        <TimerDisplay remainingSeconds={p.remainingSeconds} mode={p.mode} progress={p.progress} />
      </div>

      <div className="surface-card border border-white/15 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
        <Controls
          status={p.status}
          onStart={handleStartSession}
          onPause={p.pauseTimer}
          onResume={p.resumeTimer}
          onStop={p.stopTimer}
          onEnd={handleEndSession}
          onSkip={p.skipInterval}
        />
      </div>

      {saveStatus !== 'idle' && (
        <div
          className={`surface-card flex items-center gap-3 border-l-4 border-white/0 bg-white/80 p-4 text-sm shadow-sm dark:bg-white/5 ${
            saveStatus === 'saving'
              ? 'border-blue-400 text-blue-600 dark:text-blue-300'
              : saveStatus === 'success'
              ? 'border-emerald-400 text-emerald-600 dark:text-emerald-300'
              : 'border-rose-400 text-rose-600 dark:text-rose-300'
          }`}
        >
          {saveStatus === 'saving' ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : saveStatus === 'success' ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <span>
            {saveStatus === 'saving' && 'Saving session...'}
            {saveStatus === 'success' && 'Session saved successfully!'}
            {saveStatus === 'error' && (errorMessage || 'Failed to save session. It will be retried later.')}
          </span>
        </div>
      )}

      {p.status !== 'idle' && (
        <CycleTracker
          cyclesCompleted={p.cyclesCompleted}
          sessionDuration={p.sessionDuration}
          targetCycles={p.settings.targetCycles}
          mode={p.mode}
          isLastCycleBeforeLongBreak={p.isLastCycleBeforeLongBreak}
        />
      )}
    </div>
  );
}

export default function Pomodoro() {
  const ctx = usePomodoroContext();
  if (ctx) return <PomodoroInner />;
  return (
    <PomodoroProvider>
      <PomodoroInner />
    </PomodoroProvider>
  );
}


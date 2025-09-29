/**
 * Pomodoro Component - Main container for Pomodoro timer feature
 */

import React, { useState, useCallback } from 'react';
import { usePomodoro } from './hooks/usePomodoro';
import type { SessionData } from './types/PomodoroTypes';
import { TimerDisplay } from './components/TimerDisplay';
import { Controls } from './components/Controls';
import { CycleTracker } from './components/CycleTracker';
import { PomodoroSettings } from './components/PomodoroSettings';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../Auth/hooks/useAuth';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function Pomodoro() {
  const { user } = useAuth();
  const pomodoro = usePomodoro();
  const [showSettings, setShowSettings] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Helper: attempt insert on likely table names and return supabase response
  type SupabaseErrorLike = { message?: string };
  type SupabaseResult = { data?: unknown; error?: SupabaseErrorLike | null };
  const isSupabaseResult = React.useCallback((r: unknown): r is SupabaseResult => typeof r === 'object' && r !== null && 'error' in (r as Record<string, unknown>), []);

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

    // Ensure the referenced profile exists to satisfy foreign key constraint
    try {
      const { data: profileData, error: profileCheckError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();

      if (profileCheckError && profileCheckError.code !== 'PGRST116') {
        // PGRST116 = No rows found for .single(); handle below by attempting upsert
        console.debug('Profile check returned error (non-empty):', profileCheckError);
      }

      if (!profileData) {
        // Try to upsert a full profile row using auth metadata so FK constraint passes
        try {
          const { data: authData, error: authErr } = await supabase.auth.getUser();
          if (authErr) console.debug('Could not fetch auth user for profile metadata:', authErr);
          // authData shape: { user?: User } — use optional chaining
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const authUser = (authData as any)?.user ?? null;

          // Extract metadata; fall back to sensible defaults
          const meta = authUser?.user_metadata ?? {};
          const first_name = meta?.first_name ?? 'First';
          const last_name = meta?.last_name ?? 'Last';
          const email = authUser?.email ?? user?.email ?? null;

          // Username should be unique — prefer provided metadata, otherwise derive from email or id
          let username = meta?.username ?? null;
          if (!username && email) username = String(email).split('@')[0];
          if (!username) username = `user_${String(userId).slice(0, 8)}`;

          const upsertPayload: Record<string, unknown> = {
            id: userId,
            username,
            first_name,
            last_name,
          };
          if (email) upsertPayload.email = email;

          const { error: upsertErr } = await supabase.from('profiles').upsert([upsertPayload]);
          if (upsertErr) {
            console.warn('Failed to upsert profile automatically:', upsertErr);
          } else {
            console.debug('Inserted missing profile for user', userId);
          }
        } catch (upsertEx) {
          console.warn('Upsert profile attempt threw:', upsertEx);
        }
      }
    } catch (checkErr) {
      console.warn('Error while checking/creating profile prior to session insert:', checkErr);
    }

  type SupabaseRes = { data?: unknown; error?: { message?: string } | null };
    const tableCandidates = ['studysession', 'study_session', 'StudySession'];
    let lastError: unknown = null;
    for (const table of tableCandidates) {
      try {
        const res = (await supabase.from(table).insert([payload]).select()) as SupabaseRes;
        console.debug(`Insert attempt to ${table}:`, res);
        if (res.error) {
          lastError = res.error;
          if (/relation "?\w+"? does not exist/i.test(String(res.error.message || res.error))) {
            continue;
          }
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

  // Handle session end with Supabase integration
  const handleEndSession = useCallback(async () => {
    const sessionData = await pomodoro.endSession();
    if (sessionData && user) {
      setSaveStatus('saving');
      setErrorMessage(null);
      try {
        const result = await saveSessionToDb(sessionData, user.id);
        // If result has error, throw to be caught below
        if (isSupabaseResult(result) && result.error) {
          throw result.error;
        }
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } catch (err: unknown) {
        console.error('Failed to save session (detailed):', err);
        setSaveStatus('error');
        // Prefer structured supabase error message when available
        if (err instanceof Error) {
          setErrorMessage(err.message);
        } else if (err && typeof err === 'object' && 'message' in err) {
          const maybeMsg = (err as { message?: unknown }).message;
          setErrorMessage(typeof maybeMsg === 'string' ? maybeMsg : String(maybeMsg ?? 'Failed to save session'));
        } else {
          setErrorMessage(String(err ?? 'Failed to save session'));
        }
        // Persist failed session for retry
        const failedSessions = JSON.parse(localStorage.getItem('failedPomodoros') || '[]');
        failedSessions.push({ ...sessionData, userId: user.id });
        localStorage.setItem('failedPomodoros', JSON.stringify(failedSessions));
      }
    }
  }, [pomodoro, user, saveSessionToDb, isSupabaseResult]);

  // Retry failed sessions
  const retryFailedSessions = useCallback(async () => {
    if (!user) return;
    const failedSessions = JSON.parse(localStorage.getItem('failedPomodoros') || '[]');
    if (failedSessions.length === 0) return;
    for (const session of failedSessions) {
      try {
        const result = await saveSessionToDb(session as Record<string, unknown>, user.id);
        if (isSupabaseResult(result) && result.error) {
          console.error('Retry insert error:', result.error);
        }
      } catch (error) {
        console.error('Failed to retry session save:', error);
      }
    }
    localStorage.removeItem('failedPomodoros');
  }, [user, saveSessionToDb, isSupabaseResult]);

  

  // Try to save failed sessions on component mount
  React.useEffect(() => {
    // Always call the effect, but only run retry if user exists
    if (user) {
      retryFailedSessions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <section className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-foreground dark:text-slate-100">
          Pomodoro Timer
        </h2>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="px-4 py-2 text-sm bg-muted dark:bg-slate-700 text-muted-foreground dark:text-slate-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
        >
          {showSettings ? 'Hide' : 'Show'} Settings
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="mb-6">
          <PomodoroSettings
            settings={pomodoro.settings}
            onUpdateSettings={pomodoro.updateSettings}
            onClose={() => setShowSettings(false)}
          />
        </div>
      )}

      {/* Timer Display */}
      <div className="mb-6">
        <TimerDisplay
          remainingSeconds={pomodoro.remainingSeconds}
          mode={pomodoro.mode}
          progress={pomodoro.progress}
        />
      </div>

      {/* Controls */}
      <div className="mb-6">
        <Controls
          status={pomodoro.status}
          onStart={pomodoro.startSession}
          onPause={pomodoro.pauseTimer}
          onResume={pomodoro.resumeTimer}
          onStop={pomodoro.stopTimer}
          onEnd={handleEndSession}
          onSkip={pomodoro.skipInterval}
          cyclesCompleted={pomodoro.cyclesCompleted}
        />
      </div>

      {/* Save Status Messages */}
      {saveStatus !== 'idle' && (
        <div className="mb-6">
          {saveStatus === 'saving' && (
            <div className="flex items-center gap-2 p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg">
              <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
              <span className="text-sm">Saving session...</span>
            </div>
          )}
          {saveStatus === 'success' && (
            <div className="flex items-center gap-2 p-3 bg-green-500/10 text-green-600 dark:text-green-400 rounded-lg">
              <CheckCircle2 size={16} />
              <span className="text-sm">Session saved successfully!</span>
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg">
              <AlertCircle size={16} />
              <span className="text-sm">
                {errorMessage || 'Failed to save session. It will be retried later.'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Session Statistics */}
      {pomodoro.status !== 'idle' && (
        <CycleTracker
          cyclesCompleted={pomodoro.cyclesCompleted}
          sessionDuration={pomodoro.sessionDuration}
          targetCycles={pomodoro.settings.targetCycles}
          mode={pomodoro.mode}
          isLastCycleBeforeLongBreak={pomodoro.isLastCycleBeforeLongBreak}
        />
      )}
    </section>
  );
}

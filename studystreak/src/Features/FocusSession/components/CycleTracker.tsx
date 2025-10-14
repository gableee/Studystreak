/**
 * CycleTracker Component - Shows cycles completed and session statistics
 */

import React from 'react';
import { formatDuration } from '../utils/PomodoroUtils';
import { Clock, Target, Timer } from 'lucide-react';

interface CycleTrackerProps {
  cyclesCompleted: number;
  sessionDuration: number; // in minutes
  targetCycles?: number;
  mode: 'focus' | 'break' | 'longBreak';
  isLastCycleBeforeLongBreak: boolean;
}

export const CycleTracker: React.FC<CycleTrackerProps> = ({
  cyclesCompleted,
  sessionDuration,
  targetCycles,
  mode,
  isLastCycleBeforeLongBreak,
}) => {
  const hasTarget = typeof targetCycles === 'number' && targetCycles > 0;
  const targetTotal = hasTarget ? targetCycles ?? 1 : 1;
  return (
    <div className="surface-section space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">Session statistics</h3>
        <span className="badge badge-info text-xs">
          {mode === 'focus' ? 'Focus block' : mode === 'longBreak' ? 'Long break' : 'Short break'}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="surface-card border border-white/15 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600 dark:text-blue-300" />
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Cycles completed</span>
            </div>
            {hasTarget && (
              <span className="text-xs text-slate-500 dark:text-slate-300">Goal {targetCycles}</span>
            )}
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-2xl font-semibold text-slate-900 dark:text-white">{cyclesCompleted}</span>
            {hasTarget && <span className="text-sm text-slate-500 dark:text-slate-300">/ {targetCycles}</span>}
          </div>
          {hasTarget && (
            <div className="mt-4 h-1.5 rounded-full bg-slate-200/70 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                style={{ width: `${Math.min(100, (cyclesCompleted / targetTotal) * 100)}%` }}
              />
            </div>
          )}
        </div>

        <div className="surface-card border border-white/15 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Session duration</span>
          </div>
          <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">{formatDuration(sessionDuration)}</p>
          <p className="text-xs text-slate-500 dark:text-slate-300">Includes both focus and break time.</p>
        </div>
      </div>

      <div className="surface-card border border-white/15 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-purple-500 dark:text-purple-300" />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-200">Current interval</span>
          </div>
          {isLastCycleBeforeLongBreak && mode === 'focus' && (
            <span className="badge badge-info text-xs">Long break next</span>
          )}
        </div>
        <p className="mt-2 text-base font-semibold text-slate-900 dark:text-white">
          {mode === 'focus' ? 'Focus' : mode === 'longBreak' ? 'Long break' : 'Short break'}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-300">
          Stay aware of your energy so transitions feel intentional.
        </p>
      </div>

      {cyclesCompleted > 0 && (
        <div className="surface-card border border-dashed border-white/25 bg-white/70 p-4 text-center text-sm text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
          {cyclesCompleted < 2 && 'Great start! Keep the momentum building.'}
          {cyclesCompleted >= 2 && cyclesCompleted < 4 && 'You are on a roll—stay with the rhythm.'}
          {cyclesCompleted >= 4 && cyclesCompleted < 8 && 'Impressive focus! Consider a longer reset soon.'}
          {cyclesCompleted >= 8 && 'Productivity champion! Take a mindful break when you need it.'}
        </div>
      )}
    </div>
  );
};

export default CycleTracker;
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
  return (
    <div className="bg-card dark:bg-slate-800 rounded-xl p-6 border border-border dark:border-transparent">
      <h3 className="text-lg font-semibold mb-4 text-card-foreground dark:text-slate-100">
        Session Statistics
      </h3>
      
      <div className="grid grid-cols-2 gap-4">
        {/* Cycles completed */}
        <div className="bg-muted dark:bg-slate-700 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-blue-500 dark:text-blue-400" />
            <span className="text-sm text-muted-foreground dark:text-slate-400">
              Cycles Completed
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-card-foreground dark:text-slate-100">
              {cyclesCompleted}
            </span>
            {targetCycles && (
              <span className="text-sm text-muted-foreground dark:text-slate-400">
                / {targetCycles}
              </span>
            )}
          </div>
          {targetCycles && (
            <div className="mt-2">
              <div className="h-1.5 bg-muted dark:bg-slate-600 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (cyclesCompleted / targetCycles) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Session duration */}
        <div className="bg-muted dark:bg-slate-700 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-green-500 dark:text-green-400" />
            <span className="text-sm text-muted-foreground dark:text-slate-400">
              Session Duration
            </span>
          </div>
          <p className="text-2xl font-bold text-card-foreground dark:text-slate-100">
            {formatDuration(sessionDuration)}
          </p>
        </div>
      </div>
      
      {/* Current status */}
      <div className="mt-4 p-3 bg-muted dark:bg-slate-700 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-purple-500 dark:text-purple-400" />
            <span className="text-sm font-medium text-muted-foreground dark:text-slate-300">
              Current:
            </span>
            <span className="text-sm font-semibold text-card-foreground dark:text-slate-100">
              {mode === 'focus' ? 'Focus' : mode === 'longBreak' ? 'Long Break' : 'Short Break'}
            </span>
          </div>
          
          {isLastCycleBeforeLongBreak && mode === 'focus' && (
            <span className="text-xs bg-purple-500/20 text-purple-600 dark:text-purple-400 px-2 py-1 rounded-full">
              Long break next!
            </span>
          )}
        </div>
      </div>
      
      {/* Motivational message */}
      {cyclesCompleted > 0 && (
        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground dark:text-slate-400 italic">
            {cyclesCompleted < 2 && "Great start! Keep the momentum going! 💪"}
            {cyclesCompleted >= 2 && cyclesCompleted < 4 && "You're doing amazing! Stay focused! 🎯"}
            {cyclesCompleted >= 4 && cyclesCompleted < 8 && "Incredible progress! You're in the zone! ⚡"}
            {cyclesCompleted >= 8 && "Productivity champion! You're unstoppable! 🏆"}
          </p>
        </div>
      )}
    </div>
  );
};

export default CycleTracker;
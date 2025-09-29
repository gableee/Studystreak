/**
 * TimerDisplay Component - Shows the timer in mm:ss format
 */

import React from 'react';
import { formatTime } from '../utils/PomodoroUtils';
import type { PomodoroMode } from '../types/PomodoroTypes';

interface TimerDisplayProps {
  remainingSeconds: number;
  mode: PomodoroMode;
  progress: number;
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({ 
  remainingSeconds, 
  mode, 
  progress 
}) => {
  // Mode colors
  const getModeColor = () => {
    switch (mode) {
      case 'focus':
        return 'text-blue-500 dark:text-blue-400';
      case 'break':
        return 'text-green-500 dark:text-green-400';
      case 'longBreak':
        return 'text-purple-500 dark:text-purple-400';
      default:
        return 'text-card-foreground dark:text-slate-100';
    }
  };

  // Mode label
  const getModeLabel = () => {
    switch (mode) {
      case 'focus':
        return 'Focus Time';
      case 'break':
        return 'Short Break';
      case 'longBreak':
        return 'Long Break';
      default:
        return '';
    }
  };

  return (
    <div className="relative bg-card dark:bg-slate-800 rounded-2xl p-8 shadow-lg border border-border dark:border-transparent overflow-hidden">
      {/* Progress bar background */}
      <div 
        className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-blue-600/10 dark:from-blue-500/5 dark:to-blue-600/5 transition-all duration-1000 ease-linear"
        style={{ 
          transform: `translateX(${progress - 100}%)`,
        }}
      />
      
      {/* Content */}
      <div className="relative z-10">
        {/* Mode label */}
        <div className="text-center mb-2">
          <span className={`text-sm font-medium uppercase tracking-wider ${getModeColor()}`}>
            {getModeLabel()}
          </span>
        </div>
        
        {/* Timer display */}
        <div className="text-center">
          <div className={`text-7xl font-mono font-bold tracking-wider ${getModeColor()} transition-colors duration-300`}>
            {formatTime(remainingSeconds)}
          </div>
        </div>
        
        {/* Progress indicator */}
        <div className="mt-6 px-4">
          <div className="h-2 bg-muted dark:bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimerDisplay;
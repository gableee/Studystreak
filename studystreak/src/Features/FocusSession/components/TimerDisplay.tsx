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
  compact?: boolean;
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({ 
  remainingSeconds, 
  mode, 
  progress,
  compact = false,
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

  const getBgGradientClass = () => {
    switch (mode) {
      case 'focus':
        return 'bg-gradient-to-r from-blue-500/10 to-blue-600/10 dark:from-blue-500/5 dark:to-blue-600/5';
      case 'break':
        return 'bg-gradient-to-r from-green-500/10 to-green-600/10 dark:from-green-500/5 dark:to-green-600/5';
      case 'longBreak':
        return 'bg-gradient-to-r from-purple-500/10 to-purple-600/10 dark:from-purple-500/5 dark:to-purple-600/5';
      default:
        return 'bg-gradient-to-r from-slate-200/10 to-slate-300/10 dark:from-slate-800/5 dark:to-slate-700/5';
    }
  };

  const getProgressGradientClass = () => {
    switch (mode) {
      case 'focus':
        return 'bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500';
      case 'break':
        return 'bg-gradient-to-r from-green-500 to-green-600 dark:from-green-400 dark:to-green-500';
      case 'longBreak':
        return 'bg-gradient-to-r from-purple-500 to-purple-600 dark:from-purple-400 dark:to-purple-500';
      default:
        return 'bg-gradient-to-r from-slate-400 to-slate-500 dark:from-slate-500 dark:to-slate-400';
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

  const paddingClass = compact ? 'p-4' : 'p-8';
  const timeSizeClass = compact ? 'text-3xl' : 'text-7xl';
  const modeClass = compact ? 'text-xs' : 'text-sm';

  return (
    <div className={`relative bg-card dark:bg-slate-800 rounded-2xl ${paddingClass} shadow-lg border border-border dark:border-transparent overflow-hidden`}>
      {/* Progress bar background */}
      <div 
        className={`absolute inset-0 ${getBgGradientClass()} transition-all duration-1000 ease-linear`}
        style={{ 
          transform: `translateX(${progress - 100}%)`,
        }}
      />
      
      {/* Content */}
      <div className="relative z-10">
        {/* Mode label */}
        <div className="text-center mb-2">
          <span className={`${modeClass} font-medium uppercase tracking-wider ${getModeColor()}`}>
            {getModeLabel()}
          </span>
        </div>
        
        {/* Timer display */}
        <div className="text-center">
          <div className={`${timeSizeClass} font-mono font-bold tracking-wider ${getModeColor()} transition-colors duration-300`}>
            {formatTime(remainingSeconds)}
          </div>
        </div>
        
        {/* Progress indicator */}
        <div className={`mt-6 px-4 ${compact ? 'mt-3' : ''}`}>
          <div className="h-2 bg-muted dark:bg-slate-700 rounded-full overflow-hidden">
            <div 
              className={`h-full ${getProgressGradientClass()} rounded-full transition-all duration-1000 ease-linear`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimerDisplay;
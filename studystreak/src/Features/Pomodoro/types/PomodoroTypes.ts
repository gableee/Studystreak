/**
 * Type definitions for Pomodoro feature
 */

export type PomodoroMode = 'focus' | 'break' | 'longBreak';
export type SessionStatus = 'idle' | 'running' | 'paused' | 'completed';

export interface PomodoroState {
  mode: PomodoroMode;
  status: SessionStatus;
  sessionStartTime: number | null;
  currentIntervalStartTime: number | null;
  targetTimestamp: number | null;
  pausedRemaining: number | null; // seconds remaining when paused
  cyclesCompleted: number;
  totalFocusMinutes: number;
  totalBreakMinutes: number;
}

export interface PomodoroSettings {
  focusDuration: number; // in minutes
  breakDuration: number; // in minutes
  longBreakDuration: number; // in minutes
  cyclesBeforeLongBreak: number;
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
  targetCycles?: number; // optional target cycles per session
  soundEnabled: boolean;
  notificationsEnabled: boolean;
}

export interface SessionData {
  sessionId?: string;
  userId: string;
  startTime: string; // ISO string
  endTime?: string; // ISO string
  durationMinutes: number;
  cyclesCompleted: number;
  createdAt?: string;
}

export interface PomodoroHookReturn {
  // State
  mode: PomodoroMode;
  status: SessionStatus;
  remainingSeconds: number;
  cyclesCompleted: number;
  sessionDuration: number; // in minutes
  settings: PomodoroSettings;
  
  // Actions
  startSession: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  endSession: () => Promise<SessionData | null>;
  skipInterval: () => void;
  updateSettings: (newSettings: Partial<PomodoroSettings>) => void;
  
  // Computed values
  progress: number; // 0-100 percentage
  currentIntervalDuration: number; // in seconds
  isLastCycleBeforeLongBreak: boolean;
}

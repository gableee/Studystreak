/**
 * usePomodoro Hook - Core Pomodoro timer logic
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { 
  PomodoroState, 
  PomodoroSettings, 
  SessionData,
  PomodoroHookReturn 
} from '../types/PomodoroTypes';
import {
  computeRemainingFromTarget,
  minutesToMs,
  msToMinutes,
  loadSettings,
  saveSettings,
  playNotificationSound,
  showNotification,
  requestNotificationPermission,
} from '../utils/PomodoroUtils';

const LOCAL_STORAGE_KEY = 'pomodoroState';

export function usePomodoro(): PomodoroHookReturn {
  // Settings
  const [settings, setSettings] = useState<PomodoroSettings>(loadSettings());
  
  // Core state
  const [state, setState] = useState<PomodoroState>(() => {
    // Try to restore from localStorage
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate that it's not too old (> 24 hours)
        if (parsed.sessionStartTime && Date.now() - parsed.sessionStartTime < 86400000) {
          return parsed;
        }
      }
    } catch (error) {
      console.error('Failed to restore state:', error);
    }
    
    // Default state
    return {
      mode: 'focus',
      status: 'idle',
      sessionStartTime: null,
      currentIntervalStartTime: null,
      targetTimestamp: null,
      pausedRemaining: null,
      cyclesCompleted: 0,
      totalFocusMinutes: 0,
      totalBreakMinutes: 0,
    };
  });
  
  // Computed remaining seconds
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  
  // Refs for timer interval
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastTickRef = useRef<number>(Date.now());
  const expectedRef = useRef<number | null>(null);
  
  // Request notification permission on mount
  useEffect(() => {
    if (settings.notificationsEnabled) {
      requestNotificationPermission();
    }
  }, [settings.notificationsEnabled]);
  
  // Persist state to localStorage
  useEffect(() => {
    if (state.status !== 'idle') {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  }, [state]);
  
  // Get current interval duration based on mode
  const getCurrentIntervalDuration = useCallback((): number => {
    switch (state.mode) {
      case 'focus':
        return settings.focusDuration * 60;
      case 'break':
        return settings.breakDuration * 60;
      case 'longBreak':
        return settings.longBreakDuration * 60;
      default:
        return settings.focusDuration * 60;
    }
  }, [state.mode, settings]);
  
  // Determine if it's time for a long break
  const isLastCycleBeforeLongBreak = state.cyclesCompleted > 0 && 
    state.cyclesCompleted % settings.cyclesBeforeLongBreak === 0;
  
  // Calculate progress percentage
  const progress = state.targetTimestamp && state.currentIntervalStartTime
    ? Math.min(100, Math.max(0, 
        ((Date.now() - state.currentIntervalStartTime) / 
         (state.targetTimestamp - state.currentIntervalStartTime)) * 100
      ))
    : 0;
  
  // Calculate session duration in minutes
  const sessionDuration = state.sessionStartTime 
    ? msToMinutes(Date.now() - state.sessionStartTime)
    : 0;
  
  // Handle interval completion
  const handleIntervalComplete = useCallback((countCycle = true) => {
    // Play sound and show notification
    if (settings.soundEnabled) {
      playNotificationSound();
    }
    
    if (settings.notificationsEnabled) {
      if (state.mode === 'focus') {
        showNotification('Focus Complete!', `Great work! Time for a ${isLastCycleBeforeLongBreak ? 'long' : 'short'} break.`);
      } else {
        showNotification('Break Complete!', 'Ready to focus again?');
      }
    }
    
    // Update state based on current mode
    setState(prev => {
      const newState = { ...prev };
      
      if (prev.mode === 'focus') {
        // Completed a focus interval
        if (countCycle) {
          newState.cyclesCompleted = prev.cyclesCompleted + 1;
        } else {
          newState.cyclesCompleted = prev.cyclesCompleted;
        }
        newState.totalFocusMinutes = prev.totalFocusMinutes + settings.focusDuration;
        
        // Check if we've reached target cycles
        if (settings.targetCycles && newState.cyclesCompleted >= settings.targetCycles) {
          newState.status = 'completed';
          newState.targetTimestamp = null;
          return newState;
        }
        
        // Switch to break mode
        if (isLastCycleBeforeLongBreak) {
          newState.mode = 'longBreak';
        } else {
          newState.mode = 'break';
        }
        
        // Auto-start break if enabled
        if (settings.autoStartBreaks) {
          const duration = newState.mode === 'longBreak' 
            ? settings.longBreakDuration 
            : settings.breakDuration;
          newState.currentIntervalStartTime = Date.now();
          newState.targetTimestamp = Date.now() + minutesToMs(duration);
        } else {
          newState.status = 'paused';
          newState.targetTimestamp = null;
        }
      } else {
        // Completed a break interval
        newState.totalBreakMinutes = prev.totalBreakMinutes + 
          (prev.mode === 'longBreak' ? settings.longBreakDuration : settings.breakDuration);
        
        // Switch back to focus mode
        newState.mode = 'focus';
        
        // Auto-start focus if enabled
        if (settings.autoStartFocus) {
          newState.currentIntervalStartTime = Date.now();
          newState.targetTimestamp = Date.now() + minutesToMs(settings.focusDuration);
        } else {
          newState.status = 'paused';
          newState.targetTimestamp = null;
        }
      }
      
      return newState;
    });
  }, [state.mode, settings, isLastCycleBeforeLongBreak]);

  // Advance to next interval helper
  const advanceToNextInterval = useCallback((startImmediately: boolean) => {
    // We'll compute the next interval duration in seconds so we can update UI immediately
    setState(prev => {
      const newState = { ...prev };

      // Determine next mode from current mode
      if (prev.mode === 'focus') {
        // Move to break or longBreak
        newState.totalFocusMinutes = prev.totalFocusMinutes + settings.focusDuration;
        if (isLastCycleBeforeLongBreak) {
          newState.mode = 'longBreak';
        } else {
          newState.mode = 'break';
        }

        const durationMinutes = newState.mode === 'longBreak' ? settings.longBreakDuration : settings.breakDuration;
        const durationSeconds = durationMinutes * 60;

        if (startImmediately) {
          newState.currentIntervalStartTime = Date.now();
          newState.targetTimestamp = Date.now() + minutesToMs(durationMinutes);
          newState.status = 'running';
          newState.pausedRemaining = null;
        } else {
          newState.status = 'paused';
          newState.currentIntervalStartTime = null;
          newState.targetTimestamp = null;
          // When paused and advancing, set pausedRemaining to the full next-interval length
          newState.pausedRemaining = durationSeconds;
        }
      } else {
        // Currently in a break -> move to focus
        newState.totalBreakMinutes = prev.totalBreakMinutes + (prev.mode === 'longBreak' ? settings.longBreakDuration : settings.breakDuration);
        newState.mode = 'focus';

        const durationMinutes = settings.focusDuration;
        const durationSeconds = durationMinutes * 60;

        if (startImmediately) {
          newState.currentIntervalStartTime = Date.now();
          newState.targetTimestamp = Date.now() + minutesToMs(durationMinutes);
          newState.status = 'running';
          newState.pausedRemaining = null;
        } else {
          newState.status = 'paused';
          newState.currentIntervalStartTime = null;
          newState.targetTimestamp = null;
          newState.pausedRemaining = durationSeconds;
        }
      }

      return newState;
    });

    // Update remainingSeconds immediately for UI feedback using a ref populated inside the setState updater
    const val = expectedRef.current ?? null;
    if (val !== null) {
      setRemainingSeconds(val);
      expectedRef.current = null;
    }
  }, [isLastCycleBeforeLongBreak, settings]);
  
  // Timer tick function
  const tick = useCallback(() => {
    const now = Date.now();
    
    // Handle tab throttling - if more than 2 seconds since last tick, recalculate
    if (now - lastTickRef.current > 2000) {
      // Tab was likely throttled, recalculate from target
      if (state.targetTimestamp) {
        const remaining = computeRemainingFromTarget(state.targetTimestamp);
        setRemainingSeconds(remaining);
        
        if (remaining <= 0) {
          handleIntervalComplete();
        }
      }
    } else {
      // Normal tick
      if (state.targetTimestamp) {
        const remaining = computeRemainingFromTarget(state.targetTimestamp);
        setRemainingSeconds(remaining);
        
        if (remaining <= 0) {
          handleIntervalComplete();
        }
      }
    }
    
    lastTickRef.current = now;
  }, [state.targetTimestamp, handleIntervalComplete]);
  
  // Set up timer interval
  useEffect(() => {
    if (state.status === 'running' && state.targetTimestamp) {
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      // Initial tick
      tick();
      
      // Set up new interval
      intervalRef.current = setInterval(tick, 100); // Update every 100ms for smooth display
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    } else {
      // Clear interval when not running
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      // Update remaining seconds based on state
      if (state.pausedRemaining !== null) {
        setRemainingSeconds(state.pausedRemaining);
      } else if (state.status === 'idle') {
        setRemainingSeconds(getCurrentIntervalDuration());
      }
    }
  }, [state.status, state.targetTimestamp, state.pausedRemaining, tick, getCurrentIntervalDuration]);
  
  // Action: Start session
  const startSession = useCallback(() => {
    const now = Date.now();
    const duration = getCurrentIntervalDuration();
    
    setState({
      mode: 'focus',
      status: 'running',
      sessionStartTime: now,
      currentIntervalStartTime: now,
      targetTimestamp: now + duration * 1000,
      pausedRemaining: null,
      cyclesCompleted: 0,
      totalFocusMinutes: 0,
      totalBreakMinutes: 0,
    });
  }, [getCurrentIntervalDuration]);
  
  // Action: Pause timer
  const pauseTimer = useCallback(() => {
    if (state.status === 'running' && state.targetTimestamp) {
      const remaining = computeRemainingFromTarget(state.targetTimestamp);
      setState(prev => ({
        ...prev,
        status: 'paused',
        pausedRemaining: remaining,
        targetTimestamp: null,
      }));
    }
  }, [state.status, state.targetTimestamp]);
  
  // Action: Resume timer
  const resumeTimer = useCallback(() => {
    if (state.status === 'paused' && state.pausedRemaining !== null) {
      const now = Date.now();
      setState(prev => {
        const fullDurationSeconds = getCurrentIntervalDuration();
        const paused = prev.pausedRemaining ?? 0;
        const elapsedSeconds = Math.max(0, fullDurationSeconds - paused);
        const currentIntervalStartTime = now - elapsedSeconds * 1000;
        const targetTimestamp = now + paused * 1000;
  // Debug to help reproduce progress issues
  console.debug('Resuming timer', { mode: prev.mode, fullDurationSeconds, paused, elapsedSeconds, currentIntervalStartTime, targetTimestamp });

        return {
          ...prev,
          status: 'running',
          currentIntervalStartTime,
          targetTimestamp,
          pausedRemaining: null,
        };
      });
    }
  }, [state.status, state.pausedRemaining, getCurrentIntervalDuration]);
  
  // Action: Stop timer (reset current interval)
  const stopTimer = useCallback(() => {
    // Reset the current interval to its full duration and pause.
    const fullDuration = getCurrentIntervalDuration();
    setState(prev => ({
      ...prev,
      status: 'paused',
      currentIntervalStartTime: null,
      targetTimestamp: null,
      // Set pausedRemaining so resumeTimer can restart the interval
      pausedRemaining: fullDuration,
    }));
    setRemainingSeconds(fullDuration);
  }, [getCurrentIntervalDuration]);
  
  // Action: End session (save to database)
  const endSession = useCallback(async (): Promise<SessionData | null> => {
    if (!state.sessionStartTime) return null;
    
    const endTime = Date.now();
    const durationMinutes = msToMinutes(endTime - state.sessionStartTime);
    
    // Create session data
    const sessionData: SessionData = {
      userId: '', // This will be filled by the component using auth context
      startTime: new Date(state.sessionStartTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      durationMinutes,
      cyclesCompleted: state.cyclesCompleted,
    };
    
    // Reset state
    setState({
      mode: 'focus',
      status: 'idle',
      sessionStartTime: null,
      currentIntervalStartTime: null,
      targetTimestamp: null,
      pausedRemaining: null,
      cyclesCompleted: 0,
      totalFocusMinutes: 0,
      totalBreakMinutes: 0,
    });
    
    // Clear localStorage
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    
    setRemainingSeconds(settings.focusDuration * 60);
    
    return sessionData;
  }, [state.sessionStartTime, state.cyclesCompleted, settings.focusDuration]);
  
  // Action: Skip current interval / go to next interval immediately
  const skipInterval = useCallback(() => {
    if (state.status === 'running') {
      // Immediately advance and start the next interval
      advanceToNextInterval(true);
    } else if (state.status === 'paused') {
      // When paused, advance mode but keep paused (so resume will start the next interval full length)
      advanceToNextInterval(false);
    }
  }, [state.status, advanceToNextInterval]);
  
  // Action: Update settings
  const updateSettings = useCallback((newSettings: Partial<PomodoroSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    saveSettings(updated);
    
    // If idle, update the displayed time
    if (state.status === 'idle') {
      setRemainingSeconds(updated.focusDuration * 60);
    }
  }, [settings, state.status]);
  
  return {
    // State
    mode: state.mode,
    status: state.status,
    remainingSeconds,
    cyclesCompleted: state.cyclesCompleted,
    sessionDuration,
    sessionStartTime: state.sessionStartTime,
    settings,
    
    // Actions
    startSession,
    pauseTimer,
    resumeTimer,
    stopTimer,
    endSession,
    skipInterval,
    updateSettings,
    
    // Computed values
    progress,
    currentIntervalDuration: getCurrentIntervalDuration(),
    isLastCycleBeforeLongBreak,
  };
}
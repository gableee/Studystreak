import React, { createContext } from 'react';
import type { PomodoroHookReturn } from '../types/PomodoroTypes';
import { usePomodoro } from '../hooks/usePomodoro';

const PomodoroContext = createContext<PomodoroHookReturn | null>(null);

export const PomodoroProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pomodoro = usePomodoro();
  return (
    <PomodoroContext.Provider value={pomodoro}>
      {children}
    </PomodoroContext.Provider>
  );
};

export default PomodoroContext;

import { useContext } from 'react';
import PomodoroContext from './PomodoroContext';
import type { PomodoroHookReturn } from '../types/PomodoroTypes';

export function usePomodoroContext(): PomodoroHookReturn | null {
  return useContext(PomodoroContext);
}

export default usePomodoroContext;

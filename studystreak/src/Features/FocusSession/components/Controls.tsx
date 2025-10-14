/**
 * Controls Component - Control buttons for the Pomodoro timer
 */

import React, { useState } from 'react';
import type { SessionStatus } from '../types/PomodoroTypes';
import { Play, Pause, RotateCcw, SkipForward, CheckCircle } from 'lucide-react';
import ResetConfirmModal from './ResetConfirmModal';

interface ControlsProps {
  status: SessionStatus;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onEnd: () => void;
  onSkip: () => void;
}

export const Controls: React.FC<ControlsProps> = ({
  status,
  onStart,
  onPause,
  onResume,
  onStop,
  onEnd,
  onSkip,
}) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-4">
      {/* Primary controls */}
      <div className="flex justify-center gap-3">
        {status === 'idle' && (
          <button
            onClick={onStart}
            className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all transform hover:scale-105 shadow-lg hover:shadow-blue-600/25"
          >
            <Play size={20} />
            <span className="font-semibold">Start Session</span>
          </button>
        )}
        
        {status === 'running' && (
          <button
            onClick={onPause}
            className="flex items-center gap-2 px-8 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-all transform hover:scale-105 shadow-lg hover:shadow-amber-500/25"
          >
            <Pause size={20} />
            <span className="font-semibold">Pause</span>
          </button>
        )}
        
        {status === 'paused' && (
          <button
            onClick={onResume}
            className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all transform hover:scale-105 shadow-lg hover:shadow-green-600/25"
          >
            <Play size={20} />
            <span className="font-semibold">Resume</span>
          </button>
        )}
        
        {status === 'paused' && (
          <>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-muted dark:bg-slate-700 text-muted-foreground dark:text-white rounded-xl hover:bg-gray-300 dark:hover:bg-slate-600 transition-all"
            >
              <RotateCcw size={20} />
              <span className="font-semibold">Reset</span>
            </button>
          </>
        )}
        
        {status === 'completed' && (
          <button
            onClick={onStart}
            className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all transform hover:scale-105 shadow-lg hover:shadow-blue-600/25"
          >
            <Play size={20} />
            <span className="font-semibold">Start New Session</span>
          </button>
        )}
      </div>
      
      {/* Secondary controls */}
      {(status === 'running' || status === 'paused') && (
        <div className="flex justify-center gap-3">
          <button
            onClick={onSkip}
            className="flex items-center gap-2 px-4 py-2 text-muted-foreground dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <SkipForward size={18} />
            <span className="text-sm font-medium">Next Interval</span>
          </button>
          
          {/* Always allow ending an active session (running or paused) */}
          <button
            onClick={onEnd}
            className="flex items-center gap-2 px-4 py-2 bg-red-600/10 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-600/20 transition-all"
          >
            <CheckCircle size={18} />
            <span className="text-sm font-medium">End Session</span>
          </button>
        </div>
      )}
      
      {status === 'completed' && (
        <div className="text-center">
          <p className="text-green-600 dark:text-green-400 font-medium">
            🎉 Session target reached! Great work!
          </p>
        </div>
      )}
      </div>
      {/* Reset confirmation modal */}
      <ResetConfirmModal
        open={showModal}
        onConfirm={() => {
          setShowModal(false);
          onStop();
        }}
        onCancel={() => setShowModal(false)}
      />
    </>
  );
};

export default Controls;
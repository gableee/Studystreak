// React imports not required directly in this file
import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import usePomodoroContext from '../context/PomodoroContextHooks';
import { TimerDisplay } from './TimerDisplay';

const HIDDEN_KEY = 'pomodoroModalHidden';
const MINIMIZED_KEY = 'pomodoroModalMinimized';
const POS_KEY = 'pomodoroModalPos';

export default function PomodoroModal() {
  const pomodoro = usePomodoroContext();
  const location = useLocation();
  const [hidden, setHidden] = useState(() => Boolean(localStorage.getItem(HIDDEN_KEY)));
  const [minimized, setMinimized] = useState(() => Boolean(localStorage.getItem(MINIMIZED_KEY)));
  const [pos, setPos] = useState<{ left: number; top: number } | null>(() => {
    try {
      const raw = localStorage.getItem(POS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const draggingRef = useRef<{ startX: number; startY: number; origLeft: number; origTop: number } | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    localStorage.setItem(HIDDEN_KEY, hidden ? '1' : '');
  }, [hidden]);

  // If user navigates to the Pomodoro page, clear the 'hidden' flag so the modal will
  // re-appear once they leave that page (close becomes temporary until they visit Pomodoro page).
  useEffect(() => {
    const isOnPomodoroPage = location.pathname === '/pomodoro' || location.pathname.startsWith('/pomodoro/');
    if (isOnPomodoroPage && hidden) {
      setHidden(false);
      localStorage.removeItem(HIDDEN_KEY);
    }
    // we intentionally include location.pathname and hidden
  }, [location.pathname, hidden]);

  useEffect(() => {
    localStorage.setItem(MINIMIZED_KEY, minimized ? '1' : '');
  }, [minimized]);

  useEffect(() => {
    if (pos) localStorage.setItem(POS_KEY, JSON.stringify(pos));
  }, [pos]);

  // if no provider or no active session, don't render
  if (!pomodoro) return null;
  if (pomodoro.status === 'idle') return null;

  // Only show modal when we're NOT on the pomodoro page itself (so it only appears on other routes)
  const isOnPomodoroPage = location.pathname === '/pomodoro' || location.pathname.startsWith('/pomodoro/');
  if (isOnPomodoroPage) return null;

  if (hidden) return null;

  // Compact modal - show only time and pause/resume (when minimized)
  const startDrag = (e: React.MouseEvent | React.TouchEvent) => {
    const ev = 'touches' in e ? e.touches[0] : (e as React.MouseEvent);
    const rect = modalRef.current?.getBoundingClientRect();
    const origLeft = rect ? rect.left : (pos ? pos.left : window.innerWidth - 280);
    const origTop = rect ? rect.top : (pos ? pos.top : window.innerHeight - 120);
    draggingRef.current = { startX: ev.clientX, startY: ev.clientY, origLeft, origTop };
    const onMove = (m: MouseEvent | TouchEvent) => {
      const mo = (m as TouchEvent).touches ? (m as TouchEvent).touches[0] as Touch : (m as MouseEvent);
      if (!draggingRef.current) return;
      const dx = mo.clientX - draggingRef.current.startX;
      const dy = mo.clientY - draggingRef.current.startY;
      const newLeft = Math.max(8, Math.min(window.innerWidth - 120, draggingRef.current.origLeft + dx));
      const newTop = Math.max(8, Math.min(window.innerHeight - 80, draggingRef.current.origTop + dy));
      setPos({ left: newLeft, top: newTop });
    };
    const onUp = () => {
      draggingRef.current = null;
      window.removeEventListener('mousemove', onMove as EventListener);
      window.removeEventListener('mouseup', onUp as EventListener);
      window.removeEventListener('touchmove', onMove as EventListener);
      window.removeEventListener('touchend', onUp as EventListener);
    };
    window.addEventListener('mousemove', onMove as EventListener);
    window.addEventListener('mouseup', onUp as EventListener);
    window.addEventListener('touchmove', onMove as EventListener, { passive: false });
    window.addEventListener('touchend', onUp as EventListener);
  };

  if (minimized) {
    return (
      <div ref={modalRef} className="fixed z-50 w-40 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-2 flex items-center gap-2"
        style={pos ? { left: pos.left, top: pos.top } as React.CSSProperties : { right: 16, bottom: 16 }}
        onMouseDown={(e) => startDrag(e)}
        onTouchStart={(e) => startDrag(e)}
      >
        <div className="flex-1">
          <div className="text-xs font-small text-muted-foreground">{pomodoro.sessionStartTime ? new Date(pomodoro.sessionStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}</div>
          <div className={`text-2xl font-semibold ${pomodoro.mode === 'focus' ? 'text-blue-500 dark:text-blue-400' : pomodoro.mode === 'break' ? 'text-green-500 dark:text-green-400' : 'text-purple-500 dark:text-purple-400'}`}>{Math.floor(pomodoro.remainingSeconds / 60).toString().padStart(2, '0')}:{(pomodoro.remainingSeconds % 60).toString().padStart(2, '0')}</div>
        </div>
        <div className="flex flex-col items-center gap-1">
            <div className="flex gap-1 mt-1">
                <button aria-label="Open" title="Open" className="text-xs text-muted-foreground px-2" onClick={() => setMinimized(false)}>▢</button>
                <button aria-label="Close" title="Close" className="text-xs text-muted-foreground px-2" onClick={() => setHidden(true)}>✕</button>
            </div>
            {pomodoro.status === 'running' ? (
                <button className="px-2 py-1 border-2 border-yellow-500/50 text-yellow-700 dark:text-white rounded text-sm" onClick={pomodoro.pauseTimer}>Pause</button>
            ) : (
                <button className="px-2 py-1 bg-green-500 text-white rounded text-sm" onClick={pomodoro.resumeTimer}>Resume</button>
            )}
        </div>
      </div>
    );
  }

  return (
    <div ref={modalRef} className="fixed z-50 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 overflow-hidden"
      style={pos ? { left: pos.left, top: pos.top } as React.CSSProperties : { right: 24, bottom: 24 }}
      onMouseDown={(e) => startDrag(e)}
      onTouchStart={(e) => startDrag(e)}
    >
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-medium cursor-move">
            Pomodoro
          </div>
          <div className="flex items-center gap-2">
            <button aria-label="Minimize" title="Minimize" className="text-xs text-muted-foreground px-2" onClick={() => setMinimized(true)}>—</button>
            <button aria-label="Close" title="Close" className="text-xs text-muted-foreground px-2" onClick={() => setHidden(true)}>✕</button>
          </div>
        </div>
        <div className="mb-2">
          <div className="text-[10px] text-muted-foreground">{pomodoro.sessionStartTime ? new Date(pomodoro.sessionStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</div>
        </div>
        <div className="mb-2">
          <TimerDisplay remainingSeconds={pomodoro.remainingSeconds} mode={pomodoro.mode} progress={pomodoro.progress} compact />
        </div>
        <div className="flex items-center justify-end gap-2">
          {pomodoro.status === 'running' ? (
            <button className="px-3 py-1 bg-yellow-500 text-white rounded text-sm" onClick={pomodoro.pauseTimer}>Pause</button>
          ) : (
            <button className="px-3 py-1 bg-green-500 text-white rounded text-sm" onClick={pomodoro.resumeTimer}>Resume</button>
          )}
        </div>
      </div>
    </div>
  );
}

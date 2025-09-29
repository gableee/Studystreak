/**
 * PomodoroSettings Component - Settings panel for configuring Pomodoro timer
 */

import React, { useState } from 'react';
import type { PomodoroSettings as Settings } from '../types/PomodoroTypes';
import { Settings as SettingsIcon, X, Volume2, Bell, PlayCircle } from 'lucide-react';

interface PomodoroSettingsProps {
  settings: Settings;
  onUpdateSettings: (newSettings: Partial<Settings>) => void;
  onClose: () => void;
}

export const PomodoroSettings: React.FC<PomodoroSettingsProps> = ({
  settings,
  onUpdateSettings,
  onClose,
}) => {
  const [localSettings, setLocalSettings] = useState<Settings>(settings);

  const handleChange = (key: keyof Settings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onUpdateSettings(localSettings);
    onClose();
  };

  const handleReset = () => {
    const defaultSettings: Settings = {
      focusDuration: 25,
      breakDuration: 5,
      longBreakDuration: 15,
      cyclesBeforeLongBreak: 4,
      autoStartBreaks: true,
      autoStartFocus: true,
      targetCycles: undefined,
      soundEnabled: true,
      notificationsEnabled: true,
    };
    setLocalSettings(defaultSettings);
  };

  return (
    <div className="bg-card dark:bg-slate-800 rounded-xl border border-border dark:border-transparent shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border dark:border-slate-700">
        <div className="flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-muted-foreground dark:text-slate-400" />
          <h3 className="text-lg font-semibold text-card-foreground dark:text-slate-100">
            Timer Settings
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-muted dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-muted-foreground dark:text-slate-400" />
        </button>
      </div>

      {/* Settings Content */}
      <div className="p-4 space-y-4">
        {/* Duration Settings */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground dark:text-slate-400 uppercase tracking-wider">
            Duration (minutes)
          </h4>
          
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground dark:text-slate-500 mb-1">
                Focus
              </label>
              <select
                value={localSettings.focusDuration}
                onChange={(e) => handleChange('focusDuration', Number(e.target.value))}
                className="w-full px-3 py-2 bg-muted dark:bg-slate-700 text-card-foreground dark:text-slate-100 rounded-lg border border-border dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[15, 20, 25, 30, 35, 40, 45, 50, 55, 60].map(val => (
                  <option key={val} value={val}>{val}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-muted-foreground dark:text-slate-500 mb-1">
                Short Break
              </label>
              <select
                value={localSettings.breakDuration}
                onChange={(e) => handleChange('breakDuration', Number(e.target.value))}
                className="w-full px-3 py-2 bg-muted dark:bg-slate-700 text-card-foreground dark:text-slate-100 rounded-lg border border-border dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[3, 5, 10, 15, 20].map(val => (
                  <option key={val} value={val}>{val}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-muted-foreground dark:text-slate-500 mb-1">
                Long Break
              </label>
              <select
                value={localSettings.longBreakDuration}
                onChange={(e) => handleChange('longBreakDuration', Number(e.target.value))}
                className="w-full px-3 py-2 bg-muted dark:bg-slate-700 text-card-foreground dark:text-slate-100 rounded-lg border border-border dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[10, 15, 20, 25, 30].map(val => (
                  <option key={val} value={val}>{val}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Cycles Settings */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground dark:text-slate-400 uppercase tracking-wider">
            Cycles
          </h4>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground dark:text-slate-500 mb-1">
                Cycles before long break
              </label>
              <select
                value={localSettings.cyclesBeforeLongBreak}
                onChange={(e) => handleChange('cyclesBeforeLongBreak', Number(e.target.value))}
                className="w-full px-3 py-2 bg-muted dark:bg-slate-700 text-card-foreground dark:text-slate-100 rounded-lg border border-border dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[2, 3, 4, 5, 6].map(val => (
                  <option key={val} value={val}>{val}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-muted-foreground dark:text-slate-500 mb-1">
                Target cycles per session
              </label>
              <select
                value={localSettings.targetCycles || ''}
                onChange={(e) => handleChange('targetCycles', e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 bg-muted dark:bg-slate-700 text-card-foreground dark:text-slate-100 rounded-lg border border-border dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No target</option>
                {[4, 6, 8, 10, 12, 16].map(val => (
                  <option key={val} value={val}>{val}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Automation Settings */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground dark:text-slate-400 uppercase tracking-wider">
            Automation
          </h4>
          
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={localSettings.autoStartBreaks}
                onChange={(e) => handleChange('autoStartBreaks', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex items-center gap-2">
                <PlayCircle className="w-4 h-4 text-muted-foreground dark:text-slate-500" />
                <span className="text-sm text-card-foreground dark:text-slate-200">
                  Auto-start breaks
                </span>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={localSettings.autoStartFocus}
                onChange={(e) => handleChange('autoStartFocus', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex items-center gap-2">
                <PlayCircle className="w-4 h-4 text-muted-foreground dark:text-slate-500" />
                <span className="text-sm text-card-foreground dark:text-slate-200">
                  Auto-start focus after break
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground dark:text-slate-400 uppercase tracking-wider">
            Notifications
          </h4>
          
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={localSettings.soundEnabled}
                onChange={(e) => handleChange('soundEnabled', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-muted-foreground dark:text-slate-500" />
                <span className="text-sm text-card-foreground dark:text-slate-200">
                  Sound notifications
                </span>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={localSettings.notificationsEnabled}
                onChange={(e) => handleChange('notificationsEnabled', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-muted-foreground dark:text-slate-500" />
                <span className="text-sm text-card-foreground dark:text-slate-200">
                  Browser notifications
                </span>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-4 border-t border-border dark:border-slate-700">
        <button
          onClick={handleReset}
          className="px-4 py-2 text-sm text-muted-foreground dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
        >
          Reset to defaults
        </button>
        
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-muted dark:bg-slate-700 text-muted-foreground dark:text-slate-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default PomodoroSettings;
import React from 'react';

interface ResetConfirmModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ResetConfirmModal: React.FC<ResetConfirmModalProps> = ({ open, onConfirm, onCancel }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 z-10 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-2 text-foreground dark:text-slate-100">Reset current interval?</h3>
        <p className="text-sm text-muted-foreground mb-4">This will reset the timer for the current interval but keep your overall session start time and cycles.</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-red-600 text-white">Reset</button>
        </div>
      </div>
    </div>
  );
};

export default ResetConfirmModal;
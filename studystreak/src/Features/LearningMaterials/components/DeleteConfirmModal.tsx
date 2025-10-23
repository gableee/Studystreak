import React from 'react'

interface DeleteConfirmModalProps {
  open: boolean
  title?: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  open,
  title = 'Delete material',
  message = 'Are you sure you want to delete this material? This action cannot be undone.',
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}) => {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 z-10 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-2 text-slate-900 dark:text-slate-100">{title}</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white">{cancelLabel}</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-rose-600 text-white">{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

export default DeleteConfirmModal

import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  subjectName: string;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  subjectName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2.5 text-rose-400">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/20">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white">Удалить предмет?</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-2 text-xs text-neutral-400 leading-relaxed">
          Вы действительно хотите удалить предмет{' '}
          <strong className="text-white">«{subjectName}»</strong>? Все внесённые баллы, задания и шкала будут удалены.
        </p>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-medium text-neutral-300 hover:bg-neutral-800 transition"
          >
            Отмена
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 transition shadow-lg shadow-rose-600/20"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Удалить</span>
          </button>
        </div>
      </div>
    </div>
  );
};

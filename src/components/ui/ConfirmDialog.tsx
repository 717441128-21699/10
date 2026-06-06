import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmText = '确认',
  cancelText = '取消',
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onCancel}
      />
      <div className="relative bg-white rounded-2xl shadow-card p-6 w-full max-w-sm animate-scale-in">
        <div className="flex items-start gap-4 mb-4">
          <div
            className={cn(
              'w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center',
              confirmVariant === 'danger' ? 'bg-danger-100' : 'bg-warning-100'
            )}
          >
            <AlertTriangle
              className={cn(
                'w-6 h-6',
                confirmVariant === 'danger' ? 'text-danger-500' : 'text-warning-500'
              )}
            />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-ink-900">{title}</h3>
            {description && (
              <p className="mt-1 text-sm text-ink-500">{description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 mt-6">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-sm font-medium text-ink-700 bg-ink-100 hover:bg-ink-200 transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors disabled:opacity-50',
              confirmVariant === 'danger'
                ? 'bg-danger-500 hover:bg-danger-600'
                : 'bg-primary-500 hover:bg-primary-600'
            )}
          >
            {loading ? '处理中...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

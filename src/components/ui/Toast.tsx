import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastComponentProps {
  toast: ToastItem;
  onClose: (id: number) => void;
}

const TOAST_CONFIG: Record<
  ToastType,
  {
    icon: React.ComponentType<{ className?: string }>;
    bgClass: string;
    iconClass: string;
    borderClass: string;
  }
> = {
  success: {
    icon: CheckCircle,
    bgClass: 'bg-success-50',
    iconClass: 'text-success-500',
    borderClass: 'border-success-200',
  },
  error: {
    icon: XCircle,
    bgClass: 'bg-danger-50',
    iconClass: 'text-danger-500',
    borderClass: 'border-danger-200',
  },
  warning: {
    icon: AlertCircle,
    bgClass: 'bg-warning-50',
    iconClass: 'text-warning-500',
    borderClass: 'border-warning-200',
  },
  info: {
    icon: Info,
    bgClass: 'bg-accent-50',
    iconClass: 'text-accent-500',
    borderClass: 'border-accent-200',
  },
};

let toastId = 0;
let setToastsCallback:
  | ((toasts: ToastItem[] | ((prev: ToastItem[]) => ToastItem[])) => void)
  | null = null;
const toastQueue: ToastItem[] = [];

function ToastComponent({ toast, onClose }: ToastComponentProps) {
  const [isVisible, setIsVisible] = useState(false);
  const config = TOAST_CONFIG[toast.type];
  const Icon = config.icon;

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(toast.id), 200);
    }, 3000);
    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl border shadow-card min-w-[280px] max-w-md transition-all duration-200',
        config.bgClass,
        config.borderClass,
        isVisible
          ? 'opacity-100 translate-x-0'
          : 'opacity-0 translate-x-full'
      )}
    >
      <Icon className={cn('w-5 h-5 flex-shrink-0', config.iconClass)} />
      <span className="flex-1 text-sm text-ink-800">{toast.message}</span>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(() => onClose(toast.id), 200);
        }}
        className="p-1 rounded-lg hover:bg-white/60 text-ink-400 hover:text-ink-600 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    setToastsCallback = setToasts;
    if (toastQueue.length > 0) {
      setToasts([...toastQueue]);
      toastQueue.length = 0;
    }
    return () => {
      setToastsCallback = null;
    };
  }, []);

  const handleClose = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (!document.body) return null;

  return createPortal(
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastComponent key={toast.id} toast={toast} onClose={handleClose} />
      ))}
    </div>,
    document.body
  );
}

export function showToast(message: string, type: ToastType = 'info') {
  const newToast: ToastItem = {
    id: ++toastId,
    message,
    type,
  };

  if (setToastsCallback) {
    setToastsCallback((prev) => [...prev, newToast]);
  } else {
    toastQueue.push(newToast);
  }
}

export default ToastContainer;

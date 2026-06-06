import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export default function EmptyState({
  icon: Icon = Inbox,
  title = '暂无数据',
  description,
  actions,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center animate-fade-in',
        className
      )}
    >
      <div className="w-16 h-16 rounded-full bg-ink-100 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-ink-400" />
      </div>
      <h3 className="text-lg font-medium text-ink-900 mb-1">{title}</h3>
      {description && (
        <p className="text-ink-500 text-sm mb-4 max-w-md">{description}</p>
      )}
      {actions && <div className="flex items-center gap-2 mt-2">{actions}</div>}
    </div>
  );
}

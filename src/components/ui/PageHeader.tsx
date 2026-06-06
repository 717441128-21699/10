import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}

export default function PageHeader({
  title,
  subtitle,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6',
        className
      )}
    >
      <div>
        <h1 className="text-2xl md:text-3xl font-display text-ink-900">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-ink-500 text-sm md:text-base">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

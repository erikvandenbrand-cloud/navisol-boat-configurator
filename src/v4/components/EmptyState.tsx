'use client';

import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

/**
 * Consistent empty state component for use across the app
 * Provides a calm, helpful message when there's no data to display
 */
export function EmptyState({ icon: Icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className}`}>
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-5">
        <Icon className="h-8 w-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mb-6">{description}</p>
      {action && (
        <Button onClick={action.onClick} variant="outline">
          {action.label}
        </Button>
      )}
    </div>
  );
}

/**
 * Smaller inline empty state for use in cards/sections
 */
interface InlineEmptyStateProps {
  icon: LucideIcon;
  message: string;
  className?: string;
}

export function InlineEmptyState({ icon: Icon, message, className = '' }: InlineEmptyStateProps) {
  return (
    <div className={`flex items-center gap-3 py-6 px-4 text-slate-500 ${className}`}>
      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
        <Icon className="h-5 w-5 text-slate-400" />
      </div>
      <p className="text-sm">{message}</p>
    </div>
  );
}

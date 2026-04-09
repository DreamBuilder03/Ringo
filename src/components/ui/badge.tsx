import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  const variants = {
    default: 'bg-ringo-border text-ringo-muted',
    success: 'bg-emerald-400/10 text-emerald-400',
    warning: 'bg-amber-400/10 text-amber-400',
    danger: 'bg-red-400/10 text-red-400',
    info: 'bg-blue-400/10 text-blue-400',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

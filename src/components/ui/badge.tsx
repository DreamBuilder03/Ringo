import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  const variants = {
    default: 'bg-smoke/50 text-stone border border-smoke',
    success: 'bg-bone/15 text-bone border border-bone/30',
    warning: 'bg-chalk/15 text-chalk border border-chalk/30',
    danger: 'bg-stone/20 text-bone border border-stone/40',
    info: 'bg-graphite text-chalk border border-smoke',
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

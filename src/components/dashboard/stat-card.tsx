import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; positive: boolean };
  className?: string;
}

export function StatCard({ title, value, subtitle, icon: Icon, trend, className }: StatCardProps) {
  return (
    <div className={cn('rounded-xl border border-ringo-border bg-ringo-card p-6', className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-ringo-muted">{title}</p>
          <p className="text-2xl font-semibold text-foreground">{value}</p>
          {subtitle && <p className="text-xs text-ringo-muted">{subtitle}</p>}
        </div>
        <div className="rounded-lg bg-ringo-teal/10 p-2.5">
          <Icon className="h-5 w-5 text-ringo-teal" />
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1">
          <span
            className={cn(
              'text-xs font-medium',
              trend.positive ? 'text-emerald-400' : 'text-red-400'
            )}
          >
            {trend.positive ? '+' : ''}{trend.value}%
          </span>
          <span className="text-xs text-ringo-muted">vs last week</span>
        </div>
      )}
    </div>
  );
}

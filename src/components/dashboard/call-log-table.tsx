'use client';

import { format } from 'date-fns';
import { cn, formatCurrency, formatDuration, getCallOutcomeLabel, getCallOutcomeColor } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { Call } from '@/types/database';

interface CallLogTableProps {
  calls: Call[];
  onSelectCall?: (call: Call) => void;
}

export function CallLogTable({ calls, onSelectCall }: CallLogTableProps) {
  if (calls.length === 0) {
    return (
      <div className="rounded-xl border border-ringo-border bg-ringo-card p-12 text-center">
        <p className="text-ringo-muted">No calls yet today</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-ringo-border bg-ringo-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ringo-border">
              <th className="px-4 py-3 text-left text-xs font-medium text-ringo-muted uppercase tracking-wider">
                Time
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-ringo-muted uppercase tracking-wider">
                Duration
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-ringo-muted uppercase tracking-wider">
                Outcome
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-ringo-muted uppercase tracking-wider">
                Order Total
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-ringo-muted uppercase tracking-wider">
                Upsell
              </th>
            </tr>
          </thead>
          <tbody>
            {calls.map((call) => (
              <tr
                key={call.id}
                onClick={() => onSelectCall?.(call)}
                className={cn(
                  'border-b border-ringo-border/50 transition-colors',
                  onSelectCall && 'cursor-pointer hover:bg-ringo-border/20'
                )}
              >
                <td className="px-4 py-3 text-foreground">
                  {format(new Date(call.start_time), 'h:mm a')}
                </td>
                <td className="px-4 py-3 text-ringo-muted">
                  {call.duration_seconds ? formatDuration(call.duration_seconds) : '—'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                      getCallOutcomeColor(call.call_outcome)
                    )}
                  >
                    {getCallOutcomeLabel(call.call_outcome)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-foreground font-medium">
                  {call.order_total > 0 ? formatCurrency(call.order_total) : '—'}
                </td>
                <td className="px-4 py-3 text-right text-ringo-amber font-medium">
                  {call.upsell_total > 0 ? formatCurrency(call.upsell_total) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

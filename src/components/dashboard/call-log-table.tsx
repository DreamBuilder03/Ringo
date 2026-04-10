'use client';

import { format } from 'date-fns';
import { cn, formatCurrency, formatDuration, getCallOutcomeLabel } from '@/lib/utils';
import { Phone, PhoneOff, ShoppingCart, HelpCircle, ArrowUpRight, ChevronRight } from 'lucide-react';
import type { Call } from '@/types/database';

interface CallLogTableProps {
  calls: Call[];
  onSelectCall?: (call: Call) => void;
  compact?: boolean;
}

const outcomeConfig = {
  order_placed: {
    icon: ShoppingCart,
    label: 'Order Placed',
    bg: 'bg-emerald-400/10',
    text: 'text-emerald-400',
    border: 'border-emerald-400/20',
    dot: 'bg-emerald-400',
  },
  inquiry: {
    icon: HelpCircle,
    label: 'Inquiry',
    bg: 'bg-blue-400/10',
    text: 'text-blue-400',
    border: 'border-blue-400/20',
    dot: 'bg-blue-400',
  },
  missed: {
    icon: PhoneOff,
    label: 'Missed',
    bg: 'bg-red-400/10',
    text: 'text-red-400',
    border: 'border-red-400/20',
    dot: 'bg-red-400',
  },
  upsell_only: {
    icon: ArrowUpRight,
    label: 'Upsell Only',
    bg: 'bg-ringo-amber/10',
    text: 'text-ringo-amber',
    border: 'border-ringo-amber/20',
    dot: 'bg-ringo-amber',
  },
};

export function CallLogTable({ calls, onSelectCall, compact }: CallLogTableProps) {
  if (calls.length === 0) {
    return (
      <div className="rounded-2xl border border-ringo-border bg-ringo-card p-12 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-ringo-border/30 flex items-center justify-center mb-3">
          <Phone className="h-5 w-5 text-ringo-muted" />
        </div>
        <p className="text-sm font-medium text-ringo-muted">No calls yet today</p>
        <p className="text-xs text-ringo-muted/60 mt-1">Calls will appear here as they come in</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-ringo-border bg-ringo-card overflow-hidden">
      {/* Table header */}
      <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-ringo-border bg-ringo-darker/50">
        <div className="col-span-3 text-[10px] font-bold uppercase tracking-widest text-ringo-muted">
          Time
        </div>
        <div className="col-span-2 text-[10px] font-bold uppercase tracking-widest text-ringo-muted">
          Duration
        </div>
        <div className="col-span-3 text-[10px] font-bold uppercase tracking-widest text-ringo-muted">
          Outcome
        </div>
        <div className="col-span-2 text-[10px] font-bold uppercase tracking-widest text-ringo-muted text-right">
          Order
        </div>
        <div className="col-span-2 text-[10px] font-bold uppercase tracking-widest text-ringo-muted text-right">
          Upsell
        </div>
      </div>

      {/* Table body */}
      <div className="divide-y divide-ringo-border/30">
        {(compact ? calls.slice(0, 5) : calls).map((call, index) => {
          const config = outcomeConfig[call.call_outcome as keyof typeof outcomeConfig] || outcomeConfig.missed;
          const OutcomeIcon = config.icon;

          return (
            <div
              key={call.id}
              onClick={() => onSelectCall?.(call)}
              className={cn(
                'grid grid-cols-12 gap-4 px-5 py-3.5 items-center transition-all duration-200',
                onSelectCall && 'cursor-pointer hover:bg-ringo-teal/[0.03]',
                index === 0 && 'bg-ringo-teal/[0.02]'
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Time */}
              <div className="col-span-3 flex items-center gap-2.5">
                <div className="relative">
                  <div className="h-8 w-8 rounded-lg bg-ringo-border/30 flex items-center justify-center">
                    <Phone className="h-3.5 w-3.5 text-ringo-muted" />
                  </div>
                  {index === 0 && (
                    <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-ringo-teal border-2 border-ringo-card animate-pulse" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {format(new Date(call.start_time), 'h:mm a')}
                  </p>
                  <p className="text-[10px] text-ringo-muted">
                    {format(new Date(call.start_time), 'MMM d')}
                  </p>
                </div>
              </div>

              {/* Duration */}
              <div className="col-span-2">
                <p className="text-sm text-ringo-muted font-mono">
                  {call.duration_seconds ? formatDuration(call.duration_seconds) : '—'}
                </p>
              </div>

              {/* Outcome */}
              <div className="col-span-3">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border',
                    config.bg,
                    config.text,
                    config.border
                  )}
                >
                  <OutcomeIcon className="h-3 w-3" />
                  {config.label}
                </span>
              </div>

              {/* Order Total */}
              <div className="col-span-2 text-right">
                {call.order_total > 0 ? (
                  <p className="text-sm font-semibold text-foreground">{formatCurrency(call.order_total)}</p>
                ) : (
                  <p className="text-sm text-ringo-muted/40">—</p>
                )}
              </div>

              {/* Upsell */}
              <div className="col-span-2 flex items-center justify-end gap-2">
                {call.upsell_total > 0 ? (
                  <p className="text-sm font-semibold text-ringo-amber">{formatCurrency(call.upsell_total)}</p>
                ) : (
                  <p className="text-sm text-ringo-muted/40">—</p>
                )}
                {onSelectCall && (
                  <ChevronRight className="h-3.5 w-3.5 text-ringo-muted/30" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      {compact && calls.length > 5 && (
        <div className="px-5 py-3 border-t border-ringo-border bg-ringo-darker/30 text-center">
          <button className="text-xs font-medium text-ringo-teal hover:text-ringo-teal-light transition-colors">
            View all {calls.length} calls →
          </button>
        </div>
      )}
    </div>
  );
}

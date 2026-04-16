'use client';

import { format } from 'date-fns';
import { cn, formatCurrency, formatDuration, getCallOutcomeLabel } from '@/lib/utils';
import { Phone, PhoneOff, ShoppingCart, HelpCircle, ArrowUpRight, ChevronRight, Play } from 'lucide-react';
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
    bg: 'bg-bone',
    text: 'text-bone',
    border: 'border-bone',
    dot: 'bg-bone',
  },
  inquiry: {
    icon: HelpCircle,
    label: 'Inquiry',
    bg: 'bg-bone',
    text: 'text-bone',
    border: 'border-bone',
    dot: 'bg-bone',
  },
  missed: {
    icon: PhoneOff,
    label: 'Missed',
    bg: 'bg-bone',
    text: 'text-bone',
    border: 'border-bone',
    dot: 'bg-bone',
  },
  upsell_only: {
    icon: ArrowUpRight,
    label: 'Upsell Only',
    bg: 'bg-chalk/15',
    text: 'text-chalk',
    border: 'border-chalk/30',
    dot: 'bg-chalk',
  },
};

export function CallLogTable({ calls, onSelectCall, compact }: CallLogTableProps) {
  if (calls.length === 0) {
    return (
      <div className="rounded-2xl border border-smoke bg-coal/80 backdrop-blur-sm p-12 text-center ring-1 ring-bone/[0.02]">
        <div className="mx-auto w-12 h-12 rounded-full bg-smoke/40 flex items-center justify-center mb-3">
          <Phone className="h-5 w-5 text-stone" />
        </div>
        <p className="text-sm font-medium text-stone">No calls yet today</p>
        <p className="text-xs text-stone/70 mt-1">Calls will appear here as they come in</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-smoke bg-coal/80 backdrop-blur-sm overflow-hidden ring-1 ring-bone/[0.02] shadow-sm">
      {/* Table header - hidden on mobile */}
      <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 border-b border-smoke bg-graphite/60">
        <div className="col-span-3 text-[10px] font-bold uppercase tracking-widest text-stone">
          Time
        </div>
        <div className="col-span-2 text-[10px] font-bold uppercase tracking-widest text-stone">
          Duration
        </div>
        <div className="col-span-3 text-[10px] font-bold uppercase tracking-widest text-stone">
          Outcome
        </div>
        <div className="col-span-2 text-[10px] font-bold uppercase tracking-widest text-stone text-right">
          Order
        </div>
        <div className="col-span-2 text-[10px] font-bold uppercase tracking-widest text-stone text-right">
          Upsell
        </div>
      </div>

      {/* Table body */}
      <div className="divide-y divide-smoke/40">
        {(compact ? calls.slice(0, 5) : calls).map((call, index) => {
          const config = outcomeConfig[call.call_outcome as keyof typeof outcomeConfig] || outcomeConfig.missed;
          const OutcomeIcon = config.icon;

          return (
            <div
              key={call.id}
              onClick={() => onSelectCall?.(call)}
              className={cn(
                'transition-[opacity,background-color,transform] duration-200',
                onSelectCall && 'cursor-pointer hover:bg-bone/[0.03]',
                index === 0 && 'bg-bone/[0.02]'
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Mobile layout */}
              <div className="md:hidden flex items-center justify-between px-4 py-3.5 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative flex-shrink-0">
                    <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center', config.bg)}>
                      <OutcomeIcon className={cn('h-4 w-4', config.text)} />
                    </div>
                    {index === 0 && (
                      <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-bone border-2 border-coal animate-pulse" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-bone">
                        {format(new Date(call.start_time), 'h:mm a')}
                      </p>
                      <span className={cn('text-[10px] font-bold', config.text)}>{config.label}</span>
                    </div>
                    <p className="text-[10px] text-stone">
                      {format(new Date(call.start_time), 'MMM d')} · {call.duration_seconds ? formatDuration(call.duration_seconds) : 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-right">
                    {call.order_total > 0 ? (
                      <p className="text-sm font-bold text-bone">{formatCurrency(call.order_total)}</p>
                    ) : (
                      <p className="text-sm text-stone/50">—</p>
                    )}
                    {call.upsell_total > 0 && (
                      <p className="text-[10px] font-semibold text-chalk">+{formatCurrency(call.upsell_total)}</p>
                    )}
                  </div>
                  {call.recording_url && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(call.recording_url, '_blank');
                      }}
                      className="p-1.5 rounded-lg hover:bg-bone/[0.15] transition-[opacity,background-color] duration-200"
                    >
                      <Play className="h-4 w-4 text-bone" />
                    </button>
                  )}
                </div>
              </div>

              {/* Desktop layout */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3.5 items-center">
                {/* Time */}
                <div className="col-span-3 flex items-center gap-2.5">
                  <div className="relative">
                    <div className="h-8 w-8 rounded-lg bg-smoke/40 flex items-center justify-center">
                      <Phone className="h-3.5 w-3.5 text-stone" />
                    </div>
                    {index === 0 && (
                      <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-bone border-2 border-coal animate-pulse" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-bone">
                      {format(new Date(call.start_time), 'h:mm a')}
                    </p>
                    <p className="text-[10px] text-stone">
                      {format(new Date(call.start_time), 'MMM d')}
                    </p>
                  </div>
                </div>

                {/* Duration */}
                <div className="col-span-2">
                  <p className="text-sm text-stone font-mono">
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
                    <p className="text-sm font-semibold text-bone">{formatCurrency(call.order_total)}</p>
                  ) : (
                    <p className="text-sm text-stone/50">—</p>
                  )}
                </div>

                {/* Upsell */}
                <div className="col-span-2 flex items-center justify-end gap-2">
                  {call.upsell_total > 0 ? (
                    <p className="text-sm font-semibold text-chalk">{formatCurrency(call.upsell_total)}</p>
                  ) : (
                    <p className="text-sm text-stone/50">—</p>
                  )}
                  {call.recording_url && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(call.recording_url, '_blank');
                      }}
                      className="p-1.5 rounded-lg hover:bg-bone/[0.15] transition-[opacity,background-color] duration-200"
                    >
                      <Play className="h-4 w-4 text-bone hover:text-chalk" />
                    </button>
                  )}
                  {onSelectCall && (
                    <ChevronRight className="h-3.5 w-3.5 text-stone/50" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      {compact && calls.length > 5 && (
        <div className="px-5 py-3 border-t border-smoke bg-graphite/40 text-center">
          <button className="text-xs font-medium text-bone hover:text-chalk transition-[color,opacity] duration-200">
            View all {calls.length} calls →
          </button>
        </div>
      )}
    </div>
  );
}

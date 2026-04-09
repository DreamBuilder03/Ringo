'use client';

import { format } from 'date-fns';
import { X, Phone } from 'lucide-react';
import { formatCurrency, formatDuration, getCallOutcomeLabel, getCallOutcomeColor } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { Call } from '@/types/database';

interface TranscriptViewerProps {
  call: Call;
  onClose: () => void;
}

export function TranscriptViewer({ call, onClose }: TranscriptViewerProps) {
  const lines = call.transcript
    ? call.transcript.split('\n').filter((l) => l.trim())
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[80vh] rounded-xl border border-ringo-border bg-ringo-darker flex flex-col overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-ringo-border">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-ringo-teal/10 p-2">
              <Phone className="h-4 w-4 text-ringo-teal" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Call at {format(new Date(call.start_time), 'h:mm a, MMM d')}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-ringo-muted">
                  {call.duration_seconds ? formatDuration(call.duration_seconds) : 'N/A'}
                </span>
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                    getCallOutcomeColor(call.call_outcome)
                  )}
                >
                  {getCallOutcomeLabel(call.call_outcome)}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-ringo-card transition-colors">
            <X className="h-5 w-5 text-ringo-muted" />
          </button>
        </div>

        {/* Stats bar */}
        {(call.order_total > 0 || call.upsell_total > 0) && (
          <div className="flex gap-6 px-4 py-3 border-b border-ringo-border bg-ringo-card/50">
            {call.order_total > 0 && (
              <div>
                <p className="text-xs text-ringo-muted">Order Total</p>
                <p className="text-sm font-semibold text-foreground">{formatCurrency(call.order_total)}</p>
              </div>
            )}
            {call.upsell_total > 0 && (
              <div>
                <p className="text-xs text-ringo-muted">Upsell Revenue</p>
                <p className="text-sm font-semibold text-ringo-amber">{formatCurrency(call.upsell_total)}</p>
              </div>
            )}
          </div>
        )}

        {/* Transcript */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {lines.length > 0 ? (
            lines.map((line, i) => {
              const isAgent = line.toLowerCase().startsWith('agent:') || line.toLowerCase().startsWith('ringo:');
              const cleanLine = line.replace(/^(agent|ringo|customer|caller):\s*/i, '');
              return (
                <div
                  key={i}
                  className={cn(
                    'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                    isAgent
                      ? 'bg-ringo-teal/10 text-foreground ml-auto'
                      : 'bg-ringo-card text-foreground'
                  )}
                >
                  <p className="text-xs text-ringo-muted mb-1">
                    {isAgent ? 'Ringo' : 'Customer'}
                  </p>
                  {cleanLine}
                </div>
              );
            })
          ) : (
            <div className="text-center text-ringo-muted py-8">
              No transcript available for this call
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

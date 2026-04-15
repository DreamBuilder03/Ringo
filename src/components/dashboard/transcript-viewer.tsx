'use client';

import { format } from 'date-fns';
import { X, Phone, Bot, User, DollarSign, ArrowUpRight, Clock, Copy, Check } from 'lucide-react';
import { formatCurrency, formatDuration } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { Call } from '@/types/database';
import { useState } from 'react';

interface TranscriptViewerProps {
  call: Call;
  onClose: () => void;
}

const outcomeConfig: Record<string, { label: string; bg: string; text: string }> = {
  order_placed: { label: 'Order Placed', bg: 'bg-bone/10 border-bone/20', text: 'text-bone' },
  inquiry: { label: 'Inquiry', bg: 'bg-bone/10 border-bone/20', text: 'text-bone' },
  missed: { label: 'Missed', bg: 'bg-bone/10 border-bone/20', text: 'text-bone' },
  upsell_only: { label: 'Upsell', bg: 'bg-ringo-amber/10 border-ringo-amber/20', text: 'text-ringo-amber' },
};

export function TranscriptViewer({ call, onClose }: TranscriptViewerProps) {
  const [copied, setCopied] = useState(false);
  const lines = call.transcript
    ? call.transcript.split('\n').filter((l) => l.trim())
    : [];

  const config = outcomeConfig[call.call_outcome] || outcomeConfig.missed;

  function handleCopy() {
    if (call.transcript) {
      navigator.clipboard.writeText(call.transcript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-obsidian/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[85vh] rounded-2xl border border-ringo-border bg-ringo-darker flex flex-col overflow-hidden animate-fade-in shadow-2xl shadow-obsidian/50">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-ringo-border bg-gradient-to-r from-ringo-card to-ringo-darker">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="rounded-xl bg-ringo-teal/15 p-3">
                <Phone className="h-5 w-5 text-ringo-teal" />
              </div>
            </div>
            <div>
              <p className="text-base font-bold text-foreground">
                Call at {format(new Date(call.start_time), 'h:mm a')}
              </p>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-1 text-ringo-muted">
                  <Clock className="h-3 w-3" />
                  <span className="text-xs">
                    {call.duration_seconds ? formatDuration(call.duration_seconds) : 'N/A'}
                  </span>
                </div>
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border',
                    config.bg,
                    config.text
                  )}
                >
                  {config.label}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="rounded-lg p-2 hover:bg-ringo-card transition-colors text-ringo-muted hover:text-foreground"
              title="Copy transcript"
            >
              {copied ? <Check className="h-4 w-4 text-bone" /> : <Copy className="h-4 w-4" />}
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-2 hover:bg-ringo-card transition-colors text-ringo-muted hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Stats bar */}
        {(call.order_total > 0 || call.upsell_total > 0) && (
          <div className="flex gap-8 px-5 py-3.5 border-b border-ringo-border bg-ringo-card/30">
            {call.order_total > 0 && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-3.5 w-3.5 text-ringo-muted" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-ringo-muted">Order</p>
                  <p className="text-sm font-bold text-foreground">{formatCurrency(call.order_total)}</p>
                </div>
              </div>
            )}
            {call.upsell_total > 0 && (
              <div className="flex items-center gap-2">
                <ArrowUpRight className="h-3.5 w-3.5 text-ringo-amber" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-ringo-muted">Upsell</p>
                  <p className="text-sm font-bold text-ringo-amber">{formatCurrency(call.upsell_total)}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <DollarSign className="h-3.5 w-3.5 text-ringo-teal" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ringo-muted">Total</p>
                <p className="text-sm font-bold text-ringo-teal">{formatCurrency(call.order_total + call.upsell_total)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Transcript */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {lines.length > 0 ? (
            lines.map((line, i) => {
              const isAgent = line.toLowerCase().startsWith('agent:') || line.toLowerCase().startsWith('ringo:');
              const cleanLine = line.replace(/^(agent|ringo|customer|caller):\s*/i, '');
              return (
                <div
                  key={i}
                  className={cn(
                    'flex gap-2.5',
                    isAgent ? 'flex-row-reverse' : 'flex-row'
                  )}
                >
                  <div className={cn(
                    'flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center',
                    isAgent ? 'bg-ringo-teal/15' : 'bg-ringo-border/40'
                  )}>
                    {isAgent ? (
                      <Bot className="h-3.5 w-3.5 text-ringo-teal" />
                    ) : (
                      <User className="h-3.5 w-3.5 text-ringo-muted" />
                    )}
                  </div>
                  <div
                    className={cn(
                      'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm',
                      isAgent
                        ? 'bg-ringo-teal/10 border border-ringo-teal/15 text-foreground'
                        : 'bg-ringo-card border border-ringo-border text-foreground'
                    )}
                  >
                    {cleanLine}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center text-ringo-muted py-12">
              <Phone className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">No transcript available</p>
              <p className="text-xs text-ringo-muted/60 mt-1">This call may not have been recorded</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

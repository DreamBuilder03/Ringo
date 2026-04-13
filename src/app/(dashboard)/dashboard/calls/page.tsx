'use client';

import { useState, useEffect } from 'react';
import { CallLogTable } from '@/components/dashboard/call-log-table';
import { TranscriptViewer } from '@/components/dashboard/transcript-viewer';
import { createClient } from '@/lib/supabase/client';
import { getUserRestaurant, getRecentCalls } from '@/lib/queries';
import { Phone, Filter, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Call } from '@/types/database';

const outcomeFilters = [
  { value: 'all', label: 'All Calls' },
  { value: 'order_placed', label: 'Orders' },
  { value: 'inquiry', label: 'Inquiries' },
  { value: 'missed', label: 'Missed' },
];

export default function CallsPage() {
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [calls, setCalls] = useState<Call[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(0);
  const pageSize = 25;

  useEffect(() => {
    async function loadCalls() {
      setLoading(true);
      const supabase = createClient();
      const restaurant = await getUserRestaurant(supabase);
      if (!restaurant) {
        setLoading(false);
        return;
      }

      const result = await getRecentCalls(
        supabase,
        restaurant.id,
        pageSize,
        page * pageSize,
        filter
      );

      setCalls(result.calls);
      setTotal(result.total);
      setLoading(false);
    }

    loadCalls();
  }, [filter, page]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Call Log</h1>
          <p className="text-sm text-ringo-muted mt-1">
            {total > 0 ? `${total} total calls` : 'No calls yet'}
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap">
          {outcomeFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => { setFilter(f.value); setPage(0); }}
              className={cn(
                'px-2 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap',
                filter === f.value
                  ? 'bg-ringo-teal text-white'
                  : 'bg-ringo-card border border-ringo-border text-ringo-muted hover:text-foreground'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-ringo-border bg-ringo-card p-12 text-center">
          <div className="h-8 w-8 mx-auto border-2 border-ringo-teal/30 border-t-ringo-teal rounded-full animate-spin mb-3" />
          <p className="text-sm text-ringo-muted">Loading calls...</p>
        </div>
      ) : (
        <CallLogTable calls={calls} onSelectCall={setSelectedCall} />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="px-3 py-2 rounded-lg text-xs font-semibold bg-ringo-card border border-ringo-border text-ringo-muted disabled:opacity-30 min-h-[44px] min-w-[44px]"
          >
            Previous
          </button>
          <span className="text-xs text-ringo-muted">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-2 rounded-lg text-xs font-semibold bg-ringo-card border border-ringo-border text-ringo-muted disabled:opacity-30 min-h-[44px] min-w-[44px]"
          >
            Next
          </button>
        </div>
      )}

      {selectedCall && (
        <TranscriptViewer call={selectedCall} onClose={() => setSelectedCall(null)} />
      )}
    </div>
  );
}

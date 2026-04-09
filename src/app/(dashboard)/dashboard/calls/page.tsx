'use client';

import { useState } from 'react';
import { CallLogTable } from '@/components/dashboard/call-log-table';
import { TranscriptViewer } from '@/components/dashboard/transcript-viewer';
import { mockCalls } from '@/lib/mock-data';
import type { Call } from '@/types/database';

export default function CallsPage() {
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Call Log</h1>
        <p className="text-sm text-ringo-muted mt-1">
          Complete history of all calls handled by Ringo
        </p>
      </div>

      <CallLogTable calls={mockCalls} onSelectCall={setSelectedCall} />

      {selectedCall && (
        <TranscriptViewer call={selectedCall} onClose={() => setSelectedCall(null)} />
      )}
    </div>
  );
}

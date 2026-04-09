'use client';

import { cn } from '@/lib/utils';

interface HeatmapData {
  [day: string]: { [hour: number]: number };
}

interface PeakHoursHeatmapProps {
  data: HeatmapData;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 9); // 9am to 10pm

function getIntensity(count: number, max: number): string {
  if (count === 0) return 'bg-ringo-border/30';
  const ratio = count / max;
  if (ratio < 0.25) return 'bg-ringo-teal/20';
  if (ratio < 0.5) return 'bg-ringo-teal/40';
  if (ratio < 0.75) return 'bg-ringo-teal/60';
  return 'bg-ringo-teal/90';
}

export function PeakHoursHeatmap({ data }: PeakHoursHeatmapProps) {
  const maxCount = Math.max(
    1,
    ...Object.values(data).flatMap((day) => Object.values(day))
  );

  return (
    <div className="rounded-xl border border-ringo-border bg-ringo-card p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">Peak Hours</h3>
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Hour labels */}
          <div className="flex gap-1 mb-1 ml-10">
            {HOURS.map((h) => (
              <div key={h} className="flex-1 text-center text-xs text-ringo-muted">
                {h > 12 ? `${h - 12}p` : h === 12 ? '12p' : `${h}a`}
              </div>
            ))}
          </div>

          {/* Grid */}
          {DAYS.map((day) => (
            <div key={day} className="flex gap-1 mb-1 items-center">
              <span className="w-10 text-xs text-ringo-muted text-right pr-2">{day}</span>
              {HOURS.map((hour) => {
                const count = data[day]?.[hour] || 0;
                return (
                  <div
                    key={hour}
                    title={`${day} ${hour}:00 — ${count} calls`}
                    className={cn(
                      'flex-1 h-6 rounded-sm transition-colors',
                      getIntensity(count, maxCount)
                    )}
                  />
                );
              })}
            </div>
          ))}

          {/* Legend */}
          <div className="flex items-center justify-end gap-2 mt-3">
            <span className="text-xs text-ringo-muted">Less</span>
            <div className="flex gap-0.5">
              <div className="w-3 h-3 rounded-sm bg-ringo-border/30" />
              <div className="w-3 h-3 rounded-sm bg-ringo-teal/20" />
              <div className="w-3 h-3 rounded-sm bg-ringo-teal/40" />
              <div className="w-3 h-3 rounded-sm bg-ringo-teal/60" />
              <div className="w-3 h-3 rounded-sm bg-ringo-teal/90" />
            </div>
            <span className="text-xs text-ringo-muted">More</span>
          </div>
        </div>
      </div>
    </div>
  );
}

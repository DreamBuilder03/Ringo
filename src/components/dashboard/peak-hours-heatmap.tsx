'use client';

import { cn } from '@/lib/utils';
import { Clock, Flame } from 'lucide-react';
import { useState } from 'react';

interface HeatmapData {
  [day: string]: { [hour: number]: number };
}

interface PeakHoursHeatmapProps {
  data: HeatmapData;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 9); // 9am to 10pm

function getIntensityClass(count: number, max: number): string {
  if (count === 0) return 'bg-smoke/40 hover:bg-smoke/60';
  const ratio = count / max;
  if (ratio < 0.2) return 'bg-stone/25 hover:bg-stone/35';
  if (ratio < 0.4) return 'bg-stone/40 hover:bg-stone/50';
  if (ratio < 0.6) return 'bg-chalk/55 hover:bg-chalk/65';
  if (ratio < 0.8) return 'bg-bone/70 hover:bg-bone/80';
  return 'bg-bone hover:opacity-90';
}

export function PeakHoursHeatmap({ data }: PeakHoursHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{ day: string; hour: number; count: number } | null>(null);

  const maxCount = Math.max(
    1,
    ...Object.values(data).flatMap((day) => Object.values(day))
  );

  // Find peak hour
  let peakDay = '';
  let peakHour = 0;
  let peakCount = 0;
  Object.entries(data).forEach(([day, hours]) => {
    Object.entries(hours).forEach(([hour, count]) => {
      if (count > peakCount) {
        peakDay = day;
        peakHour = Number(hour);
        peakCount = count;
      }
    });
  });

  const formatHour = (h: number) => {
    if (h === 12) return '12p';
    return h > 12 ? `${h - 12}p` : `${h}a`;
  };

  return (
    <div className="rounded-2xl border border-smoke bg-coal/80 backdrop-blur-sm overflow-hidden ring-1 ring-bone/[0.03] shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-smoke/60">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-bone/10 p-2.5">
            <Clock className="h-5 w-5 text-bone" />
          </div>
          <div>
            <h3 className="text-base font-bold text-bone">Peak Hours</h3>
            <p className="text-[11px] text-stone">When your phone rings most</p>
          </div>
        </div>

        {/* Peak indicator */}
        <div className="flex items-center gap-2 rounded-full bg-chalk/15 border border-chalk/25 px-3 py-1.5">
          <Flame className="h-3.5 w-3.5 text-chalk" />
          <span className="text-xs font-semibold text-chalk">
            Peak: {peakDay} {formatHour(peakHour)} ({peakCount} calls)
          </span>
        </div>
      </div>

      <div className="p-6">
        {/* Tooltip */}
        {hoveredCell && (
          <div className="mb-3 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-graphite border border-smoke px-3 py-1.5 text-xs font-medium text-bone">
              {hoveredCell.day} at {formatHour(hoveredCell.hour)} — <span className="text-bone font-bold">{hoveredCell.count} calls</span>
            </span>
          </div>
        )}

        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Hour labels */}
            <div className="flex gap-1 mb-2 ml-12">
              {HOURS.map((h) => (
                <div key={h} className="flex-1 text-center text-[10px] font-semibold text-stone/70">
                  {formatHour(h)}
                </div>
              ))}
            </div>

            {/* Grid */}
            {DAYS.map((day) => (
              <div key={day} className="flex gap-1 mb-1 items-center">
                <span className="w-12 text-xs font-semibold text-stone text-right pr-3">{day}</span>
                {HOURS.map((hour) => {
                  const count = data[day]?.[hour] || 0;
                  return (
                    <div
                      key={hour}
                      onMouseEnter={() => setHoveredCell({ day, hour, count })}
                      onMouseLeave={() => setHoveredCell(null)}
                      className={cn(
                        'flex-1 h-7 rounded-md transition-[opacity,transform,background-color,box-shadow] duration-200 cursor-pointer',
                        getIntensityClass(count, maxCount),
                        count === peakCount && 'ring-1 ring-chalk/60'
                      )}
                    />
                  );
                })}
              </div>
            ))}

            {/* Legend */}
            <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-smoke/40">
              <span className="text-[10px] font-semibold text-stone">Less</span>
              <div className="flex gap-1">
                <div className="w-4 h-4 rounded-md bg-smoke/40" />
                <div className="w-4 h-4 rounded-md bg-stone/25" />
                <div className="w-4 h-4 rounded-md bg-stone/40" />
                <div className="w-4 h-4 rounded-md bg-chalk/55" />
                <div className="w-4 h-4 rounded-md bg-bone/70" />
                <div className="w-4 h-4 rounded-md bg-bone" />
              </div>
              <span className="text-[10px] font-semibold text-stone">More</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; positive: boolean };
  accentColor?: 'teal' | 'amber' | 'purple' | 'emerald';
  sparklineData?: number[];
  className?: string;
}

const accentColors = {
  teal: {
    bg: 'bg-[#C9A84C]/10',
    text: 'text-[#C9A84C]',
    gradient: 'from-[#C9A84C]/20 to-transparent',
    glow: 'shadow-[#C9A84C]/10',
    border: 'hover:border-[#C9A84C]/30',
    ring: 'ring-[#C9A84C]/5',
    spark: '#C9A84C',
  },
  amber: {
    bg: 'bg-ringo-amber/10',
    text: 'text-ringo-amber',
    gradient: 'from-ringo-amber/20 to-transparent',
    glow: 'shadow-ringo-amber/10',
    border: 'hover:border-ringo-amber/30',
    ring: 'ring-ringo-amber/5',
    spark: '#0C1A7D',
  },
  purple: {
    bg: 'bg-ringo-purple-light/10',
    text: 'text-ringo-purple-light',
    gradient: 'from-ringo-purple-light/20 to-transparent',
    glow: 'shadow-ringo-purple-light/10',
    border: 'hover:border-ringo-purple-light/30',
    ring: 'ring-ringo-purple-light/5',
    spark: '#1E34B8',
  },
  emerald: {
    bg: 'bg-[#C9A84C]/10',
    text: 'text-[#C9A84C]',
    gradient: 'from-[#C9A84C]/20 to-transparent',
    glow: 'shadow-[#C9A84C]/10',
    border: 'hover:border-[#C9A84C]/30',
    ring: 'ring-[#C9A84C]/5',
    spark: '#C9A84C',
  },
};

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const height = 32;
  const width = 80;
  const step = width / (data.length - 1);

  const points = data.map((val, i) => {
    const x = i * step;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg width={width} height={height} className="opacity-60">
      <defs>
        <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={areaPoints}
        fill={`url(#gradient-${color})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  accentColor = 'teal',
  sparklineData,
  className,
}: StatCardProps) {
  const colors = accentColors[accentColor];
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={cn(
        'relative group rounded-2xl border border-ringo-border bg-ringo-card/80 backdrop-blur-sm p-5 overflow-hidden',
        'transition-all duration-300',
        'hover:shadow-xl hover:shadow-black/[0.08] hover:-translate-y-0.5',
        'ring-1',
        colors.ring,
        colors.border,
        className
      )}
    >
      {/* Gradient accent - top right */}
      <div className={cn('absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl rounded-full blur-3xl opacity-20 -translate-y-10 translate-x-10 group-hover:opacity-40 transition-opacity duration-500', colors.gradient)} />

      {/* Subtle inner shine */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/60 to-transparent opacity-50 pointer-events-none rounded-2xl" />

      <div className="relative flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ringo-muted">{title}</p>
          <p className={cn(
            'text-3xl font-bold text-foreground transition-all duration-700',
            animated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          )}>
            {value}
          </p>
          <div className="flex items-center gap-2">
            {trend && (
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                  trend.positive
                    ? 'bg-emerald-400/10 text-emerald-400'
                    : 'bg-red-400/10 text-red-400'
                )}
              >
                {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
            )}
            {subtitle && <p className="text-[11px] text-ringo-muted">{subtitle}</p>}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className={cn(
            'rounded-xl p-2.5 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg',
            colors.bg,
            colors.glow
          )}>
            <Icon className={cn('h-5 w-5', colors.text)} />
          </div>
          {sparklineData && (
            <MiniSparkline data={sparklineData} color={colors.spark} />
          )}
        </div>
      </div>
    </div>
  );
}

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned[0] === '1') {
    return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
}

export function getHealthStatus(lastCallTime: string | null): 'green' | 'yellow' | 'red' {
  if (!lastCallTime) return 'red';
  const hoursSinceLastCall =
    (Date.now() - new Date(lastCallTime).getTime()) / (1000 * 60 * 60);
  if (hoursSinceLastCall < 2) return 'green';
  if (hoursSinceLastCall < 8) return 'yellow';
  return 'red';
}

export function getCallOutcomeLabel(outcome: string): string {
  const labels: Record<string, string> = {
    order_placed: 'Order Placed',
    inquiry: 'Inquiry',
    missed: 'Missed',
    upsell_only: 'Upsell Only',
  };
  return labels[outcome] || outcome;
}

export function getCallOutcomeColor(outcome: string): string {
  const colors: Record<string, string> = {
    order_placed: 'text-emerald-400 bg-emerald-400/10',
    inquiry: 'text-blue-400 bg-blue-400/10',
    missed: 'text-red-400 bg-red-400/10',
    upsell_only: 'text-amber-400 bg-amber-400/10',
  };
  return colors[outcome] || 'text-gray-400 bg-gray-400/10';
}

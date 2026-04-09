import { TrendingUp, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface RoiSummaryProps {
  monthlyOrderRevenue: number;
  monthlyUpsellRevenue: number;
  totalCalls: number;
}

export function RoiSummary({ monthlyOrderRevenue, monthlyUpsellRevenue, totalCalls }: RoiSummaryProps) {
  const totalRevenue = monthlyOrderRevenue + monthlyUpsellRevenue;

  return (
    <div className="rounded-xl border border-ringo-teal/30 bg-gradient-to-br from-ringo-teal/5 to-ringo-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="rounded-lg bg-ringo-teal/10 p-2">
          <TrendingUp className="h-5 w-5 text-ringo-teal" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Monthly ROI Summary</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <p className="text-sm text-ringo-muted mb-1">Orders Captured</p>
          <p className="text-2xl font-semibold text-foreground">
            {formatCurrency(monthlyOrderRevenue)}
          </p>
        </div>
        <div>
          <p className="text-sm text-ringo-muted mb-1">Upsell Revenue</p>
          <p className="text-2xl font-semibold text-ringo-amber">
            {formatCurrency(monthlyUpsellRevenue)}
          </p>
        </div>
        <div>
          <p className="text-sm text-ringo-muted mb-1">Total Revenue</p>
          <p className="text-2xl font-semibold text-ringo-teal">
            {formatCurrency(totalRevenue)}
          </p>
        </div>
      </div>

      <p className="text-xs text-ringo-muted mt-4">
        Based on {totalCalls} calls this month
      </p>
    </div>
  );
}

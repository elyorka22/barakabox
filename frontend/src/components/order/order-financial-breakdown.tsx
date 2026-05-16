'use client';

import { formatMoneyUz } from '@/lib/format';
import { calculateOrderTotals } from '@/lib/order-totals';

type Props = {
  subtotalAmount: number;
  deliveryFee: number;
  cashbackRedeemTiyin?: number;
  className?: string;
  compact?: boolean;
};

export function OrderFinancialBreakdown({
  subtotalAmount,
  deliveryFee,
  cashbackRedeemTiyin = 0,
  className = '',
  compact = false,
}: Props) {
  const totals = calculateOrderTotals({
    subtotalAmount,
    deliveryFee,
    cashbackRedeemRequested: cashbackRedeemTiyin,
  });
  const redeem = totals.cashbackRedeemTiyin;
  const text = compact ? 'text-xs' : 'text-sm';
  const gap = compact ? 'space-y-1' : 'space-y-1.5';

  return (
    <div className={`${gap} ${text} ${className}`.trim()}>
      <div className="flex justify-between gap-3 text-slate-600">
        <span>Mahsulotlar</span>
        <span className="shrink-0 font-semibold tabular-nums text-[#121212]">
          {formatMoneyUz(totals.subtotalAmount)}
        </span>
      </div>
      <div className="flex justify-between gap-3 text-slate-600">
        <span>Yetkazib berish</span>
        <span className="shrink-0 font-semibold tabular-nums text-[#121212]">
          {totals.deliveryFee === 0 ? 'Bepul' : formatMoneyUz(totals.deliveryFee)}
        </span>
      </div>
      {redeem > 0 ? (
        <div className="flex justify-between gap-3 text-emerald-800">
          <span>Cashback ishlatildi</span>
          <span className="shrink-0 font-semibold tabular-nums">-{formatMoneyUz(redeem)}</span>
        </div>
      ) : null}
      <div className={`flex justify-between gap-3 border-t border-slate-100 pt-1.5 ${compact ? '' : 'text-[15px]'}`}>
        <span className="font-semibold text-[#121212]">Yakuniy summa</span>
        <span className="shrink-0 font-bold tabular-nums text-[#121212]">{formatMoneyUz(totals.totalAmount)}</span>
      </div>
    </div>
  );
}

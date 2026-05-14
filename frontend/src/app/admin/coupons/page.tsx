'use client';

const coupons = [
  { id: 'WELCOME10', discount: '10%', status: 'ACTIVE', usage: 28 },
  { id: 'RAMADAN15', discount: '15%', status: 'DRAFT', usage: 0 },
];

export default function AdminCouponsPage() {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:rounded-2xl md:p-4">
        <h2 className="text-base font-semibold md:text-lg">Coupons</h2>
        <p className="text-xs text-slate-500 md:text-sm">Promo-kod boshqaruvi (UI tayyor, backend endpoint keyingi bosqichda).</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:rounded-2xl md:p-4">
        <div className="space-y-2 md:space-y-3">
          {coupons.map((coupon) => (
            <div key={coupon.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 p-2.5 md:rounded-xl md:p-3">
              <div>
                <p className="font-semibold">{coupon.id}</p>
                <p className="text-xs text-slate-500">Discount: {coupon.discount}</p>
              </div>
              <div className="text-right">
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium">{coupon.status}</span>
                <p className="mt-1 text-xs text-slate-500">Usage: {coupon.usage}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

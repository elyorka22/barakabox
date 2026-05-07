'use client';

const coupons = [
  { id: 'WELCOME10', discount: '10%', status: 'ACTIVE', usage: 28 },
  { id: 'RAMADAN15', discount: '15%', status: 'DRAFT', usage: 0 },
];

export default function AdminCouponsPage() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Coupons</h2>
        <p className="text-sm text-slate-500">Promo-kod boshqaruvi (UI tayyor, backend endpoint keyingi bosqichda).</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="space-y-3">
          {coupons.map((coupon) => (
            <div key={coupon.id} className="flex items-center justify-between rounded-xl border border-slate-100 p-3">
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

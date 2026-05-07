'use client';

const notifications = [
  { id: '1', title: 'Upload error spike', time: '5 daqiqa oldin', severity: 'HIGH' },
  { id: '2', title: '3 ta yangi buyurtma', time: '12 daqiqa oldin', severity: 'INFO' },
  { id: '3', title: 'Storage 80% ga yetdi', time: '1 soat oldin', severity: 'MEDIUM' },
];

export default function AdminNotificationsPage() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Notifications</h2>
        <p className="text-sm text-slate-500">Tizim va biznes trigger xabarnomalari.</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="space-y-3">
          {notifications.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-100 p-3">
              <div className="flex items-center justify-between">
                <p className="font-medium">{item.title}</p>
                <span className="text-xs text-slate-500">{item.time}</span>
              </div>
              <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs">{item.severity}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

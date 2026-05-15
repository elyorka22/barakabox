'use client';

export function CourierSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="grid grid-cols-2 gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-[#E5E7EB]" />
        ))}
      </div>
      <div className="h-20 rounded-2xl bg-[#E5E7EB]" />
      <div className="h-48 rounded-2xl bg-[#E5E7EB]" />
      <div className="h-48 rounded-2xl bg-[#E5E7EB]" />
    </div>
  );
}

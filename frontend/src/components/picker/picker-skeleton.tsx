'use client';

export function PickerSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="grid grid-cols-2 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 rounded-2xl bg-[#ECECEC]" />
        ))}
      </div>
      <div className="h-14 rounded-2xl bg-[#ECECEC]" />
      <div className="h-48 rounded-2xl bg-[#ECECEC]" />
    </div>
  );
}

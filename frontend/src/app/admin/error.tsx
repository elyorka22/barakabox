'use client';

export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
      <h2 className="text-lg font-semibold">Admin bo'limida xatolik yuz berdi</h2>
      <p className="mt-1 text-sm">Sahifani qayta yuklab ko'ring yoki keyinroq urinib ko'ring.</p>
      <button className="mt-4 rounded-xl bg-rose-600 px-3 py-2 text-sm font-medium text-white" onClick={reset}>
        Qayta urinish
      </button>
    </div>
  );
}

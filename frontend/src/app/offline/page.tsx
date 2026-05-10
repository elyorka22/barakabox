import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Oflayn",
  robots: { index: false, follow: false },
};

function OfflineIcon() {
  return (
    <svg
      className="h-8 w-8"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 20h.01" />
      <path d="M8.5 16.5a5 5 0 0 1 7 0" />
      <path d="M5 12.55a8 8 0 0 1 14.9 0" />
      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
      <path d="m2 2 20 20" />
    </svg>
  );
}

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-[#F0FDF4] to-[#F8F8F8] px-6 pb-24 pt-[max(2rem,env(safe-area-inset-top))] text-center">
      <div className="max-w-sm rounded-[28px] border border-white/60 bg-white/80 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
          <OfflineIcon />
        </div>
        <h1 className="mt-5 text-xl font-bold text-[#0f172a]">Internet aloqasi yo‘q</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Ayrim sahifalar saqlangan bo‘lishi mumkin. Tarmoqni tekshiring yoki keyinroq qayta urinib
          ko‘ring.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-[#16C25B] text-sm font-semibold text-white shadow-[0_8px_24px_rgba(22,194,91,0.3)]"
        >
          Bosh sahifaga qaytish
        </Link>
      </div>
    </main>
  );
}

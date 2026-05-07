'use client';

import { useEffect, useState } from 'react';
import { api, authStorage } from '@/lib/api';

export default function AdminSettingsPage() {
  const token = authStorage.getAccessToken();
  const [health, setHealth] = useState<{ ok: boolean; message: string } | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      try {
        await api.get('/upload/storage', token);
        setHealth({ ok: true, message: 'Server health good' });
      } catch {
        setHealth({ ok: false, message: 'Server bilan aloqa muammosi' });
      }
    };
    void load();
  }, [token]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Settings</h2>
        <p className="text-sm text-slate-500">JWT/auth holati, tizim konfiguratsiyasi va health indikatorlari.</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold">System configuration</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-slate-100 p-3 text-sm">
            <p className="font-medium">JWT/Auth</p>
            <p className="text-xs text-slate-500">Refresh flow: active</p>
            <p className="text-xs text-slate-500">Role guard: enabled</p>
          </div>
          <div className="rounded-xl border border-slate-100 p-3 text-sm">
            <p className="font-medium">Environment status</p>
            <p className={`text-xs ${health?.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{health?.message ?? 'Tekshirilmoqda...'}</p>
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold">Theme toggle</h3>
        <div className="mt-2 inline-flex rounded-xl border border-slate-200 p-1">
          <button className={`rounded-lg px-3 py-1 text-sm ${theme === 'light' ? 'bg-slate-900 text-white' : ''}`} onClick={() => setTheme('light')}>
            Light
          </button>
          <button className={`rounded-lg px-3 py-1 text-sm ${theme === 'dark' ? 'bg-slate-900 text-white' : ''}`} onClick={() => setTheme('dark')}>
            Dark
          </button>
        </div>
      </div>
    </div>
  );
}

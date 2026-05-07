'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, authStorage } from '@/lib/api';

type FailedJob = {
  id: string;
  operation: string;
  status: 'PENDING' | 'RETRYING' | 'RESOLVED' | 'FAILED';
  retryCount: number;
  error: string;
  createdAt: string;
};

function severityClass(status: FailedJob['status']) {
  if (status === 'PENDING') return 'bg-slate-100 text-slate-700';
  if (status === 'RETRYING') return 'bg-amber-100 text-amber-700';
  if (status === 'RESOLVED') return 'bg-emerald-100 text-emerald-700';
  return 'bg-rose-100 text-rose-700';
}

export default function AdminLogsPage() {
  const token = authStorage.getAccessToken();
  const [jobs, setJobs] = useState<FailedJob[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get<FailedJob[]>('/upload/failed-jobs', token);
      setJobs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Loglarni yuklab bo'lmadi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    void load();
  }, [token]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((job) => q.length === 0 || job.operation.toLowerCase().includes(q) || job.error.toLowerCase().includes(q));
  }, [jobs, query]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Logs & Errors</h2>
        <p className="text-sm text-slate-500">API errors, auth issues, failed uploads va request log monitoring.</p>
        <div className="mt-3 flex gap-2">
          <input className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Log qidirish..." value={query} onChange={(e) => setQuery(e.target.value)} />
          <button className="rounded-xl border border-slate-200 px-3 py-2 text-sm" onClick={() => void load()}>
            Yangilash
          </button>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {loading ? <div className="bb-skeleton h-60 w-full" /> : null}
        {!loading && visible.length === 0 ? <p className="text-sm text-slate-500">Log topilmadi (empty state).</p> : null}
        <div className="space-y-3">
          {visible.map((job) => (
            <div key={job.id} className="rounded-xl border border-slate-100 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{job.operation}</p>
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${severityClass(job.status)}`}>{job.status}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">retryCount: {job.retryCount}</p>
              <p className="mt-1 text-xs text-slate-600">{job.error}</p>
              <p className="mt-1 text-xs text-slate-500">{new Date(job.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>
      {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}

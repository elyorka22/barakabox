'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, authStorage } from '@/lib/api';

type FailedJobStatus = 'PENDING' | 'RETRYING' | 'RESOLVED' | 'FAILED';

type FailedJob = {
  id: string;
  operation: string;
  status: FailedJobStatus;
  retryCount: number;
  error: string;
  payload: unknown;
  createdAt: string;
};

function statusClass(status: FailedJobStatus) {
  if (status === 'PENDING') return 'bg-gray-100 text-gray-700';
  if (status === 'RETRYING') return 'bg-yellow-100 text-yellow-700';
  if (status === 'RESOLVED') return 'bg-green-100 text-green-700';
  return 'bg-red-100 text-red-700';
}

export default function AdminUploadsPage() {
  const [jobs, setJobs] = useState<FailedJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [payloadModal, setPayloadModal] = useState<FailedJob | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const token = authStorage.getAccessToken();

  useEffect(() => {
    if (!token) return;
    void loadJobs();
  }, [token]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const data = await api.get<FailedJob[]>('/upload/failed-jobs', token);
      setJobs(data);
    } catch (err) {
      setToast({
        type: 'error',
        message: err instanceof Error ? err.message : "Failed jobsni yuklab bo'lmadi",
      });
    } finally {
      setLoading(false);
    }
  };

  const retryJob = async (jobId: string) => {
    setLoading(true);
    try {
      await api.post(`/upload/failed-jobs/${jobId}/retry`, {}, token);
      await loadJobs();
      setToast({ type: 'success', message: 'Retry muvaffaqiyatli bajarildi' });
    } catch (err) {
      setToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Retry bajarilmadi',
      });
      setLoading(false);
    }
  };

  const deleteJob = async (jobId: string) => {
    setLoading(true);
    try {
      await api.delete(`/upload/failed-jobs/${jobId}`, {}, token);
      await loadJobs();
      setToast({ type: 'success', message: "Job o'chirildi" });
    } catch (err) {
      setToast({
        type: 'error',
        message: err instanceof Error ? err.message : "Jobni o'chirib bo'lmadi",
      });
      setLoading(false);
    }
  };

  return (
    <main className="bb-page">
      <section className="bb-shell space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Upload Failed Jobs</h1>
          <Link href="/admin" className="bb-btn-outline">Orqaga</Link>
        </div>
        <button className="bb-btn-secondary" onClick={() => void loadJobs()} disabled={loading}>
          {loading ? 'Yuklanmoqda...' : 'Yangilash'}
        </button>
        <div className="space-y-2">
          {jobs.length === 0 ? <p className="text-sm text-gray-500">Failed jobs topilmadi.</p> : null}
          {jobs.map((job) => (
            <div key={job.id} className="rounded-xl border border-gray-200 bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{job.operation}</p>
                  <p className="text-xs text-gray-500">{new Date(job.createdAt).toLocaleString()}</p>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(job.status)}`}>{job.status}</span>
              </div>
              <p className="mt-2 text-xs text-gray-600">retryCount: {job.retryCount}</p>
              <p className="mt-1 text-xs text-gray-600">error: {job.error.slice(0, 120)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className="bb-btn-primary"
                  onClick={() => void retryJob(job.id)}
                  disabled={loading || job.retryCount >= 3}
                >
                  Retry
                </button>
                <button className="bb-btn-outline" onClick={() => setPayloadModal(job)} disabled={loading}>
                  Payload
                </button>
                <button className="bb-btn-outline" onClick={() => void deleteJob(job.id)} disabled={loading}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {payloadModal ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 p-3 sm:items-center sm:justify-center">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-semibold">Payload</p>
              <button className="bb-btn-outline" onClick={() => setPayloadModal(null)}>Yopish</button>
            </div>
            <pre className="max-h-[60vh] overflow-auto rounded-xl bg-gray-100 p-3 text-xs">
              {JSON.stringify(payloadModal.payload, null, 2)}
            </pre>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className={`fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-xl px-4 py-2 text-sm text-white ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {toast.message}
        </div>
      ) : null}
    </main>
  );
}

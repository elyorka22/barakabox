'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, Upload } from 'lucide-react';
import { authStorage } from '@/lib/api';
import { normalizeAssetUrl } from '@/lib/asset-url';
import { getApiBaseUrl } from '@/lib/seo';

type StorageFolder = 'products' | 'categories' | 'banners' | 'users';

type Props = {
  valueUrl: string;
  valueKey: string;
  onChange: (next: { url: string; key: string }) => void;
  onUploadingChange?: (uploading: boolean) => void;
  inputId?: string;
  label?: string;
  /** Spaces folder prefix (single bucket). Default: products (temp uploads). */
  storageFolder?: StorageFolder;
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function ImageUploader({
  valueUrl,
  valueKey,
  onChange,
  onUploadingChange,
  inputId = 'product-image-upload',
  label = 'Mahsulot rasmi',
  storageFolder = 'products',
}: Props) {
  const [previewUrl, setPreviewUrl] = useState(valueUrl);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressTimerRef = useRef<number | null>(null);

  const apiBase = useMemo(() => getApiBaseUrl(), []);

  useEffect(() => {
    setPreviewUrl(valueUrl);
  }, [valueUrl]);

  const onUploadingChangeRef = useRef(onUploadingChange);
  onUploadingChangeRef.current = onUploadingChange;

  useEffect(() => {
    onUploadingChangeRef.current?.(uploading);
  }, [uploading]);

  const clearProgressTimer = () => {
    if (progressTimerRef.current !== null) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  };

  const upload = async (file: File) => {
    setError('');
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Faqat jpg/jpeg/png/webp yuklash mumkin");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('Rasm hajmi 5MB dan oshmasligi kerak');
      return;
    }

    setPreviewUrl(URL.createObjectURL(file));
    setUploading(true);
    setProgress(10);
    clearProgressTimer();
    progressTimerRef.current = window.setInterval(() => {
      setProgress((prev) => (prev < 90 ? prev + 10 : prev));
    }, 250);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = authStorage.getAccessToken();
      const uploadUrl = `${apiBase}/upload/image?folder=${encodeURIComponent(storageFolder)}`;
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string | string[];
          details?: string;
        } | null;
        const message = Array.isArray(payload?.message) ? payload?.message.join(', ') : payload?.message;
        const details = payload?.details ? ` (${payload.details})` : '';
        throw new Error((message || "Rasmni yuklab bo'lmadi") + details);
      }
      const payload = (await response.json()) as { success: boolean; url: string; key: string };
      setProgress(100);
      onChange({ url: normalizeAssetUrl(payload.url), key: payload.key });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rasmni yuklashda xatolik");
    } finally {
      clearProgressTimer();
      setUploading(false);
    }
  };

  const remove = () => {
    setError('');
    setPreviewUrl('');
    setProgress(0);
    onChange({ url: '', key: '' });
  };

  return (
    <div className="w-full min-w-0 max-w-full space-y-2 rounded-xl border border-dashed border-slate-300 p-3">
      <label htmlFor={inputId} className="block text-xs font-medium text-slate-700">
        {label}
      </label>
      <p className="text-[11px] text-slate-500">JPG, PNG yoki WEBP. Maksimum 5MB</p>
      <div
        className="w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-3"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files?.[0];
          if (!file) return;
          void upload(file);
        }}
      >
        <label
          htmlFor={inputId}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <Upload className="h-4 w-4" />
          Rasm tanlash
        </label>
        <input
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label="Mahsulot rasmini tanlash"
          className="sr-only"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            void upload(file);
          }}
        />
        <div className="mt-3 flex justify-center">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Preview"
              loading="lazy"
              className="h-24 w-24 max-w-full rounded-lg object-cover sm:h-28 sm:w-28"
            />
          ) : (
            <div className="flex h-24 w-24 max-w-full items-center justify-center rounded-lg bg-slate-200 text-xs text-slate-500 sm:h-28 sm:w-28">
              <ImagePlus className="h-4 w-4" />
            </div>
          )}
        </div>
        {uploading ? (
          <div className="mt-3">
            <p className="text-xs text-slate-600">Yuklanmoqda... {progress}%</p>
            <div className="mt-1 h-2 w-full rounded bg-slate-200">
              <div className="h-2 rounded bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="rounded-lg border border-slate-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:opacity-50"
          onClick={remove}
          disabled={uploading}
        >
          Olib tashlash
        </button>
        {valueKey ? <p className="min-w-0 max-w-full truncate text-[11px] text-slate-500">Fayl: {valueKey.split('/').pop()}</p> : null}
      </div>
      {error ? <p className="text-xs text-rose-600" role="alert">{error}</p> : null}
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { authStorage } from '@/lib/api';
import { normalizeAssetUrl } from '@/lib/asset-url';
import { getApiBaseUrl } from '@/lib/seo';
import { SafeImage } from '@/components/safe-image';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

type Props = {
  kind: 'logo' | 'banner';
  label: string;
  currentUrl: string | null;
  onUploaded: (url: string) => void;
};

export function BusinessStoreImageUpload({ kind, label, currentUrl, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(currentUrl ?? '');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setPreview(currentUrl ?? '');
  }, [currentUrl]);

  const upload = async (file: File) => {
    setError('');
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Faqat jpg, png yoki webp');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('Rasm 5MB dan kichik bo‘lishi kerak');
      return;
    }

    setPreview(URL.createObjectURL(file));
    setUploading(true);
    const token = authStorage.getAccessToken();
    const form = new FormData();
    form.append('file', file);

    try {
      const response = await fetch(
        `${getApiBaseUrl()}/businesses/panel/store/image?kind=${kind}`,
        {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: form,
        },
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? 'Yuklashda xatolik');
      }
      const res = (await response.json()) as {
        store: { logoUrl?: string; bannerUrl?: string };
      };
      const url =
        kind === 'logo'
          ? normalizeAssetUrl(res.store.logoUrl ?? '')
          : normalizeAssetUrl(res.store.bannerUrl ?? '');
      setPreview(url);
      onUploaded(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yuklashda xatolik');
      setPreview(currentUrl ?? '');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2 rounded-xl border border-dashed border-slate-300 p-3">
      <p className="text-xs font-medium text-slate-700">{label}</p>
      <div
        className={`relative overflow-hidden rounded-lg bg-slate-100 ${
          kind === 'banner' ? 'aspect-[2/1]' : 'mx-auto aspect-square max-w-[120px]'
        }`}
      >
        {preview ? (
          <SafeImage src={preview} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full min-h-[80px] items-center justify-center text-slate-400">
            <ImagePlus className="h-8 w-8" />
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="w-full rounded-lg border border-slate-200 py-2 text-xs font-medium disabled:opacity-50"
      >
        {uploading ? 'Yuklanmoqda...' : preview ? 'Almashtirish' : 'Yuklash'}
      </button>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}

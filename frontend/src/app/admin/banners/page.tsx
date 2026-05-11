'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { api, authStorage } from '@/lib/api';
import { showToast } from '@/lib/toast';
import { ImageUploader } from '@/components/admin/image-uploader';

type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  buttonText: string | null;
  buttonLink: string | null;
  backgroundColor: string | null;
  textColor: string | null;
  overlayOpacity: number;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
};

type BannerListResponse = {
  items: Banner[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type BannerForm = {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  buttonText: string;
  buttonLink: string;
  backgroundColor: string;
  textColor: string;
  overlayOpacity: string;
  isActive: boolean;
};

const EMPTY_FORM: BannerForm = {
  id: '',
  title: '',
  subtitle: '',
  imageUrl: '',
  buttonText: '',
  buttonLink: '',
  backgroundColor: '#16C25B',
  textColor: '#FFFFFF',
  overlayOpacity: '0',
  isActive: true,
};

function clampOverlay(value: string) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(100, Math.round(num)));
}

function normalizeHex(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed) ? trimmed : undefined;
}

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState<BannerForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const token = authStorage.getAccessToken();

  useEffect(() => {
    let cancelled = false;
    const fetchBanners = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await api.get<BannerListResponse>(
          `/admin/banners?limit=100&search=${encodeURIComponent(search)}`,
          token,
        );
        if (cancelled) return;
        setBanners(data.items);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Bannerlarni yuklab bo'lmadi");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetchBanners();
    return () => {
      cancelled = true;
    };
  }, [search, token, reloadKey]);

  const reload = () => setReloadKey((value) => value + 1);

  const openCreate = () => {
    setForm({ ...EMPTY_FORM });
    setEditorOpen(true);
  };

  const openEdit = (banner: Banner) => {
    setForm({
      id: banner.id,
      title: banner.title,
      subtitle: banner.subtitle ?? '',
      imageUrl: banner.imageUrl ?? '',
      buttonText: banner.buttonText ?? '',
      buttonLink: banner.buttonLink ?? '',
      backgroundColor: banner.backgroundColor ?? '#16C25B',
      textColor: banner.textColor ?? '#FFFFFF',
      overlayOpacity: String(banner.overlayOpacity ?? 0),
      isActive: banner.isActive,
    });
    setEditorOpen(true);
  };

  const closeEditor = () => {
    if (saving) return;
    setEditorOpen(false);
    setForm(EMPTY_FORM);
  };

  const save = async () => {
    if (!form.title.trim()) {
      showToast({ type: 'error', message: 'Banner sarlavhasini kiriting' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || undefined,
        imageUrl: form.imageUrl.trim() || undefined,
        buttonText: form.buttonText.trim() || undefined,
        buttonLink: form.buttonLink.trim() || undefined,
        backgroundColor: normalizeHex(form.backgroundColor),
        textColor: normalizeHex(form.textColor),
        overlayOpacity: clampOverlay(form.overlayOpacity),
        isActive: form.isActive,
      };
      if (form.id) {
        await api.patch(`/admin/banners/${form.id}`, payload, token);
        showToast({ type: 'success', message: 'Banner yangilandi' });
      } else {
        await api.post('/admin/banners', payload, token);
        showToast({ type: 'success', message: 'Banner yaratildi' });
      }
      closeEditor();
      reload();
    } catch (err) {
      showToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Saqlashda xatolik',
      });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (banner: Banner) => {
    if (!window.confirm(`"${banner.title}" bannerni o'chirishni tasdiqlaysizmi?`)) return;
    try {
      await api.delete(`/admin/banners/${banner.id}`, {}, token);
      showToast({ type: 'success', message: "Banner o'chirildi" });
      setBanners((prev) => prev.filter((b) => b.id !== banner.id));
    } catch (err) {
      showToast({
        type: 'error',
        message: err instanceof Error ? err.message : "O'chirishda xatolik",
      });
    }
  };

  const toggleStatus = async (banner: Banner) => {
    const previous = banners;
    setBanners((prev) =>
      prev.map((item) => (item.id === banner.id ? { ...item, isActive: !item.isActive } : item)),
    );
    try {
      await api.patch(`/admin/banners/${banner.id}/status`, { isActive: !banner.isActive }, token);
      showToast({
        type: 'success',
        message: !banner.isActive ? 'Banner faollashtirildi' : 'Banner yashirildi',
      });
    } catch (err) {
      setBanners(previous);
      showToast({
        type: 'error',
        message: err instanceof Error ? err.message : "Holatni o'zgartirib bo'lmadi",
      });
    }
  };

  const moveBanner = async (banner: Banner, direction: -1 | 1) => {
    const ordered = [...banners].sort((a, b) => a.sortOrder - b.sortOrder);
    const index = ordered.findIndex((item) => item.id === banner.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ordered.length) return;
    const swap = ordered[target];
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    const reordered = ordered.map((item, idx) => ({ ...item, sortOrder: idx }));
    setBanners(reordered);
    setReordering(true);
    try {
      await api.patch(
        '/admin/banners/reorder',
        {
          items: reordered.map((item) => ({ id: item.id, sortOrder: item.sortOrder })),
        },
        token,
      );
    } catch (err) {
      showToast({
        type: 'error',
        message: err instanceof Error ? err.message : "Tartibni o'zgartirib bo'lmadi",
      });
      reload();
    } finally {
      setReordering(false);
      void swap;
    }
  };

  const sortedBanners = useMemo(
    () => [...banners].sort((a, b) => a.sortOrder - b.sortOrder),
    [banners],
  );

  return (
    <div className="min-w-0 max-w-full space-y-4 overflow-x-hidden">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[#111111]">Bannerlar boshqaruvi</h2>
            <p className="mt-1 text-sm text-slate-500">
              {"Bosh sahifa banneri yaratish, tahrirlash, tartiblash va faollashtirish. Barcha bannerlar bir xil o'lchamda ko'rsatiladi."}
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
            onClick={openCreate}
          >
            <Plus className="h-4 w-4" />
            Yangi banner
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <input
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          placeholder="Banner qidirish..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        {loading ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="rounded-2xl border border-slate-100 p-3">
                <div className="bb-skeleton aspect-[16/8] w-full rounded-2xl" />
                <div className="bb-skeleton mt-3 h-4 w-2/3" />
              </div>
            ))}
          </div>
        ) : null}

        {!loading && sortedBanners.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
            Bannerlar hali yo‘q. Yangi banner qo‘shing.
          </div>
        ) : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sortedBanners.map((banner, idx) => (
            <div
              key={banner.id}
              className="flex min-w-0 flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm"
            >
              <div
                className="relative aspect-[16/8] w-full overflow-hidden rounded-2xl"
                style={{ backgroundColor: banner.backgroundColor ?? '#0FA34B' }}
              >
                {banner.imageUrl ? (
                  <img
                    src={banner.imageUrl}
                    alt={banner.title}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : null}
                {banner.overlayOpacity > 0 ? (
                  <div
                    className="absolute inset-0 bg-black"
                    style={{ opacity: banner.overlayOpacity / 100 }}
                  />
                ) : null}
                <div
                  className="absolute inset-0 flex flex-col justify-end gap-1 p-3"
                  style={{ color: banner.textColor ?? '#FFFFFF' }}
                >
                  <p className="line-clamp-2 text-sm font-semibold drop-shadow">{banner.title}</p>
                  {banner.subtitle ? (
                    <p className="line-clamp-2 text-[11px] opacity-90">{banner.subtitle}</p>
                  ) : null}
                </div>
                <div className="absolute right-2 top-2 flex items-center gap-1">
                  <span className="rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-semibold text-white">
                    #{idx + 1}
                  </span>
                  {banner.isActive ? (
                    <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                      ACTIVE
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                      HIDDEN
                    </span>
                  )}
                </div>
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#111111]">{banner.title}</p>
                {banner.subtitle ? (
                  <p className="truncate text-xs text-slate-500">{banner.subtitle}</p>
                ) : null}
                <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-slate-500">
                  {banner.buttonText ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5">CTA: {banner.buttonText}</span>
                  ) : null}
                  {banner.buttonLink ? (
                    <a
                      href={banner.buttonLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> Link
                    </a>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Yuqoriga"
                    className="rounded-lg border border-slate-200 p-1 text-slate-600 disabled:opacity-40"
                    onClick={() => void moveBanner(banner, -1)}
                    disabled={reordering || idx === 0}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Pastga"
                    className="rounded-lg border border-slate-200 p-1 text-slate-600 disabled:opacity-40"
                    onClick={() => void moveBanner(banner, 1)}
                    disabled={reordering || idx === sortedBanners.length - 1}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                    onClick={() => void toggleStatus(banner)}
                  >
                    {banner.isActive ? (
                      <>
                        <EyeOff className="h-3.5 w-3.5" /> Yashirish
                      </>
                    ) : (
                      <>
                        <Eye className="h-3.5 w-3.5" /> Faollashtirish
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                    onClick={() => openEdit(banner)}
                  >
                    Tahrirlash
                  </button>
                  <button
                    type="button"
                    aria-label="O'chirish"
                    className="rounded-lg border border-rose-200 p-1 text-rose-600 hover:bg-rose-50"
                    onClick={() => void remove(banner)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>
      ) : null}

      {editorOpen ? (
        <BannerEditor
          form={form}
          saving={saving}
          onChange={setForm}
          onClose={closeEditor}
          onSubmit={() => void save()}
        />
      ) : null}
    </div>
  );
}

type BannerEditorProps = {
  form: BannerForm;
  saving: boolean;
  onChange: (next: BannerForm) => void;
  onClose: () => void;
  onSubmit: () => void;
};

function BannerEditor({ form, saving, onChange, onClose, onSubmit }: BannerEditorProps) {
  const overlayPct = clampOverlay(form.overlayOpacity);

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/40 p-2 sm:items-center sm:p-6">
      <div className="flex w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-[#111111]">
              {form.id ? 'Bannerni tahrirlash' : 'Yangi banner'}
            </p>
            <p className="text-xs text-slate-500">16:8 nisbat, bir xil o‘lcham va spacing</p>
          </div>
          <button
            type="button"
            className="rounded-lg border border-slate-200 p-1 text-slate-600"
            onClick={onClose}
            disabled={saving}
            aria-label="Yopish"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid flex-1 gap-4 overflow-y-auto p-4 lg:grid-cols-2">
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Sarlavha</label>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.title}
                onChange={(event) => onChange({ ...form, title: event.target.value })}
                placeholder="Masalan: Fresh mahsulotlar"
                maxLength={120}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Subtitle</label>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.subtitle}
                onChange={(event) => onChange({ ...form, subtitle: event.target.value })}
                placeholder="Qisqa tavsif"
                maxLength={200}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">CTA matni</label>
                <input
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={form.buttonText}
                  onChange={(event) => onChange({ ...form, buttonText: event.target.value })}
                  placeholder="Buyurtma berish"
                  maxLength={40}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">CTA havolasi</label>
                <input
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={form.buttonLink}
                  onChange={(event) => onChange({ ...form, buttonLink: event.target.value })}
                  placeholder="/products yoki https://..."
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Background rangi</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    aria-label="Background rangi"
                    className="h-9 w-12 cursor-pointer rounded border border-slate-200"
                    value={form.backgroundColor || '#16C25B'}
                    onChange={(event) => onChange({ ...form, backgroundColor: event.target.value })}
                  />
                  <input
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm uppercase"
                    value={form.backgroundColor}
                    onChange={(event) => onChange({ ...form, backgroundColor: event.target.value })}
                    placeholder="#16C25B"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Matn rangi</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    aria-label="Matn rangi"
                    className="h-9 w-12 cursor-pointer rounded border border-slate-200"
                    value={form.textColor || '#FFFFFF'}
                    onChange={(event) => onChange({ ...form, textColor: event.target.value })}
                  />
                  <input
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm uppercase"
                    value={form.textColor}
                    onChange={(event) => onChange({ ...form, textColor: event.target.value })}
                    placeholder="#FFFFFF"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Overlay opacity: {overlayPct}%
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={overlayPct}
                onChange={(event) => onChange({ ...form, overlayOpacity: event.target.value })}
                aria-label="Overlay opacity"
                className="w-full"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Rasm ustida qora qatlam. 0% — overlay yo‘q, 100% — to‘liq qora.
              </p>
            </div>

            <label className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => onChange({ ...form, isActive: event.target.checked })}
              />
              Faol (bosh sahifada ko‘rsatish)
            </label>
          </div>

          <div className="space-y-3">
            <BannerEditorImage
              imageUrl={form.imageUrl}
              onChange={(url) => onChange({ ...form, imageUrl: url })}
            />

            <div>
              <p className="text-xs font-medium text-slate-700">Live preview (16:8)</p>
              <div
                className="relative mt-2 aspect-[16/8] w-full overflow-hidden rounded-2xl"
                style={{ backgroundColor: normalizeHex(form.backgroundColor) ?? '#0FA34B' }}
              >
                {form.imageUrl ? (
                  <img
                    src={form.imageUrl}
                    alt="Banner preview"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : null}
                {overlayPct > 0 ? (
                  <div className="absolute inset-0 bg-black" style={{ opacity: overlayPct / 100 }} />
                ) : null}
                <div
                  className="absolute inset-0 flex flex-col justify-end gap-2 p-4"
                  style={{ color: normalizeHex(form.textColor) ?? '#FFFFFF' }}
                >
                  <p className="text-xl font-bold leading-tight drop-shadow-sm">
                    {form.title || 'Banner sarlavhasi'}
                  </p>
                  {form.subtitle ? (
                    <p className="text-sm opacity-90">{form.subtitle}</p>
                  ) : null}
                  {form.buttonText ? (
                    <span className="mt-1 inline-block w-fit rounded-2xl bg-white px-3 py-1 text-xs font-semibold text-[#111111]">
                      {form.buttonText}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3">
          <button
            type="button"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm"
            onClick={onClose}
            disabled={saving}
          >
            Bekor qilish
          </button>
          <button
            type="button"
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            onClick={onSubmit}
            disabled={saving}
          >
            {saving ? 'Saqlanmoqda...' : form.id ? 'Yangilash' : 'Yaratish'}
          </button>
        </div>
      </div>
    </div>
  );
}

function BannerEditorImage({ imageUrl, onChange }: { imageUrl: string; onChange: (url: string) => void }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-700">Banner rasmi</p>
      <p className="mt-0.5 text-[11px] text-slate-500">
        Tavsiya: 1600x800px, 16:8 nisbat, &lt; 500KB
      </p>
      <ImageUploader
        valueUrl={imageUrl}
        valueKey=""
        inputId="banner-image-upload"
        label="Banner rasmi yuklash"
        onChange={(next) => onChange(next.url)}
      />
    </div>
  );
}

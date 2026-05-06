'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, authStorage } from '@/lib/api';
import { formatMoneyUz } from '@/lib/format';
import { DesktopNav, MobileNav } from '@/components/app-nav';

type AdminStats = { totalOrders: number; totalRevenue: number; activeProducts: number };
type Category = { id: string; name: string; slug: string };
type Business = { id: string; displayName: string; user: { email: string } };
type OrderStatus = 'NEW' | 'PICKING' | 'READY' | 'DELIVERING' | 'DELIVERED' | 'CANCELLED';
type Product = {
  id: string;
  name: string;
  description?: string | null;
  price: string;
  stockQuantity: number;
  unitType: 'kg' | 'piece' | 'pack';
  businessId: string;
  category?: { id: string; name: string } | null;
  imageUrl?: string | null;
  imageKey?: string | null;
  imageCardUrl?: string | null;
  imageCardKey?: string | null;
  imageThumbUrl?: string | null;
  imageThumbKey?: string | null;
};
type UploadMetrics = {
  uploadsCount: number;
  uploadErrors: number;
  uploadedBytes: number;
  errorRatePercent: number;
};
type UploadSession = {
  id: string;
  productId: string;
  createdAt: string;
  expiresAt: string;
  isExpired: boolean;
};
type StorageUsage = {
  totalBytes: number;
  items: Array<{
    productId: string;
    productName: string;
    totalBytes: number;
    imagesCount: number;
  }>;
};
type Order = {
  id: string;
  status: OrderStatus;
  totalAmount: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  assignedPicker?: { id: string; fullName: string } | null;
  assignedCourier?: { id: string; fullName: string } | null;
};

const STATUS_NEXT: Record<OrderStatus, OrderStatus[]> = {
  NEW: ['PICKING', 'CANCELLED'],
  PICKING: ['READY', 'CANCELLED'],
  READY: ['DELIVERING', 'CANCELLED'],
  DELIVERING: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState('');
  const [editingId, setEditingId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('1000');
  const [stock, setStock] = useState('0');
  const [unitType, setUnitType] = useState<'kg' | 'piece' | 'pack'>('piece');
  const [categoryId, setCategoryId] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageKey, setImageKey] = useState('');
  const [imageCardUrl, setImageCardUrl] = useState('');
  const [imageCardKey, setImageCardKey] = useState('');
  const [imageThumbUrl, setImageThumbUrl] = useState('');
  const [imageThumbKey, setImageThumbKey] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [newBusinessName, setNewBusinessName] = useState('');
  const [newBusinessPhone, setNewBusinessPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [uploadMetrics, setUploadMetrics] = useState<UploadMetrics | null>(null);
  const [uploadSessions, setUploadSessions] = useState<UploadSession[]>([]);
  const [storageUsage, setStorageUsage] = useState<StorageUsage | null>(null);

  const token = authStorage.getAccessToken();

  useEffect(() => {
    if (!token) return;
    void loadInitialData();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const timer = setInterval(() => {
      void loadUploadMonitoring();
    }, 10_000);
    return () => clearInterval(timer);
  }, [token]);

  const runAction = async (action: () => Promise<void>) => {
    setLoading(true);
    setError('');
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "So'rov bajarilmadi");
    } finally {
      setLoading(false);
    }
  };

  const loadInitialData = async () => {
    await runAction(async () => {
      const [businessData, categoryData, productData, statsData, orderData] = await Promise.all([
        api.get<Business[]>('/businesses/approved', token),
        api.get<Category[]>('/categories'),
        api.get<Product[]>('/products', token),
        api.get<AdminStats>('/admin/stats', token),
        api.get<Order[]>('/orders', token),
      ]);
      setBusinesses(businessData);
      setCategories(categoryData.filter((item) => item.slug !== 'all'));
      setProducts(productData);
      setStats(statsData);
      setOrders(orderData);
      if (businessData[0]) {
        setSelectedBusinessId(businessData[0].id);
      }
      if (categoryData.find((item) => item.slug !== 'all')) {
        setCategoryId(categoryData.find((item) => item.slug !== 'all')!.id);
      }
      await loadUploadMonitoring();
    });
  };

  const loadUploadMonitoring = async () => {
    const [metricsData, sessionsData, storageData] = await Promise.all([
      api.get<UploadMetrics>('/upload/metrics', token),
      api.get<UploadSession[]>('/upload/sessions', token),
      api.get<StorageUsage>('/upload/storage', token),
    ]);
    setUploadMetrics(metricsData);
    setUploadSessions(sessionsData);
    setStorageUsage(storageData);
  };

  const loadStats = async () => {
    await runAction(async () => {
      const data = await api.get<AdminStats>('/admin/stats', token);
      setStats(data);
    });
  };

  const visibleProducts = useMemo(
    () => products.filter((product) => product.businessId === selectedBusinessId),
    [products, selectedBusinessId],
  );

  const resetForm = () => {
    setEditingId('');
    setName('');
    setDescription('');
    setPrice('1000');
    setStock('0');
    setImageUrl('');
    setImageKey('');
    setImageCardUrl('');
    setImageCardKey('');
    setImageThumbUrl('');
    setImageThumbKey('');
    setPreviewUrl('');
    setSelectedImage(null);
    setUploadError('');
  };

  const resizeToJpeg = async (file: File, maxSide: number): Promise<Blob> => {
    const src = await createImageBitmap(file);
    const ratio = Math.min(1, maxSide / Math.max(src.width, src.height));
    const width = Math.max(1, Math.round(src.width * ratio));
    const height = Math.max(1, Math.round(src.height * ratio));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error("Rasmni qayta ishlashda xatolik");
    }
    ctx.drawImage(src, 0, 0, width, height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Rasmni tayyorlab bo'lmadi"));
          return;
        }
        resolve(blob);
      }, 'image/jpeg', 0.8);
    });
  };

  const uploadPreparedImage = async (uploadUrl: string, headers: Record<string, string>, blob: Blob) => {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers,
      body: blob,
    });
    if (!response.ok) {
      throw new Error("Rasmni yuklashda xatolik");
    }
    await api.post('/upload/metrics/success', { size: blob.size }, token);
  };

  const uploadImageVariants = async (productId: string, file: File) => {
    setUploadingImage(true);
    setUploadError('');
    try {
      const magicBytes = await file.slice(0, 32).arrayBuffer();
      const mainBlob = await resizeToJpeg(file, 800);
      const cardBlob = await resizeToJpeg(file, 400);
      const thumbBlob = await resizeToJpeg(file, 160);
      const presign = await api.post<{
        sessionId: string;
        expiresIn: number;
        main: { key: string; publicUrl: string; uploadUrl: string; headers: Record<string, string> };
        card: { key: string; publicUrl: string; uploadUrl: string; headers: Record<string, string> };
        thumb: { key: string; publicUrl: string; uploadUrl: string; headers: Record<string, string> };
      }>(
        '/upload/presign',
        {
          productId,
          magicBase64: btoa(String.fromCharCode(...new Uint8Array(magicBytes))),
          mainSize: mainBlob.size,
          cardSize: cardBlob.size,
          thumbSize: thumbBlob.size,
        },
        token,
      );

      await Promise.all([
        uploadPreparedImage(presign.main.uploadUrl, presign.main.headers, mainBlob),
        uploadPreparedImage(presign.card.uploadUrl, presign.card.headers, cardBlob),
        uploadPreparedImage(presign.thumb.uploadUrl, presign.thumb.headers, thumbBlob),
      ]);

      await api.post('/upload/finalize', { sessionId: presign.sessionId }, token);

      setImageUrl(presign.main.publicUrl);
      setImageKey(presign.main.key);
      setImageCardUrl(presign.card.publicUrl);
      setImageCardKey(presign.card.key);
      setImageThumbUrl(presign.thumb.publicUrl);
      setImageThumbKey(presign.thumb.key);
      setSelectedImage(null);
      return presign;
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Rasmni yuklab bo'lmadi");
      await api.post('/upload/metrics/error', {}, token);
      throw err;
    } finally {
      setUploadingImage(false);
    }
  };

  const createOrUpdate = async () => {
    const parsedPrice = Number(price);
    const parsedStock = Number(stock);
    if (!selectedBusinessId || !name.trim() || parsedPrice <= 0 || !Number.isInteger(parsedStock) || parsedStock < 0) {
      setError("Biznes, nom, narx va qoldiqni to'g'ri kiriting");
      return;
    }
    await runAction(async () => {
      if (!editingId) {
        const created = await api.post<Product>(
          '/products',
          {
            businessId: selectedBusinessId,
            name: name.trim(),
            description: description.trim() || undefined,
            price: parsedPrice,
            stockQuantity: parsedStock,
            unitType,
            categoryId: categoryId || undefined,
          },
          token,
        );
        if (selectedImage) {
          await uploadImageVariants(created.id, selectedImage);
        }
        setMessage('Mahsulot yaratildi');
      } else {
        if (selectedImage) {
          await uploadImageVariants(editingId, selectedImage);
        }
        await api.patch(
          `/products/${editingId}`,
          {
            name: name.trim(),
            description: description.trim() || undefined,
            price: parsedPrice,
            stockQuantity: parsedStock,
            unitType,
            categoryId: categoryId || undefined,
          },
          token,
        );
        setMessage('Mahsulot yangilandi');
      }
      const productData = await api.get<Product[]>('/products', token);
      setProducts(productData);
      resetForm();
    });
  };

  const startEdit = (product: Product) => {
    setEditingId(product.id);
    setSelectedBusinessId(product.businessId);
    setName(product.name);
    setDescription(product.description ?? '');
    setPrice(String(product.price));
    setStock(String(product.stockQuantity));
    setUnitType(product.unitType);
    setCategoryId(product.category?.id ?? '');
    setImageUrl(product.imageUrl ?? '');
    setImageKey(product.imageKey ?? '');
    setImageCardUrl(product.imageCardUrl ?? '');
    setImageCardKey(product.imageCardKey ?? '');
    setImageThumbUrl(product.imageThumbUrl ?? '');
    setImageThumbKey(product.imageThumbKey ?? '');
    setPreviewUrl(product.imageUrl ?? '');
    setSelectedImage(null);
    setUploadError('');
  };

  const removeProduct = async (id: string) => {
    await runAction(async () => {
      await api.delete(`/products/${id}`, {}, token);
      const productData = await api.get<Product[]>('/products', token);
      setProducts(productData);
      setMessage("Mahsulot o'chirildi");
    });
  };

  const createInlineBusiness = async () => {
    if (!newBusinessName.trim()) {
      setError('Biznes nomini kiriting');
      return;
    }
    await runAction(async () => {
      const created = await api.post<Business>(
        '/businesses/inline',
        { name: newBusinessName.trim(), phone: newBusinessPhone.trim() || undefined },
        token,
      );
      const refreshed = await api.get<Business[]>('/businesses/approved', token);
      setBusinesses(refreshed);
      setSelectedBusinessId(created.id);
      setNewBusinessName('');
      setNewBusinessPhone('');
      setMessage('Biznes yaratildi va tanlandi');
    });
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    await runAction(async () => {
      await api.patch(`/orders/${orderId}/status`, { status }, token);
      const orderData = await api.get<Order[]>('/orders', token);
      setOrders(orderData);
      setMessage('Buyurtma statusi yangilandi');
    });
  };

  const cancelOrder = async (orderId: string) => {
    await runAction(async () => {
      await api.patch(`/orders/${orderId}/cancel`, {}, token);
      const orderData = await api.get<Order[]>('/orders', token);
      setOrders(orderData);
      setMessage('Buyurtma bekor qilindi');
    });
  };

  const closeUploadSession = async (sessionId: string) => {
    await runAction(async () => {
      await api.delete(`/upload/sessions/${sessionId}`, {}, token);
      await loadUploadMonitoring();
      setMessage('Upload sessiyasi yopildi');
    });
  };

  return (
    <main className="bb-page">
      <section className="bb-shell space-y-4">
        <DesktopNav />
        <h1 className="text-2xl font-bold">Admin panel</h1>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <button className="bb-btn-primary" onClick={loadStats} disabled={loading}>
            Statistikani yangilash
          </button>
          <button className="bb-btn-secondary" onClick={() => void loadInitialData()} disabled={loading}>
            Ma'lumotlarni yangilash
          </button>
        </div>
        {stats ? (
          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-white p-3 shadow-sm">
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Jami buyurtmalar</p>
              <p className="text-lg font-bold">{stats.totalOrders}</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Tushum</p>
              <p className="text-lg font-bold">{formatMoneyUz(stats.totalRevenue)}</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Faol mahsulotlar</p>
              <p className="text-lg font-bold">{stats.activeProducts}</p>
            </div>
          </div>
        ) : null}
        <div className="space-y-2 rounded-2xl bg-white p-3 shadow-sm">
          <h2 className="text-lg font-semibold">Mahsulotlar boshqaruvi</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <select
              className="rounded-xl border border-gray-200 p-2"
              value={selectedBusinessId}
              onChange={(e) => setSelectedBusinessId(e.target.value)}
            >
              <option value="">Biznesni tanlang</option>
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.displayName} ({business.user.email})
                </option>
              ))}
            </select>
            {!selectedBusinessId ? (
              <div className="col-span-full grid gap-2 rounded-xl border border-dashed border-gray-300 p-3 sm:grid-cols-3">
                <input
                  className="rounded-xl border border-gray-200 p-2"
                  value={newBusinessName}
                  placeholder="Yangi biznes nomi"
                  onChange={(e) => setNewBusinessName(e.target.value)}
                />
                <input
                  className="rounded-xl border border-gray-200 p-2"
                  value={newBusinessPhone}
                  placeholder="Telefon"
                  onChange={(e) => setNewBusinessPhone(e.target.value)}
                />
                <button className="bb-btn-secondary" onClick={createInlineBusiness} disabled={loading}>
                  Biznes yaratish
                </button>
              </div>
            ) : null}
            <input
              className="rounded-xl border border-gray-200 p-2"
              value={name}
              placeholder="Mahsulot nomi"
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="rounded-xl border border-gray-200 p-2"
              value={description}
              placeholder="Tavsif"
              onChange={(e) => setDescription(e.target.value)}
            />
            <input
              className="rounded-xl border border-gray-200 p-2"
              type="number"
              min="1"
              step="1"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <input
              className="rounded-xl border border-gray-200 p-2"
              type="number"
              min="0"
              step="1"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
            />
            <select
              className="rounded-xl border border-gray-200 p-2"
              value={unitType}
              onChange={(e) => setUnitType(e.target.value as 'kg' | 'piece' | 'pack')}
            >
              <option value="piece">dona</option>
              <option value="kg">kg</option>
              <option value="pack">qadoq</option>
            </select>
            <select
              className="rounded-xl border border-gray-200 p-2"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Kategoriya yo'q</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <div
              className={`col-span-full rounded-xl border p-3 ${dragActive ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                const file = e.dataTransfer.files?.[0];
                if (!file) return;
                setPreviewUrl(URL.createObjectURL(file));
                setSelectedImage(file);
                setUploadError('');
              }}
            >
              <p className="text-xs text-gray-500">Rasmni shu yerga tashlang yoki tanlang (jpg/png/webp, max 5MB)</p>
              <input
                className="mt-2"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setPreviewUrl(URL.createObjectURL(file));
                  setSelectedImage(file);
                  setUploadError('');
                }}
              />
              {uploadingImage ? <p className="mt-2 text-xs text-gray-500">Rasm yuklanmoqda...</p> : null}
              {uploadError ? <p className="mt-2 text-xs text-red-600">{uploadError}</p> : null}
              {previewUrl ? <img src={previewUrl} alt="Preview" className="mt-2 h-24 w-24 rounded-lg object-cover" /> : null}
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  className="bb-btn-outline"
                  onClick={() => {
                    setSelectedImage(null);
                    setPreviewUrl('');
                    setImageUrl('');
                    setImageKey('');
                    setImageCardUrl('');
                    setImageCardKey('');
                    setImageThumbUrl('');
                    setImageThumbKey('');
                    setUploadError('');
                  }}
                >
                  Rasmni olib tashlash
                </button>
                {uploadError && selectedImage ? (
                  <button
                    type="button"
                    className="bb-btn-outline"
                    onClick={() => {
                      const id = editingId || 'temp';
                      void runAction(async () => {
                        if (id === 'temp') return;
                        await uploadImageVariants(id, selectedImage);
                      });
                    }}
                  >
                    Qayta urinish
                  </button>
                ) : null}
              </div>
            </div>
            <button className="bb-btn-primary" onClick={createOrUpdate} disabled={loading || uploadingImage}>
              {editingId ? 'Mahsulotni yangilash' : 'Mahsulot yaratish'}
            </button>
            {editingId ? (
              <button className="bb-btn-outline" onClick={resetForm} disabled={loading}>
                Bekor qilish
              </button>
            ) : null}
          </div>
        </div>
        <div className="space-y-2 rounded-2xl bg-white p-3 shadow-sm">
          <h2 className="text-lg font-semibold">Tanlangan biznes mahsulotlari</h2>
          {visibleProducts.length === 0 ? <p className="text-sm text-gray-500">Tanlangan biznes uchun mahsulot topilmadi.</p> : null}
          {visibleProducts.map((product) => (
            <div key={product.id} className="flex items-center justify-between gap-2 rounded-xl border border-gray-100 p-3">
              <div>
                <p className="font-semibold">{product.name}</p>
                {product.imageThumbUrl || product.imageUrl ? (
                  <img
                    src={product.imageThumbUrl ?? product.imageUrl ?? ''}
                    alt={product.name}
                    className="mt-1 h-12 w-12 rounded-lg object-cover"
                  />
                ) : null}
                <p className="text-xs text-gray-500">
                  {formatMoneyUz(product.price)} · qoldiq {product.stockQuantity} {product.unitType} · {product.category?.name ?? "Kategoriya yo'q"}
                </p>
              </div>
              <div className="flex gap-2">
                <button className="bb-btn-outline" onClick={() => startEdit(product)} disabled={loading}>
                  Tahrirlash
                </button>
                <button className="bb-btn-outline" onClick={() => void removeProduct(product.id)} disabled={loading}>
                  O'chirish
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-2 rounded-2xl bg-white p-3 shadow-sm">
          <h2 className="text-lg font-semibold">Upload Monitoring</h2>
          <button className="bb-btn-secondary" onClick={() => void runAction(loadUploadMonitoring)} disabled={loading}>
            Monitoringni yangilash
          </button>
          {uploadMetrics ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-xs text-gray-500">upload_count</p>
                <p className="text-lg font-bold">{uploadMetrics.uploadsCount}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-xs text-gray-500">upload_errors</p>
                <p className="text-lg font-bold">{uploadMetrics.uploadErrors}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-xs text-gray-500">upload_bytes</p>
                <p className="text-lg font-bold">{formatBytes(uploadMetrics.uploadedBytes)}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Error rate</p>
                <p className="text-lg font-bold">{uploadMetrics.errorRatePercent}%</p>
              </div>
            </div>
          ) : null}
          {storageUsage ? (
            <div className="rounded-xl border border-gray-100 p-3">
              <p className="text-sm font-semibold">Jami storage: {formatBytes(storageUsage.totalBytes)}</p>
              <div className="mt-2 space-y-2">
                {storageUsage.items.map((item) => (
                  <div key={item.productId} className="flex items-center justify-between text-xs">
                    <span>{item.productName} ({item.imagesCount} set)</span>
                    <span>{formatBytes(item.totalBytes)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <div className="space-y-2">
            <p className="text-sm font-semibold">Upload sessions</p>
            {uploadSessions.length === 0 ? <p className="text-xs text-gray-500">Sessiyalar yo'q</p> : null}
            {uploadSessions.map((session) => (
              <div key={session.id} className="rounded-xl border border-gray-100 p-2 text-xs">
                <p>ID: {session.id.slice(0, 8)} · Product: {session.productId.slice(0, 8)}</p>
                <p>Status: {session.isExpired ? 'Expired' : 'Active'}</p>
                <p>Expires: {new Date(session.expiresAt).toLocaleString()}</p>
                <button className="bb-btn-outline mt-2" onClick={() => void closeUploadSession(session.id)}>
                  Force close
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-2 rounded-2xl bg-white p-3 shadow-sm">
          <h2 className="text-lg font-semibold">Buyurtmalar</h2>
          {orders.length === 0 ? <p className="text-sm text-gray-500">Buyurtmalar topilmadi.</p> : null}
          {orders.map((order) => (
            <div key={order.id} className="space-y-2 rounded-xl border border-gray-100 p-3">
              <p className="font-semibold">#{order.id.slice(0, 8)}</p>
              <p className="text-xs text-gray-500">Mijoz: {order.customerName} · {order.customerPhone}</p>
              <p className="text-xs text-gray-500">Manzil: {order.deliveryAddress}</p>
              <p className="text-xs text-gray-500">Yig'uvchi: {order.assignedPicker?.fullName ?? '-'}</p>
              <p className="text-xs text-gray-500">Kuryer: {order.assignedCourier?.fullName ?? '-'}</p>
              <p className="text-xs text-gray-500">Jami: {formatMoneyUz(order.totalAmount)}</p>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="rounded-xl border border-gray-200 p-2 text-sm"
                  value={order.status}
                  onChange={(e) => void updateOrderStatus(order.id, e.target.value as OrderStatus)}
                >
                  {[order.status, ...STATUS_NEXT[order.status]].map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <button className="bb-btn-outline" onClick={() => void cancelOrder(order.id)} disabled={order.status === 'CANCELLED'}>
                  Buyurtmani bekor qilish
                </button>
              </div>
            </div>
          ))}
        </div>
        {error ? <p className="text-red-600">{error}</p> : null}
        {message ? <p className="text-sm text-gray-600">{message}</p> : null}
      </section>
      <MobileNav />
    </main>
  );
}

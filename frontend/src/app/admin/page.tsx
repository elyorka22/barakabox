'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, authStorage } from '@/lib/api';
import { formatMoneyUz } from '@/lib/format';
import { DesktopNav, MobileNav } from '@/components/app-nav';

type AdminStats = { totalOrders: number; totalRevenue: number; todayOrders: number };
type Category = { id: string; name: string; slug: string };
type Business = { id: string; displayName: string; user: { email: string } };
type Product = {
  id: string;
  name: string;
  description?: string | null;
  price: string;
  stock: number;
  businessId: string;
  category?: { id: string; name: string } | null;
};

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState('');
  const [editingId, setEditingId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('1000');
  const [stock, setStock] = useState('0');
  const [categoryId, setCategoryId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const token = authStorage.getAccessToken();

  useEffect(() => {
    if (!token) return;
    void loadInitialData();
  }, [token]);

  const runAction = async (action: () => Promise<void>) => {
    setLoading(true);
    setError('');
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const loadInitialData = async () => {
    await runAction(async () => {
      const [businessData, categoryData, productData, statsData] = await Promise.all([
        api.get<Business[]>('/businesses/approved', token),
        api.get<Category[]>('/categories'),
        api.get<Product[]>('/products', token),
        api.get<AdminStats>('/admin/stats', token),
      ]);
      setBusinesses(businessData);
      setCategories(categoryData.filter((item) => item.slug !== 'all'));
      setProducts(productData);
      setStats(statsData);
      if (businessData[0]) {
        setSelectedBusinessId(businessData[0].id);
      }
      if (categoryData.find((item) => item.slug !== 'all')) {
        setCategoryId(categoryData.find((item) => item.slug !== 'all')!.id);
      }
    });
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
  };

  const createOrUpdate = async () => {
    const parsedPrice = Number(price);
    const parsedStock = Number(stock);
    if (!selectedBusinessId || !name.trim() || parsedPrice <= 0 || !Number.isInteger(parsedStock) || parsedStock < 0) {
      setError('Fill business, name, valid price and stock');
      return;
    }
    await runAction(async () => {
      if (!editingId) {
        await api.post(
          '/products',
          {
            businessId: selectedBusinessId,
            name: name.trim(),
            description: description.trim() || undefined,
            price: parsedPrice,
            stock: parsedStock,
            categoryId: categoryId || undefined,
          },
          token,
        );
        setMessage('Product created');
      } else {
        await api.patch(
          `/products/${editingId}`,
          {
            name: name.trim(),
            description: description.trim() || undefined,
            price: parsedPrice,
            stock: parsedStock,
            categoryId: categoryId || undefined,
          },
          token,
        );
        setMessage('Product updated');
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
    setStock(String(product.stock));
    setCategoryId(product.category?.id ?? '');
  };

  const removeProduct = async (id: string) => {
    await runAction(async () => {
      await api.delete(`/products/${id}`, {}, token);
      const productData = await api.get<Product[]>('/products', token);
      setProducts(productData);
      setMessage('Product removed');
    });
  };

  return (
    <main className="bb-page">
      <section className="bb-shell space-y-4">
        <DesktopNav />
        <h1 className="text-2xl font-bold">Admin panel</h1>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <button className="bb-btn-primary" onClick={loadStats} disabled={loading}>
            Refresh stats
          </button>
          <button className="bb-btn-secondary" onClick={() => void loadInitialData()} disabled={loading}>
            Reload data
          </button>
        </div>
        {stats ? (
          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-white p-3 shadow-sm">
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Total orders</p>
              <p className="text-lg font-bold">{stats.totalOrders}</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Revenue</p>
              <p className="text-lg font-bold">{formatMoneyUz(stats.totalRevenue)}</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Today orders</p>
              <p className="text-lg font-bold">{stats.todayOrders}</p>
            </div>
          </div>
        ) : null}
        <div className="space-y-2 rounded-2xl bg-white p-3 shadow-sm">
          <h2 className="text-lg font-semibold">Manage products</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <select
              className="rounded-xl border border-gray-200 p-2"
              value={selectedBusinessId}
              onChange={(e) => setSelectedBusinessId(e.target.value)}
            >
              <option value="">Select business</option>
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.displayName} ({business.user.email})
                </option>
              ))}
            </select>
            <input
              className="rounded-xl border border-gray-200 p-2"
              value={name}
              placeholder="Product name"
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="rounded-xl border border-gray-200 p-2"
              value={description}
              placeholder="Description"
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
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">No category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <button className="bb-btn-primary" onClick={createOrUpdate} disabled={loading}>
              {editingId ? 'Update product' : 'Create product'}
            </button>
            {editingId ? (
              <button className="bb-btn-outline" onClick={resetForm} disabled={loading}>
                Cancel edit
              </button>
            ) : null}
          </div>
        </div>
        <div className="space-y-2 rounded-2xl bg-white p-3 shadow-sm">
          <h2 className="text-lg font-semibold">Products by selected business</h2>
          {visibleProducts.length === 0 ? <p className="text-sm text-gray-500">No products for selected business.</p> : null}
          {visibleProducts.map((product) => (
            <div key={product.id} className="flex items-center justify-between gap-2 rounded-xl border border-gray-100 p-3">
              <div>
                <p className="font-semibold">{product.name}</p>
                <p className="text-xs text-gray-500">
                  {formatMoneyUz(product.price)} · stock {product.stock} · {product.category?.name ?? 'No category'}
                </p>
              </div>
              <div className="flex gap-2">
                <button className="bb-btn-outline" onClick={() => startEdit(product)} disabled={loading}>
                  Edit
                </button>
                <button className="bb-btn-outline" onClick={() => void removeProduct(product.id)} disabled={loading}>
                  Delete
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

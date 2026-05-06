'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, authStorage } from '@/lib/api';
import { DesktopNav, MobileNav } from '@/components/app-nav';

type Product = { id: string; name: string; price: string };
type Box = {
  id: string;
  name: string;
  price: string;
  items: Array<{ quantity: number; product: { name: string } }>;
};
type CartResponse = {
  items: Array<{
    id: string;
    quantity: number;
    product?: { id: string; name: string; price: string } | null;
    box?: { id: string; name: string; price: string } | null;
  }>;
};

export default function ClientPage() {
  const [token, setToken] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [email, setEmail] = useState('client@barakabox.local');
  const [password, setPassword] = useState('password123');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const savedToken = authStorage.getAccessToken();
    if (savedToken) {
      setToken(savedToken);
    }
  }, []);

  const withLoading = async (key: string, task: () => Promise<void>) => {
    setLoading((prev) => ({ ...prev, [key]: true }));
    setError('');
    try {
      await task();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const login = async () => {
    await withLoading('login', async () => {
      const data = await api.post<{ accessToken: string }>('/auth/login', { email, password });
      setToken(data.accessToken);
      authStorage.setAccessToken(data.accessToken);
      setMessage('Logged in');
    });
  };

  const loadProducts = async () => {
    await withLoading('products', async () => {
      const data = await api.get<Product[]>('/products');
      setProducts(data);
    });
  };

  const loadBoxes = async () => {
    await withLoading('boxes', async () => {
      const data = await api.get<Box[]>('/boxes');
      setBoxes(data);
    });
  };

  const loadCart = async () => {
    if (!token) return;
    await withLoading('cart', async () => {
      const data = await api.get<CartResponse>('/cart', token);
      setCart(data);
    });
  };

  const placeOrder = async () => {
    await withLoading('order', async () => {
      const response = await api.post<{ subtotalAmount: string; deliveryFee: string; totalAmount: string }>(
        '/orders',
        {},
        token,
      );
      setMessage(
        `Order created. Subtotal: $${response.subtotalAmount}, delivery: $${response.deliveryFee}, total: $${response.totalAmount}`,
      );
      await loadCart();
    });
  };

  const updateProductQty = async (productId: string, delta: number) => {
    if (!token) return;
    if (delta > 0) {
      await withLoading(`add-${productId}`, async () => {
        await api.post('/cart/items', { productId, quantity: 1 }, token);
        await loadCart();
      });
      return;
    }
    const existing = cart?.items.find((i) => i.product?.id === productId);
    if (!existing) return;
    if (existing.quantity <= 1) {
      await withLoading(`remove-${productId}`, async () => {
        await api.delete('/cart/items', { productId }, token);
        await loadCart();
      });
      return;
    }
    await withLoading(`decrease-${productId}`, async () => {
      await api.post('/cart/items', { productId, quantity: -1 }, token);
      await loadCart();
    });
  };

  const addBox = async (boxId: string) => {
    if (!token) return;
    await withLoading(`box-${boxId}`, async () => {
      await api.post('/cart/boxes', { boxId, quantity: 1 }, token);
      await loadCart();
    });
  };

  const removeBox = async (boxId: string) => {
    if (!token) return;
    await withLoading(`box-rm-${boxId}`, async () => {
      await api.delete('/cart/boxes', { boxId }, token);
      await loadCart();
    });
  };

  const cartTotal = useMemo(() => {
    if (!cart) return 0;
    return cart.items.reduce((sum, item) => {
      if (item.product) return sum + Number(item.product.price) * item.quantity;
      if (item.box) return sum + Number(item.box.price) * item.quantity;
      return sum;
    }, 0);
  }, [cart]);

  return (
    <main className="bb-page">
      <div className="mx-auto w-full max-w-7xl">
        <DesktopNav />
      </div>
      <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[360px_1fr]">
        <aside className="bb-card">
          <h1 className="text-xl font-bold">Client Access</h1>
          <p className="mt-1 text-sm text-[#4B5563]">Sign in to manage your cart</p>
          <div className="mt-4 space-y-2">
            <input className="bb-input" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className="bb-input" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button
            className="bb-btn-primary mt-3 w-full py-3"
            onClick={login}
            disabled={loading.login}
          >
            {loading.login ? 'Logging in...' : token ? 'Connected' : 'Login'}
          </button>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <button className="bb-btn-secondary" onClick={loadProducts} disabled={loading.products}>
              {loading.products ? 'Loading...' : 'Products'}
            </button>
            <button className="bb-btn-secondary" onClick={loadBoxes} disabled={loading.boxes}>
              {loading.boxes ? 'Loading...' : 'Boxes'}
            </button>
            <button className="bb-btn-secondary" onClick={loadCart} disabled={loading.cart || !token}>
              {loading.cart ? 'Loading...' : 'Cart'}
            </button>
            <button className="bb-btn-primary rounded-xl" onClick={placeOrder} disabled={loading.order || !token}>
              {loading.order ? 'Placing...' : 'Order'}
            </button>
          </div>
          {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
          {message ? <p className="mt-2 text-sm text-[#374151]">{message}</p> : null}
          <div className="mt-5 rounded-2xl bg-gray-100 p-4">
            <p className="text-xs text-[#4B5563]">Cart subtotal</p>
            <p className="text-2xl font-bold">${cartTotal.toFixed(2)}</p>
          </div>
        </aside>

        <section className="space-y-5">
          <div className="bb-card">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Popular items</h2>
              <span className="text-xs text-[#1caf50]">See all</span>
            </div>
            {products.length === 0 ? <p className="mt-3 text-sm text-[#4B5563]">No products loaded.</p> : null}
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((p) => (
                <div key={p.id} className="rounded-2xl border border-gray-100 p-3 shadow-sm">
                  <div className="h-28 rounded-xl bg-gradient-to-r from-green-200 to-green-100" />
                  <h3 className="mt-3 font-semibold">{p.name}</h3>
                  <p className="text-sm text-[#4B5563]">${p.price}</p>
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <button className="h-8 w-8 rounded-full border border-gray-300 disabled:opacity-50" onClick={() => updateProductQty(p.id, -1)} disabled={!token}>
                      -
                    </button>
                    <button className="h-8 w-8 rounded-full border border-gray-300 disabled:opacity-50" onClick={() => updateProductQty(p.id, 1)} disabled={!token}>
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bb-card">
            <h2 className="text-lg font-semibold">Box bundles</h2>
            {boxes.length === 0 ? <p className="mt-3 text-sm text-[#4B5563]">No boxes loaded.</p> : null}
            <div className="mt-4 space-y-3">
              {boxes.map((box) => (
                <div key={box.id} className="rounded-2xl border border-gray-100 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{box.name}</h3>
                      <p className="text-xs text-[#4B5563]">{box.items.map((item) => `${item.quantity}x ${item.product.name}`).join(', ')}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${box.price}</p>
                      <button className="mt-1 rounded-full bg-[#1caf50] px-3 py-1 text-xs font-semibold text-white disabled:opacity-50" onClick={() => addBox(box.id)} disabled={!token || loading[`box-${box.id}`]}>
                        {loading[`box-${box.id}`] ? 'Adding...' : 'Add'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bb-card">
            <h2 className="text-lg font-semibold">Your cart</h2>
            {!cart || cart.items.length === 0 ? (
              <p className="mt-3 text-sm text-[#4B5563]">Your cart is empty.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {cart.items.map((item) => (
                  <li key={item.id} className="flex items-center justify-between rounded-xl border border-gray-100 p-3 text-sm">
                    <span>
                      {item.product ? item.product.name : item.box?.name} x {item.quantity}
                    </span>
                    {item.box ? (
                      <button className="rounded-full border border-gray-300 px-3 py-1 text-xs disabled:opacity-50" onClick={() => removeBox(item.box!.id)} disabled={loading[`box-rm-${item.box.id}`]}>
                        Remove
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
      <MobileNav />
    </main>
  );
}

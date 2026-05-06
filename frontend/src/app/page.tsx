'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, authStorage, guestStorage } from '@/lib/api';
import { MobileNav } from '@/components/app-nav';

type Product = { id: string; name: string; price: string };
type CartResponse = {
  items: Array<{
    id: string;
    quantity: number;
    product?: { id: string; name: string; price: string } | null;
    box?: { id: string; name: string; price: string } | null;
  }>;
};

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [error, setError] = useState('');
  const token = authStorage.getAccessToken();

  useEffect(() => {
    guestStorage.getGuestId();
    void loadProducts();
    void loadCart();
  }, []);

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const data = await api.get<Product[]>('/products');
      setProducts(data);
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadCart = async () => {
    try {
      const data = await api.get<CartResponse>('/cart', token, true);
      setCart(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cart');
    }
  };

  const addProduct = async (productId: string) => {
    setLoading(true);
    setError('');
    try {
      await api.post('/cart/items', { productId, quantity: 1 }, token);
      await loadCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add product');
    } finally {
      setLoading(false);
    }
  };

  const placeOrder = async () => {
    setLoading(true);
    setError('');
    try {
      await api.post('/orders', {}, token);
      await loadCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const cartSubtotal = useMemo(() => {
    if (!cart) return 0;
    return cart.items.reduce((sum, item) => {
      if (item.product) return sum + Number(item.product.price) * item.quantity;
      if (item.box) return sum + Number(item.box.price) * item.quantity;
      return sum;
    }, 0);
  }, [cart]);

  return (
    <main className="bb-page">
      <section className="bb-shell">
        <div className="bb-header-sticky">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs bb-muted">Delivery location</p>
            <h1 className="text-lg font-bold">Green Valley Point</h1>
          </div>
          <a href="/profile" className="bb-btn-secondary !min-h-10 rounded-2xl px-3">Profile</a>
        </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-full bg-gray-100 p-1 text-sm">
          <button className="rounded-full bg-[#1caf50] py-3 font-semibold text-white active:scale-[0.99]">Delivery</button>
          <button className="rounded-full py-2 font-medium bb-secondary">Pickup</button>
        </div>
        <div className="mt-4 grid grid-cols-5 gap-1 text-center text-xs sm:text-sm bb-muted">
          {['Meats', 'Fresh', 'Bakery', 'Grains', 'Organic'].map((category) => (
            <span key={category}>{category}</span>
          ))}
        </div>
        <div className="mt-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Popular items</h2>
          <span className="bb-secondary text-sm">See All</span>
        </div>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        {loadingProducts ? (
          <div className="mt-4 space-y-4">
            <div className="space-y-2 rounded-2xl border border-gray-100 bg-white p-3">
              <div className="bb-skeleton h-4 w-1/3" />
              <div className="bb-skeleton h-3 w-2/3" />
            </div>
            <div className="bb-card-product">
              <div className="bb-skeleton h-44" />
              <div className="mt-3 space-y-2">
                <div className="bb-skeleton h-5 w-2/3" />
                <div className="bb-skeleton h-8 w-1/2" />
              </div>
            </div>
            <div className="bb-card-product">
              <div className="bb-skeleton h-44" />
              <div className="mt-3 space-y-2">
                <div className="bb-skeleton h-5 w-2/3" />
                <div className="bb-skeleton h-8 w-1/2" />
              </div>
            </div>
          </div>
        ) : null}
        {!loadingProducts ? <div className="mt-4 space-y-4">
          {products.map((product) => (
            <div key={product.id} className="bb-card-product">
              <div className="h-44 rounded-2xl bg-gradient-to-r from-green-200 to-green-100 bb-touchable" />
              <div className="mt-3 flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-semibold">{product.name}</h3>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="text-3xl font-bold">${product.price}</p>
                    <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-700">Discount 5%</span>
                  </div>
                </div>
                <span className="text-lg">⭐ 3.5</span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 text-sm bb-secondary">
                <span>Delivered</span>
                <span>Time 10 min</span>
              </div>
              <div className="mt-3 flex justify-end">
                <button className="bb-btn-primary w-full bb-touchable" onClick={() => addProduct(product.id)} disabled={loading}>
                  {loading ? 'Adding...' : 'Add to cart'}
                </button>
              </div>
            </div>
          ))}
          {products.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5 text-center">
              <p className="text-3xl">🛍️</p>
              <p className="mt-2 text-base font-semibold">No products yet</p>
              <p className="mt-1 text-sm bb-muted">Try refreshing catalog.</p>
              <button className="bb-btn-primary mt-3 w-full bb-touchable" onClick={() => void loadProducts()}>
                Reload products
              </button>
            </div>
          ) : null}
        </div> : null}
        <div className="mt-5 rounded-2xl bg-gray-50 p-3 sm:p-4">
          <p className="text-sm bb-secondary">Cart subtotal: ${cartSubtotal.toFixed(2)}</p>
          <button className="bb-btn-primary mt-2 w-full bb-touchable" onClick={placeOrder} disabled={loading}>
            Place order {token ? '(authorized)' : '(guest)'}
          </button>
        </div>
        <MobileNav />
      </section>
    </main>
  );
}

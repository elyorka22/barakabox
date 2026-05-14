'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import { Sparkles, UserRound } from 'lucide-react';
import { api, authEvents, authStorage } from '@/lib/api';
import { MobileNav } from '@/components/app-nav';
import { ProfileInstallSection } from '@/components/pwa/ProfileInstallSection';
import { ProfileActiveOrderCard } from '@/components/profile/profile-active-order-card';
import { ProfileFloatingTrackCta } from '@/components/profile/profile-floating-track-cta';
import { ProfileHeroCard } from '@/components/profile/profile-hero-card';
import { ProfileLoyaltySection } from '@/components/profile/profile-loyalty-section';
import { ProfileNotificationsSection } from '@/components/profile/profile-notifications-section';
import { ProfileQuickActionsGrid } from '@/components/profile/profile-quick-actions-grid';
import { ProfileReorderSection } from '@/components/profile/profile-reorder-section';
import { ProfileSettingsSection } from '@/components/profile/profile-settings-section';
import { isActiveDeliveryStatus, readLastOrderSnapshot } from '@/lib/last-order-storage';
import type { LastOrderSnapshot } from '@/lib/last-order-storage';
import { getProfileLoyaltyDisplay } from '@/lib/profile-loyalty-storage';
import { getProfileNotifCounts } from '@/lib/profile-notifications-storage';
import { normalizeProfileRole, staffDashboardPath } from '@/lib/profile-role';
import type { StoredUser } from '@/lib/api';

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: StoredUser;
};

export default function ProfilePage() {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<'name' | 'email' | 'password' | 'confirmPassword', string>>
  >({});
  const [touched, setTouched] = useState<
    Partial<Record<'name' | 'email' | 'password' | 'confirmPassword', boolean>>
  >({});
  const [user, setUser] = useState<StoredUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastOrder, setLastOrder] = useState<LastOrderSnapshot | null>(null);
  const [notifCounts, setNotifCounts] = useState(getProfileNotifCounts());

  const syncStored = useCallback(() => {
    setLastOrder(readLastOrderSnapshot());
    setNotifCounts(getProfileNotifCounts());
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setMounted(true);
      setUser(authStorage.getUser());
      syncStored();
    });
    const onAuth = () => {
      setUser(authStorage.getUser());
      syncStored();
    };
    window.addEventListener(authEvents.changedEventName, onAuth);
    window.addEventListener('focus', syncStored);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener(authEvents.changedEventName, onAuth);
      window.removeEventListener('focus', syncStored);
    };
  }, [syncStored]);

  const validate = () => {
    const next: Partial<Record<'name' | 'email' | 'password' | 'confirmPassword', string>> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (mode === 'register') {
      if (!name.trim()) next.name = 'Ismni kiriting';
    }
    const idValue = email.trim();
    if (!idValue) {
      next.email = mode === 'login' ? 'Email yoki login kiriting' : 'Emailni kiriting';
    } else if (mode === 'register' || idValue.includes('@')) {
      if (!emailRegex.test(idValue)) {
        next.email = 'To‘g‘ri email kiriting';
      }
    } else if (idValue.length < 3) {
      next.email = 'Login kamida 3 belgi bo‘lishi kerak';
    }
    if (!password) {
      next.password = 'Parolni kiriting';
    } else if (password.length < 6) {
      next.password = 'Parol kamida 6 belgidan iborat bo‘lishi kerak';
    }
    if (mode === 'register') {
      if (!confirmPassword) {
        next.confirmPassword = 'Parolni tasdiqlang';
      } else if (confirmPassword !== password) {
        next.confirmPassword = 'Parollar mos kelmadi';
      }
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleBlur = (field: 'name' | 'email' | 'password' | 'confirmPassword') => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async () => {
    setError('');
    setTouched({ name: true, email: true, password: true, confirmPassword: true });
    if (!validate()) return;

    setLoading(true);
    try {
      if (mode === 'login') {
        const data = await api.post<LoginResponse>('/auth/login', { login: email.trim(), password });
        authStorage.setAccessToken(data.accessToken);
        authStorage.setRefreshToken(data.refreshToken);
        authStorage.setUser(data.user);
        setUser(data.user);
        const dash = staffDashboardPath(data.user.role);
        if (dash) {
          window.location.href = dash;
          return;
        }
      } else {
        await api.post('/auth/register', {
          email: email.trim(),
          fullName: name.trim(),
          password,
        });
        const data = await api.post<LoginResponse>('/auth/login', { login: email.trim(), password });
        authStorage.setAccessToken(data.accessToken);
        authStorage.setRefreshToken(data.refreshToken);
        authStorage.setUser(data.user);
        setUser(data.user);
      }
      syncStored();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : mode === 'login'
            ? 'Kirish amalga oshmadi'
            : "Ro‘yxatdan o‘tish amalga oshmadi",
      );
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    void authStorage.logout().finally(() => {
      setUser(null);
      syncStored();
    });
  };

  const loyalty = user ? getProfileLoyaltyDisplay(user.id) : null;
  const activeOrder = lastOrder && isActiveDeliveryStatus(lastOrder.status) ? lastOrder : null;
  const showFloating = Boolean(user && activeOrder);

  if (!mounted) {
    return (
      <main className="bb-page bg-[#F7F7F7]">
        <section className="bb-shell space-y-4 pb-28 pt-2">
          <div className="bb-skeleton h-8 w-40 rounded-xl" />
          <div className="bb-skeleton h-32 w-full rounded-2xl" />
          <div className="bb-skeleton h-24 w-full rounded-2xl" />
        </section>
        <MobileNav />
      </main>
    );
  }

  return (
    <main className="bb-page bg-[#F7F7F7]">
      <section className={`bb-shell space-y-4 ${showFloating ? 'pb-32' : 'pb-28'} pt-1`}>
        {!user ? (
          <>
            <div className="flex items-end justify-between px-0.5 pb-1">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-[#6B7280]">Xush kelibsiz</p>
                <h1 className="text-xl font-semibold tracking-tight text-[#111827]">Profil</h1>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden rounded-2xl border border-[#ECECEC] bg-white shadow-sm"
            >
              <div className="border-b border-[#ECECEC] bg-[#F4FBF6] px-4 py-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#ECECEC] bg-white text-[#16A34A]">
                    <UserRound className="h-5 w-5" strokeWidth={2} />
                  </span>
                  <div>
                    <p className="text-base font-semibold text-[#111827]">
                      {mode === 'login' ? 'Hisobingizga kiring' : 'Akkaunt yarating'}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-[#6B7280]">
                      Buyurtma, cashback va yetkazib berish — barchasi bir joyda.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 p-4">
                  <div className="inline-flex w-full rounded-xl border border-[#ECECEC] bg-[#FAFAFA] p-1 text-xs font-medium">
                    <button
                      type="button"
                      className={`flex-1 rounded-lg py-2 transition ${mode === 'login' ? 'bg-white text-[#16A34A] shadow-sm' : 'text-[#6B7280]'}`}
                      onClick={() => {
                        setMode('login');
                        setError('');
                      }}
                    >
                      Kirish
                    </button>
                    <button
                      type="button"
                      className={`flex-1 rounded-lg py-2 transition ${mode === 'register' ? 'bg-white text-[#16A34A] shadow-sm' : 'text-[#6B7280]'}`}
                      onClick={() => {
                        setMode('register');
                        setError('');
                      }}
                    >
                      Ro‘yxatdan o‘tish
                    </button>
                  </div>
                  {mode === 'register' ? (
                    <div className="space-y-1">
                      <input
                        className="bb-input rounded-xl border-[#ECECEC] bg-white px-4 py-3 text-sm outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A]"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onBlur={() => handleBlur('name')}
                        placeholder="Ism va familiya"
                      />
                      {touched.name && fieldErrors.name ? (
                        <p className="text-xs text-red-600">{fieldErrors.name}</p>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="space-y-1">
                    <input
                      className="bb-input rounded-xl border-[#ECECEC] bg-white px-4 py-3 text-sm outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A]"
                      type={mode === 'login' ? 'text' : 'email'}
                      autoComplete={mode === 'login' ? 'username' : 'email'}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => handleBlur('email')}
                      placeholder={mode === 'login' ? 'Email yoki login (masalan: courier)' : 'Email'}
                    />
                    {touched.email && fieldErrors.email ? (
                      <p className="text-xs text-red-600">{fieldErrors.email}</p>
                    ) : null}
                  </div>
                  <div className="space-y-1">
                    <input
                      className="bb-input rounded-xl border-[#ECECEC] bg-white px-4 py-3 text-sm outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A]"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onBlur={() => handleBlur('password')}
                      placeholder="Parol"
                    />
                    {touched.password && fieldErrors.password ? (
                      <p className="text-xs text-red-600">{fieldErrors.password}</p>
                    ) : null}
                  </div>
                  {mode === 'register' ? (
                    <div className="space-y-1">
                      <input
                        className="bb-input rounded-xl border-[#ECECEC] bg-white px-4 py-3 text-sm outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A]"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onBlur={() => handleBlur('confirmPassword')}
                        placeholder="Parolni tasdiqlang"
                      />
                      {touched.confirmPassword && fieldErrors.confirmPassword ? (
                        <p className="text-xs text-red-600">{fieldErrors.confirmPassword}</p>
                      ) : null}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    className="bb-btn-primary w-full rounded-2xl py-3.5"
                    onClick={() => void handleSubmit()}
                    disabled={loading}
                  >
                    {loading ? 'Yuborilmoqda...' : mode === 'login' ? 'Kirish' : "Ro‘yxatdan o‘tish"}
                  </button>
                  <Link
                    href="/"
                    className="bb-btn-secondary block w-full rounded-2xl py-3 text-center text-sm font-medium"
                  >
                    Mehmon sifatida davom etish
                  </Link>
                  <Link href="/staff/login" className="block text-center text-xs font-medium text-[#16A34A]">
                    Xodimlar uchun alohida kirish
                  </Link>
                  <p className="text-center text-xs text-[#6B7280]">
                    {mode === 'login' ? "Hisobingiz yo‘qmi? " : "Akkauntingiz bormi? "}
                    <button
                      type="button"
                      className="font-medium text-[#16A34A]"
                      onClick={() => {
                        setMode(mode === 'login' ? 'register' : 'login');
                        setError('');
                      }}
                    >
                      {mode === 'login' ? "Ro‘yxatdan o‘ting" : 'Kirish'}
                    </button>
                  </p>
                  {error ? <p className="text-center text-sm text-red-600">{error}</p> : null}
              </div>
            </motion.div>

            <div className="rounded-2xl border border-[#ECECEC] bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#16A34A]" />
                <p className="text-sm font-semibold text-[#111827]">Nimalar ochiladi</p>
              </div>
              <ul className="mt-3 space-y-2 border-t border-[#ECECEC] pt-3 text-xs leading-relaxed text-[#6B7280]">
                <li className="flex gap-2">
                  <span className="text-[#16A34A]">✓</span> Buyurtmalar va qayta buyurtma
                </li>
                <li className="flex gap-2">
                  <span className="text-[#16A34A]">✓</span> Cashback va aksiyalar
                </li>
                <li className="flex gap-2">
                  <span className="text-[#16A34A]">✓</span> Tezkor manzil va to‘lov
                </li>
              </ul>
            </div>

            <ProfileInstallSection />
          </>
        ) : (
          <>
            <div className="flex items-end justify-between px-0.5 pb-1">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-[#6B7280]">Shaxsiy kabinet</p>
                <h1 className="text-xl font-semibold tracking-tight text-[#111827]">Profil</h1>
              </div>
            </div>

            {loyalty ? <ProfileHeroCard fullName={user.fullName} email={user.email} loyalty={loyalty} /> : null}
            {activeOrder ? <ProfileActiveOrderCard order={activeOrder} /> : null}

            <ProfileQuickActionsGrid
              badges={{
                Buyurtmalar: notifCounts.orders,
                Cashback: notifCounts.cashback,
                Kuponlar: notifCounts.promotions,
              }}
            />

            <ProfileReorderSection order={lastOrder} />

            {loyalty ? <ProfileLoyaltySection loyalty={loyalty} /> : null}

            <ProfileNotificationsSection counts={notifCounts} />

            <ProfileInstallSection />

            <ProfileSettingsSection role={normalizeProfileRole(user.role)} onLogout={logout} />
          </>
        )}
      </section>

      <ProfileFloatingTrackCta visible={showFloating} />
      <MobileNav />
    </main>
  );
}

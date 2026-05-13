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
import { normalizeProfileRole } from '@/lib/profile-role';

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; role: string; fullName: string };
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
  const [user, setUser] = useState<LoginResponse['user'] | null>(null);
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
      setUser(authStorage.getUser() as LoginResponse['user'] | null);
      syncStored();
    });
    const onAuth = () => {
      setUser(authStorage.getUser() as LoginResponse['user'] | null);
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
    if (!email.trim()) {
      next.email = 'Emailni kiriting';
    } else if (!emailRegex.test(email.trim())) {
      next.email = 'To‘g‘ri email kiriting';
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
        const data = await api.post<LoginResponse>('/auth/login', { email: email.trim(), password });
        authStorage.setAccessToken(data.accessToken);
        authStorage.setRefreshToken(data.refreshToken);
        authStorage.setUser(data.user);
        setUser(data.user);
      } else {
        await api.post('/auth/register', {
          email: email.trim(),
          fullName: name.trim(),
          password,
        });
        const data = await api.post<LoginResponse>('/auth/login', { email: email.trim(), password });
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
      <main className="bb-page bg-[#F3F5F9]">
        <section className="bb-shell space-y-4 pb-28 pt-2">
          <div className="bb-skeleton h-8 w-40 rounded-xl" />
          <div className="bb-skeleton h-44 w-full rounded-[22px]" />
          <div className="bb-skeleton h-28 w-full rounded-[20px]" />
        </section>
        <MobileNav />
      </main>
    );
  }

  return (
    <main className={`bb-page ${user ? 'bg-[#F3F5F9]' : 'bg-[#F6F8FC]'}`}>
      <section className={`bb-shell space-y-4 ${showFloating ? 'pb-32' : 'pb-28'} pt-1`}>
        {!user ? (
          <>
            <div className="flex items-end justify-between px-0.5 pb-1">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Xush kelibsiz</p>
                <h1 className="text-xl font-bold tracking-tight text-[#0f172a]">Profil</h1>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 p-[1px] shadow-[0_16px_40px_rgba(15,23,42,0.12)]"
            >
              <div className="relative rounded-[21px] bg-white p-5">
                <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-emerald-500/15 blur-2xl" />
                <div className="relative flex items-start gap-3">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
                    <UserRound className="h-7 w-7" strokeWidth={2} />
                  </span>
                  <div>
                    <p className="text-base font-bold text-[#0f172a]">
                      {mode === 'login' ? 'Hisobingizga kiring' : 'Akkaunt yarating'}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      Buyurtma, cashback va tezkor yetkazib berish — barchasi bir joyda.
                    </p>
                  </div>
                </div>

                <div className="relative mt-5 space-y-3">
                  <div className="inline-flex w-full rounded-2xl bg-slate-100 p-1 text-xs font-semibold">
                    <button
                      type="button"
                      className={`flex-1 rounded-xl py-2 ${mode === 'login' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}
                      onClick={() => {
                        setMode('login');
                        setError('');
                      }}
                    >
                      Kirish
                    </button>
                    <button
                      type="button"
                      className={`flex-1 rounded-xl py-2 ${mode === 'register' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}
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
                        className="bb-input w-full rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3 text-sm outline-none ring-emerald-500/20 focus:ring-2"
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
                      className="bb-input w-full rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3 text-sm outline-none ring-emerald-500/20 focus:ring-2"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => handleBlur('email')}
                      placeholder="Email"
                    />
                    {touched.email && fieldErrors.email ? (
                      <p className="text-xs text-red-600">{fieldErrors.email}</p>
                    ) : null}
                  </div>
                  <div className="space-y-1">
                    <input
                      className="bb-input w-full rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3 text-sm outline-none ring-emerald-500/20 focus:ring-2"
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
                        className="bb-input w-full rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3 text-sm outline-none ring-emerald-500/20 focus:ring-2"
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
                    className="w-full rounded-2xl bg-[#16A34A] py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(22,163,74,0.35)] transition active:scale-[0.99] disabled:opacity-60"
                    onClick={() => void handleSubmit()}
                    disabled={loading}
                  >
                    {loading ? 'Yuborilmoqda...' : mode === 'login' ? 'Kirish' : "Ro‘yxatdan o‘tish"}
                  </button>
                  <Link
                    href="/"
                    className="block w-full rounded-2xl border border-slate-200 py-3 text-center text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Mehmon sifatida davom etish
                  </Link>
                  <p className="text-center text-xs text-slate-500">
                    {mode === 'login' ? "Hisobingiz yo‘qmi? " : "Akkauntingiz bormi? "}
                    <button
                      type="button"
                      className="font-semibold text-emerald-600"
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
              </div>
            </motion.div>

            <div className="rounded-[20px] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] ring-1 ring-slate-100">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <p className="text-sm font-semibold text-[#0f172a]">Nimalar ochiladi</p>
              </div>
              <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-600">
                <li className="flex gap-2">
                  <span className="text-emerald-600">✓</span> Buyurtmalar va qayta buyurtma
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-600">✓</span> Cashback va aksiyalar
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-600">✓</span> Tezkor manzil va to‘lov
                </li>
              </ul>
            </div>

            <ProfileInstallSection />
          </>
        ) : (
          <>
            <div className="flex items-end justify-between px-0.5 pb-1">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Shaxsiy kabinet</p>
                <h1 className="text-xl font-bold tracking-tight text-[#0f172a]">Profil</h1>
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

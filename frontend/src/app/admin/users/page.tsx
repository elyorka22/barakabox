'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, authStorage } from '@/lib/api';

type Business = {
  id: string;
  user: { id: string; email: string; fullName: string; role?: string };
};

type Role = 'ADMIN' | 'BUSINESS' | 'CLIENT' | 'COURIER' | 'PICKER';

export default function AdminUsersPage() {
  const token = authStorage.getAccessToken();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | Role>('ALL');
  const [users, setUsers] = useState<Array<{ id: string; fullName: string; email: string; role: Role; blocked: boolean }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      setLoading(true);
      const businesses = await api.get<Business[]>('/businesses', token);
      const list = businesses.map((item) => ({
        id: item.user.id,
        fullName: item.user.fullName,
        email: item.user.email,
        role: (item.user.role?.toUpperCase() as Role) || 'BUSINESS',
        blocked: false,
      }));
      setUsers([{ id: 'admin-local', fullName: 'Admin', email: 'admin@barakabox.local', role: 'ADMIN', blocked: false }, ...list]);
      setLoading(false);
    };
    void load();
  }, [token]);

  const visible = useMemo(() => {
    return users.filter((user) => {
      const q = search.trim().toLowerCase();
      const roleOk = roleFilter === 'ALL' ? true : user.role === roleFilter;
      const searchOk = q.length === 0 || user.fullName.toLowerCase().includes(q) || user.email.toLowerCase().includes(q);
      return roleOk && searchOk;
    });
  }, [users, search, roleFilter]);

  const toggleBlocked = (id: string) => {
    setUsers((prev) => prev.map((user) => (user.id === id ? { ...user, blocked: !user.blocked } : user)));
  };

  return (
    <div className="space-y-3 md:space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:rounded-2xl md:p-4">
        <h2 className="text-base font-semibold md:text-lg">Users</h2>
        <p className="text-xs text-slate-500 md:text-sm">Role badges, block/unblock va qidiruv.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <input
            className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm md:rounded-xl"
            placeholder="Qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm md:rounded-xl"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as 'ALL' | Role)}
          >
            <option value="ALL">Barcha role</option>
            <option value="ADMIN">ADMIN</option>
            <option value="BUSINESS">BUSINESS</option>
            <option value="CLIENT">CLIENT</option>
            <option value="COURIER">COURIER</option>
            <option value="PICKER">PICKER</option>
          </select>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:rounded-2xl md:p-4">
        {loading ? <div className="bb-skeleton h-48 w-full md:h-64" /> : null}
        <div className="space-y-2 md:space-y-3">
          {visible.map((user) => (
            <div
              key={user.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 p-2.5 md:rounded-xl md:p-3"
            >
              <div className="min-w-0">
                <p className="font-semibold">{user.fullName}</p>
                <p className="truncate text-xs text-slate-500">{user.email}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium">{user.role}</span>
                <button
                  type="button"
                  className={`min-h-11 min-w-[4.5rem] rounded-lg px-3 text-xs font-semibold md:min-h-10 ${
                    user.blocked ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                  }`}
                  onClick={() => toggleBlocked(user.id)}
                >
                  {user.blocked ? 'Unblock' : 'Block'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

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
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Users</h2>
        <p className="text-sm text-slate-500">Role badges, block/unblock va qidiruv.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Qidirish..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as 'ALL' | Role)}>
            <option value="ALL">Barcha role</option>
            <option value="ADMIN">ADMIN</option>
            <option value="BUSINESS">BUSINESS</option>
            <option value="CLIENT">CLIENT</option>
            <option value="COURIER">COURIER</option>
            <option value="PICKER">PICKER</option>
          </select>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {loading ? <div className="bb-skeleton h-64 w-full" /> : null}
        <div className="space-y-3">
          {visible.map((user) => (
            <div key={user.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 p-3">
              <div>
                <p className="font-semibold">{user.fullName}</p>
                <p className="text-xs text-slate-500">{user.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium">{user.role}</span>
                <button className={`rounded-lg px-2 py-1 text-xs ${user.blocked ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`} onClick={() => toggleBlocked(user.id)}>
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

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, authStorage } from '@/lib/api';

type StaffRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'BUSINESS'
  | 'COURIER'
  | 'PICKER'
  | 'CLIENT';

type AdminUserRow = {
  id: string;
  email: string;
  staffLogin: string | null;
  phone: string | null;
  fullName: string;
  role: StaffRole;
  isActive: boolean;
  lastLoginAt: string | null;
  businessScopeId: string | null;
  createdAt?: string;
  businessScope?: { id: string; displayName: string } | null;
};

type BusinessOption = { id: string; displayName: string };

type EmployeesResponse = {
  items: AdminUserRow[];
  total: number;
  page: number;
  limit: number;
};

const STAFF_ROLE_OPTIONS: StaffRole[] = ['SUPER_ADMIN', 'ADMIN', 'BUSINESS', 'COURIER', 'PICKER'];

function roleOptionsForActor(actorRole: string | undefined): StaffRole[] {
  const r = (actorRole ?? '').toUpperCase();
  if (r === 'SUPER_ADMIN') return [...STAFF_ROLE_OPTIONS];
  return STAFF_ROLE_OPTIONS.filter((role) => role !== 'SUPER_ADMIN' && role !== 'ADMIN');
}

function canManageUserRow(actorRole: string | undefined, row: AdminUserRow, actorId: string | undefined): boolean {
  const ar = (actorRole ?? '').toUpperCase();
  const tr = row.role;
  if (tr === 'CLIENT') return true;
  if (row.id === actorId) return false;
  if (ar === 'SUPER_ADMIN') return true;
  if (ar === 'ADMIN') return tr !== 'SUPER_ADMIN' && tr !== 'ADMIN';
  return false;
}

function roleBadgeClass(role: string) {
  const r = role.toUpperCase();
  if (r === 'SUPER_ADMIN') return 'bg-violet-100 text-violet-800';
  if (r === 'ADMIN') return 'bg-sky-100 text-sky-800';
  if (r === 'BUSINESS') return 'bg-amber-100 text-amber-900';
  if (r === 'COURIER') return 'bg-emerald-100 text-emerald-900';
  if (r === 'PICKER') return 'bg-orange-100 text-orange-900';
  return 'bg-slate-100 text-slate-700';
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('uz-UZ', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return '—';
  }
}

export function AdminUsersEmployees() {
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | StaffRole>('ALL');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [businesses, setBusinesses] = useState<BusinessOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [panel, setPanel] = useState<'create' | 'edit' | 'reset' | null>(null);
  const [selected, setSelected] = useState<AdminUserRow | null>(null);

  const [formFullName, setFormFullName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formLogin, setFormLogin] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<StaffRole>('COURIER');
  const [formBusinessScopeId, setFormBusinessScopeId] = useState('');
  const [formBusy, setFormBusy] = useState(false);
  const [resetPassword, setResetPassword] = useState('');

  const token = authStorage.getAccessToken();
  const me = authStorage.getUser();
  const actorRole = me?.role;
  const actorId = me?.id;
  const creatableRoles = useMemo(() => roleOptionsForActor(actorRole), [actorRole]);
  const limit = 25;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const loadUsers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        status: statusFilter,
      });
      if (roleFilter !== 'ALL') params.set('role', roleFilter);
      const q = appliedSearch.trim();
      if (q) params.set('q', q);
      const res = await api.get<EmployeesResponse>(`/admin/employees?${params}`, token);
      setUsers(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yuklab bo‘lmadi');
    } finally {
      setLoading(false);
    }
  }, [token, roleFilter, appliedSearch, statusFilter, page]);

  const loadBusinesses = useCallback(async () => {
    if (!token) return;
    try {
      const raw = await api.get<Array<{ id: string; displayName: string }>>('/businesses', token);
      setBusinesses(raw.map((b) => ({ id: b.id, displayName: b.displayName })));
    } catch {
      setBusinesses([]);
    }
  }, [token]);

  useEffect(() => {
    void loadBusinesses();
  }, [loadBusinesses]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    setPage(1);
  }, [appliedSearch, roleFilter, statusFilter]);

  const openCreate = () => {
    setSelected(null);
    setFormFullName('');
    setFormPhone('');
    setFormLogin('');
    setFormPassword('');
    setFormRole(roleOptionsForActor(actorRole)[0] ?? 'COURIER');
    setFormBusinessScopeId('');
    setPanel('create');
  };

  const openEdit = (u: AdminUserRow) => {
    setSelected(u);
    setFormFullName(u.fullName);
    setFormPhone(u.phone ?? '');
    setFormLogin(u.staffLogin ?? '');
    setFormRole(u.role);
    setFormBusinessScopeId(u.businessScopeId ?? '');
    setPanel('edit');
  };

  const openReset = (u: AdminUserRow) => {
    setSelected(u);
    setResetPassword('');
    setPanel('reset');
  };

  const closePanel = () => {
    setPanel(null);
    setSelected(null);
  };

  const submitCreate = async () => {
    if (!token) return;
    setFormBusy(true);
    setError('');
    try {
      await api.post(
        '/admin/users',
        {
          fullName: formFullName.trim(),
          phone: formPhone.trim() || undefined,
          staffLogin: formLogin.trim().toLowerCase(),
          password: formPassword,
          role: formRole,
          businessScopeId: formBusinessScopeId || undefined,
        },
        token,
      );
      closePanel();
      await loadUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yaratilmadi');
    } finally {
      setFormBusy(false);
    }
  };

  const submitEdit = async () => {
    if (!token || !selected) return;
    setFormBusy(true);
    setError('');
    try {
      await api.patch(
        `/admin/users/${selected.id}`,
        {
          fullName: formFullName.trim(),
          phone: formPhone.trim() || null,
          staffLogin: formLogin.trim().toLowerCase() || null,
          role: formRole,
          businessScopeId: formBusinessScopeId || null,
        },
        token,
      );
      closePanel();
      await loadUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Saqlanmadi');
    } finally {
      setFormBusy(false);
    }
  };

  const submitReset = async () => {
    if (!token || !selected) return;
    setFormBusy(true);
    setError('');
    try {
      await api.post(`/admin/users/${selected.id}/reset-password`, { password: resetPassword }, token);
      closePanel();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Parol yangilanmadi');
    } finally {
      setFormBusy(false);
    }
  };

  const toggleBlock = async (u: AdminUserRow) => {
    if (!token) return;
    setError('');
    try {
      if (u.isActive) {
        await api.patch(`/admin/users/${u.id}/block`, {}, token);
      } else {
        await api.patch(`/admin/users/${u.id}/unblock`, {}, token);
      }
      await loadUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Holat o‘zgarmadi');
    }
  };

  const deleteStaff = async (u: AdminUserRow) => {
    if (!token) return;
    if (!window.confirm(`${u.fullName} — akkaunt faolsizlantirilsinmi?`)) return;
    setError('');
    try {
      await api.delete(`/admin/users/${u.id}`, undefined, token);
      await loadUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'O‘chirilmadi');
    }
  };

  const exportCsv = () => {
    const header = ['Ism', 'Telefon', 'Login', 'Rol', 'Holat', 'Oxirgi kirish', 'Yaratilgan'];
    const lines = users.map((u) =>
      [
        u.fullName,
        u.phone ?? '',
        u.staffLogin ?? '',
        u.role,
        u.isActive ? 'Faol' : 'Bloklangan',
        formatDate(u.lastLoginAt),
        formatDate(u.createdAt),
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(','),
    );
    const blob = new Blob([`\uFEFF${[header.join(','), ...lines].join('\n')}`], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'xodimlar.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-xs text-slate-500 md:text-sm">Ichki xodimlar: admin, kuryer, yig‘uvchi va boshqalar.</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="min-h-10 rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-700"
            onClick={exportCsv}
            disabled={users.length === 0}
          >
            CSV eksport
          </button>
          <button
            type="button"
            className="min-h-10 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white"
            onClick={openCreate}
          >
            Yangi xodim
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <input
          className="min-h-10 flex-1 rounded-xl border border-slate-200 px-3 text-sm md:min-w-[200px]"
          placeholder="Qidiruv (ism, login, telefon)…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setAppliedSearch(search.trim());
          }}
        />
        <select
          className="min-h-10 rounded-xl border border-slate-200 px-3 text-sm"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as 'ALL' | StaffRole)}
        >
          <option value="ALL">Barcha rollar</option>
          {STAFF_ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select
          className="min-h-10 rounded-xl border border-slate-200 px-3 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
        >
          <option value="all">Barcha holatlar</option>
          <option value="active">Faol</option>
          <option value="inactive">Bloklangan</option>
        </select>
        <button
          type="button"
          className="min-h-10 rounded-xl border border-slate-200 px-4 text-sm font-medium"
          onClick={() => setAppliedSearch(search.trim())}
        >
          Qidirish
        </button>
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <div className="bb-scrollbar-hide overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-[720px] w-full text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-600">
            <tr>
              <th className="px-3 py-2.5">Xodim</th>
              <th className="px-3 py-2.5">Telefon</th>
              <th className="px-3 py-2.5">Rol</th>
              <th className="px-3 py-2.5">Holat</th>
              <th className="px-3 py-2.5">Oxirgi kirish</th>
              <th className="px-3 py-2.5">Yaratilgan</th>
              <th className="px-3 py-2.5 text-right">Amallar</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-8">
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />
                    ))}
                  </div>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-slate-500">
                  Xodim topilmadi
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const canManage = canManageUserRow(actorRole, user, actorId);
                return (
                  <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                    <td className="px-3 py-2.5">
                      <p className="font-semibold text-slate-900">{user.fullName}</p>
                      <p className="font-mono text-xs text-slate-500">{user.staffLogin ?? user.email}</p>
                      {user.businessScope ? (
                        <p className="text-xs text-amber-800">{user.businessScope.displayName}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{user.phone ?? '—'}</td>
                    <td className="px-3 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${roleBadgeClass(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          user.isActive ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                        }`}
                      >
                        {user.isActive ? 'Faol' : 'Bloklangan'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs text-slate-600">
                      {formatDate(user.lastLoginAt)}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs text-slate-600">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap justify-end gap-1">
                        {canManage ? (
                          <>
                            <button
                              type="button"
                              className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium"
                              onClick={() => openEdit(user)}
                            >
                              Tahrir
                            </button>
                            <button
                              type="button"
                              className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium"
                              onClick={() => openReset(user)}
                            >
                              Parol
                            </button>
                            <button
                              type="button"
                              className={`rounded-lg px-2 py-1 text-xs font-medium ${
                                user.isActive ? 'bg-rose-50 text-rose-800' : 'bg-emerald-50 text-emerald-800'
                              }`}
                              onClick={() => void toggleBlock(user)}
                            >
                              {user.isActive ? 'Blok' : 'Faollashtirish'}
                            </button>
                            <button
                              type="button"
                              className="rounded-lg bg-rose-50 px-2 py-1 text-xs font-medium text-rose-800"
                              onClick={() => void deleteStaff(user)}
                            >
                              O‘chirish
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <p className="text-slate-500">
            {total} ta · {page}/{totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              className="min-h-9 rounded-lg border border-slate-200 px-3 disabled:opacity-40"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Oldingi
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              className="min-h-9 rounded-lg border border-slate-200 px-3 disabled:opacity-40"
              onClick={() => setPage((p) => p + 1)}
            >
              Keyingi
            </button>
          </div>
        </div>
      ) : null}

      {panel ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div
            className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-4 shadow-xl sm:max-w-lg sm:rounded-2xl"
            role="dialog"
          >
            {panel === 'reset' ? (
              <>
                <h3 className="text-lg font-semibold">Yangi parol</h3>
                <p className="mt-1 text-sm text-slate-500">{selected?.fullName}</p>
                <input
                  type="password"
                  className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <div className="mt-5 flex gap-2">
                  <button type="button" className="bb-btn-secondary flex-1 rounded-xl py-3" onClick={closePanel}>
                    Bekor
                  </button>
                  <button
                    type="button"
                    disabled={formBusy || resetPassword.length < 8}
                    className="bb-btn-primary flex-1 rounded-xl py-3 disabled:opacity-50"
                    onClick={() => void submitReset()}
                  >
                    Saqlash
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold">{panel === 'create' ? 'Yangi xodim' : 'Tahrirlash'}</h3>
                <div className="mt-4 space-y-3">
                  <input
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                    placeholder="To‘liq ism"
                    value={formFullName}
                    onChange={(e) => setFormFullName(e.target.value)}
                  />
                  <input
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                    placeholder="Telefon"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                  />
                  <input
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 font-mono text-sm"
                    placeholder="Login"
                    value={formLogin}
                    onChange={(e) => setFormLogin(e.target.value.toLowerCase())}
                  />
                  {panel === 'create' ? (
                    <input
                      type="password"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                      placeholder="Parol (min 8)"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                    />
                  ) : null}
                  <select
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as StaffRole)}
                  >
                    {creatableRoles.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <select
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                    value={formBusinessScopeId}
                    onChange={(e) => setFormBusinessScopeId(e.target.value)}
                  >
                    <option value="">Biznes —</option>
                    {businesses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.displayName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-5 flex gap-2">
                  <button type="button" className="bb-btn-secondary flex-1 rounded-xl py-3" onClick={closePanel}>
                    Bekor
                  </button>
                  <button
                    type="button"
                    disabled={
                      formBusy ||
                      !formFullName.trim() ||
                      (panel === 'create' &&
                        (!formLogin.trim() || formPassword.length < 8 || !/^[a-z0-9_]{3,32}$/.test(formLogin.trim())))
                    }
                    className="bb-btn-primary flex-1 rounded-xl py-3 disabled:opacity-50"
                    onClick={() => void (panel === 'create' ? submitCreate() : submitEdit())}
                  >
                    Saqlash
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

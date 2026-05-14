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

export default function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | StaffRole>('ALL');
  const [includeClients, setIncludeClients] = useState(false);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
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

  const loadUsers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (roleFilter !== 'ALL') params.set('role', roleFilter);
      const q = appliedSearch.trim();
      if (q) params.set('q', q);
      if (includeClients) params.set('includeClients', '1');
      const qs = params.toString();
      const path = qs ? `/admin/users?${qs}` : '/admin/users';
      const list = await api.get<AdminUserRow[]>(path, token);
      setUsers(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yuklab bo‘lmadi');
    } finally {
      setLoading(false);
    }
  }, [token, roleFilter, appliedSearch, includeClients]);

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
    if (u.role === 'CLIENT') return;
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
      const body: Record<string, unknown> = {
        fullName: formFullName.trim(),
        phone: formPhone.trim() || null,
        role: formRole,
        businessScopeId: formBusinessScopeId || null,
      };
      if (selected.role !== 'CLIENT') {
        body.staffLogin = formLogin.trim().toLowerCase() || null;
      }
      await api.patch(`/admin/users/${selected.id}`, body, token);
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
      await loadUsers();
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
    if (!token || u.role === 'CLIENT') return;
    if (!window.confirm(`${u.fullName} — akkaunt faolsizlantirilsinmi?`)) return;
    setError('');
    try {
      await api.delete(`/admin/users/${u.id}`, undefined, token);
      await loadUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'O‘chirilmadi');
    }
  };

  const formatLastLogin = (iso: string | null) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('uz-UZ', { dateStyle: 'short', timeStyle: 'short' });
    } catch {
      return '—';
    }
  };

  const visibleHint = useMemo(() => {
    if (includeClients) return 'Mijozlar ro‘yxatda; tahrirlash faqat ma’lum maydonlar uchun.';
    return 'Faqat ichki xodimlar (SUPER_ADMIN … PICKER).';
  }, [includeClients]);

  return (
    <div className="space-y-3 md:space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:rounded-2xl md:p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold md:text-lg">Foydalanuvchilar</h2>
            <p className="text-xs text-slate-500 md:text-sm">{visibleHint}</p>
          </div>
          <button
            type="button"
            className="min-h-11 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white active:scale-[0.99]"
            onClick={openCreate}
          >
            Yangi xodim
          </button>
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <input
            className="min-h-11 flex-1 rounded-lg border border-slate-200 px-3 text-sm md:min-w-[200px] md:rounded-xl"
            placeholder="Qidiruv (ism, login, telefon, email)…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setAppliedSearch(search.trim());
              }
            }}
          />
          <select
            className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm md:rounded-xl"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as 'ALL' | StaffRole)}
          >
            <option value="ALL">Barcha rollar</option>
            {STAFF_ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
            {includeClients ? <option value="CLIENT">CLIENT</option> : null}
          </select>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={includeClients} onChange={(e) => setIncludeClients(e.target.checked)} />
            Mijozlarni ko‘rsatish
          </label>
          <button
            type="button"
            className="min-h-11 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 md:rounded-xl"
            onClick={() => {
              setAppliedSearch(search.trim());
            }}
          >
            Qidirish
          </button>
        </div>
        {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:rounded-2xl md:p-4">
        {loading ? <div className="bb-skeleton h-48 w-full md:h-64" /> : null}
        <div className="space-y-2 md:space-y-3">
          {!loading && users.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">Natija yo‘q</p>
          ) : null}
          {users.map((user) => {
            const canManage = canManageUserRow(actorRole, user, actorId);
            return (
            <div
              key={user.id}
              className="flex flex-col gap-3 rounded-lg border border-slate-100 p-3 md:flex-row md:items-center md:justify-between md:rounded-xl"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-900">{user.fullName}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${roleBadgeClass(user.role)}`}>
                    {user.role}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      user.isActive ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                    }`}
                  >
                    {user.isActive ? 'Faol' : 'Bloklangan'}
                  </span>
                </div>
                <p className="truncate text-xs text-slate-500">
                  Login: <span className="font-mono text-slate-700">{user.staffLogin ?? '—'}</span>
                  {' · '}
                  Tel: {user.phone ?? '—'}
                </p>
                <p className="truncate text-xs text-slate-400">{user.email}</p>
                {user.businessScope ? (
                  <p className="text-xs text-amber-800">Do‘kon: {user.businessScope.displayName}</p>
                ) : null}
                <p className="text-xs text-slate-400">Oxirgi kirish: {formatLastLogin(user.lastLoginAt)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {user.role !== 'CLIENT' && canManage ? (
                  <button
                    type="button"
                    className="min-h-11 rounded-lg border border-slate-200 px-3 text-xs font-semibold md:min-h-10"
                    onClick={() => openEdit(user)}
                  >
                    Tahrirlash
                  </button>
                ) : null}
                {canManage ? (
                <button
                  type="button"
                  className="min-h-11 rounded-lg border border-slate-200 px-3 text-xs font-semibold md:min-h-10"
                  onClick={() => openReset(user)}
                >
                  Parolni tiklash
                </button>
                ) : null}
                {canManage ? (
                <button
                  type="button"
                  className={`min-h-11 rounded-lg px-3 text-xs font-semibold md:min-h-10 ${
                    user.isActive ? 'bg-rose-50 text-rose-800' : 'bg-emerald-50 text-emerald-800'
                  }`}
                  onClick={() => void toggleBlock(user)}
                >
                  {user.isActive ? 'Bloklash' : 'Blokdan chiqarish'}
                </button>
                ) : null}
                {user.role !== 'CLIENT' && canManage ? (
                  <button
                    type="button"
                    className="min-h-11 rounded-lg border border-rose-100 bg-rose-50 px-3 text-xs font-semibold text-rose-800 md:min-h-10"
                    onClick={() => void deleteStaff(user)}
                  >
                    O‘chirish
                  </button>
                ) : null}
              </div>
            </div>
            );
          })}
        </div>
      </div>

      {panel === 'create' || panel === 'edit' || panel === 'reset' ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div
            className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-4 shadow-xl sm:max-h-[85vh] sm:max-w-lg sm:rounded-2xl"
            role="dialog"
          >
            {panel === 'reset' ? (
              <>
                <h3 className="text-lg font-semibold">Yangi parol</h3>
                <p className="mt-1 text-sm text-slate-500">{selected?.fullName}</p>
                <label className="mt-4 block text-xs font-medium text-slate-600">Parol (min 8)</label>
                <input
                  type="password"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <div className="mt-5 flex gap-2">
                  <button type="button" className="bb-btn-secondary flex-1 rounded-xl py-3" onClick={closePanel}>
                    Bekor qilish
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
                  <div>
                    <label className="text-xs font-medium text-slate-600">To‘liq ism</label>
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                      value={formFullName}
                      onChange={(e) => setFormFullName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600">Telefon</label>
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                    />
                  </div>
                  {selected?.role !== 'CLIENT' ? (
                    <div>
                      <label className="text-xs font-medium text-slate-600">Login (3–32, a-z, 0-9, _)</label>
                      <input
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-mono"
                        value={formLogin}
                        onChange={(e) => setFormLogin(e.target.value.toLowerCase())}
                      />
                    </div>
                  ) : null}
                  {panel === 'create' ? (
                    <div>
                      <label className="text-xs font-medium text-slate-600">Parol (min 8)</label>
                      <input
                        type="password"
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                        autoComplete="new-password"
                      />
                    </div>
                  ) : null}
                  <div>
                    <label className="text-xs font-medium text-slate-600">Rol</label>
                    <select
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value as StaffRole)}
                    >
                      {creatableRoles.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600">Biriktirilgan biznes (ixtiyoriy)</label>
                    <select
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                      value={formBusinessScopeId}
                      onChange={(e) => setFormBusinessScopeId(e.target.value)}
                    >
                      <option value="">—</option>
                      {businesses.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.displayName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-5 flex gap-2">
                  <button type="button" className="bb-btn-secondary flex-1 rounded-xl py-3" onClick={closePanel}>
                    Bekor qilish
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

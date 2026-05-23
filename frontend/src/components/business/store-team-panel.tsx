'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, authStorage } from '@/lib/api';
import { formatStaffRoleLabel } from '@/lib/staff-roles';
import type { StoreTeamMember } from '@/types/store-panel';

export function StoreTeamPanel() {
  const [team, setTeam] = useState<StoreTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const token = authStorage.getAccessToken();
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get<StoreTeamMember[]>('/businesses/team', token);
      setTeam(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yuklab bo‘lmadi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleActive = async (member: StoreTeamMember) => {
    const token = authStorage.getAccessToken();
    if (!token) return;
    try {
      await api.patch(
        `/businesses/team/${member.id}`,
        { isActive: !member.isActive },
        token,
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Holat o‘zgarmadi');
    }
  };

  if (loading) {
    return <div className="h-24 animate-pulse rounded-2xl bg-white m-4" />;
  }

  return (
    <div className="space-y-3 p-4 pb-24">
      <p className="text-xs text-slate-500">Yig‘uvchilar va kuryerlar faqat sizning do‘koningiz uchun.</p>
      {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p> : null}
      {team.length === 0 ? (
        <p className="text-sm text-slate-500">Jamoa aʼzolari yoʻq. Admin orqali qoʻshing.</p>
      ) : (
        <ul className="space-y-2">
          {team.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-black/[0.04]"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{m.fullName}</p>
                <p className="text-xs text-slate-500">
                  {formatStaffRoleLabel(m.role)}
                  {m.staffLogin ? ` · ${m.staffLogin}` : ''}
                </p>
              </div>
              <button
                type="button"
                className={`shrink-0 rounded-lg px-2 py-1 text-xs font-medium ${
                  m.isActive ? 'bg-rose-50 text-rose-800' : 'bg-emerald-50 text-emerald-800'
                }`}
                onClick={() => void toggleActive(m)}
              >
                {m.isActive ? 'Blok' : 'Faol'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

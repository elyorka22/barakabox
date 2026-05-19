'use client';

import { X } from 'lucide-react';
import { useState } from 'react';

type Props = {
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    name: string;
    phone: string;
    login: string;
    password: string;
    address?: string;
    description?: string;
  }) => void;
};

export function AdminCreateBusinessModal({ open, saving, onClose, onSubmit }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');

  if (!open) return null;

  const submit = () => {
    onSubmit({
      name: name.trim(),
      phone: phone.trim(),
      login: login.trim(),
      password,
      address: address.trim() || undefined,
      description: description.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Yangi biznes</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="font-medium">Doʻkon nomi *</span>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Telefon *</span>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Login *</span>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              autoComplete="off"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Parol * (min 6)</span>
            <input
              type="password"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Manzil</span>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Tavsif</span>
            <textarea
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
        </div>
        <button
          type="button"
          disabled={saving || name.length < 2 || phone.length < 9 || login.length < 3 || password.length < 6}
          onClick={submit}
          className="mt-4 w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? 'Saqlanmoqda...' : 'Yaratish'}
        </button>
      </div>
    </div>
  );
}

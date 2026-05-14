const DIGITS = /\D/g;

export function normalizeUzbekPhoneDigits(input: string): string {
  let d = input.replace(DIGITS, '');
  if (d.startsWith('998')) return d.slice(0, 12);
  if (d.length === 9 && d.startsWith('9')) return `998${d}`;
  return d.slice(0, 12);
}

/** +998 XX XXX XX XX while typing */
export function formatUzbekPhoneDisplay(input: string): string {
  const d = normalizeUzbekPhoneDigits(input);
  if (!d.length) return '';
  if (!d.startsWith('998')) {
    return d.length <= 3 ? `+${d}` : `+${d}`;
  }
  const local = d.slice(3);
  let out = '+998';
  if (local.length >= 1) out += ` ${local.slice(0, Math.min(2, local.length))}`;
  if (local.length > 2) out += ` ${local.slice(2, Math.min(5, local.length))}`;
  if (local.length > 5) out += ` ${local.slice(5, Math.min(7, local.length))}`;
  if (local.length > 7) out += ` ${local.slice(7, Math.min(9, local.length))}`;
  return out;
}

export function isUzbekPhoneComplete(input: string): boolean {
  return normalizeUzbekPhoneDigits(input).length === 12;
}

export function onPhoneUzInputChange(raw: string): string {
  const d = normalizeUzbekPhoneDigits(raw).slice(0, 12);
  return formatUzbekPhoneDisplay(d);
}

/** 12-digit string for API or null if incomplete. */
export function phoneDigitsForApi(input: string): string | null {
  const d = normalizeUzbekPhoneDigits(input);
  if (d.length !== 12 || !d.startsWith('998')) return null;
  return d;
}

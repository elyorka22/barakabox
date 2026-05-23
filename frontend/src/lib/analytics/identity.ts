const GUEST_ID_KEY = 'barakabox_guest_id';
const USER_KEY = 'barakabox_user';

export function getAnalyticsIdentity(): { guestId?: string; userId?: string } {
  if (typeof window === 'undefined') return {};
  const guestId = window.localStorage.getItem(GUEST_ID_KEY) ?? undefined;
  let userId: string | undefined;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { id?: string };
      userId = parsed.id;
    }
  } catch {
    userId = undefined;
  }
  return { guestId: guestId || undefined, userId };
}

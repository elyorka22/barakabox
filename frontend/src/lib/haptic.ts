/** Light tap feedback on supported mobile browsers. */
export function hapticTap(duration = 8): void {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  try {
    navigator.vibrate(duration);
  } catch {
    // ignore
  }
}

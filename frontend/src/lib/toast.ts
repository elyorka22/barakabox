type ToastType = 'success' | 'error' | 'info';

export type ToastPayload = {
  message: string;
  type?: ToastType;
};

export const TOAST_EVENT = 'barakabox_toast_event';

export function showToast(payload: ToastPayload) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<ToastPayload>(TOAST_EVENT, {
      detail: payload,
    }),
  );
}

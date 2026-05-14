/** Uzbek copy for browser geolocation errors (GeolocationPositionError codes). */
export function geolocationErrorMessageUz(code: number | undefined): string {
  switch (code) {
    case 1:
      return 'Joylashuv ruxsati berilmadi. Brauzer sozlamalaridan ruxsat bering yoki manzilni qo‘lda kiriting.';
    case 2:
      return 'Joylashuv aniqlanmadi (signal yo‘q). Tashqariga chiqib qayta urinib ko‘ring.';
    case 3:
      return 'Vaqt tugadi. Qayta urinib ko‘ring yoki internetni tekshiring.';
    default:
      return 'Joylashuvni olishda xatolik yuz berdi. Qayta urinib ko‘ring.';
  }
}

export function insecureGeoMessageUz(): string {
  return 'Joylashuv faqat xavfsiz (HTTPS) sahifada ishlaydi. Ilova yoki brauzer HTTPS rejimida ochilganini tekshiring.';
}

/** OpenStreetMap reverse geocode via same-origin Next.js proxy. */
export async function reverseGeocodeOsm(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `/api/geocode/reverse?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { displayName?: string | null };
    const d = data.displayName;
    return typeof d === 'string' && d.trim() ? d.trim() : null;
  } catch {
    return null;
  }
}

export function shortenAddressLine(text: string, max = 64): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

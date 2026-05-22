const uz = {
  common: {
    genericError: 'Xatolik yuz berdi',
    rateLimited: "Juda tez bosildi. Biroz kutib qayta uriniladi…",
    networkError: 'Internet bilan muammo',
    retry: "Qayta urinib ko'ring",
  },
} as const;

type Dict = typeof uz;

export function t(path: string): string {
  const parts = path.split('.');
  let current: unknown = uz as Dict;
  for (const part of parts) {
    if (!current || typeof current !== 'object' || !(part in current)) {
      return path;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : path;
}

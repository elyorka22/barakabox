'use client';

import { useEffect, useState } from 'react';
import { fetchHomepageBanner, type HomepageBanner } from '@/lib/homepage-banner';
import { formatMoneyUz } from '@/lib/format';

function formatBannerAmount(amount: number): string {
  return formatMoneyUz(amount).replace(/\s*so'm\s*$/i, '').trim() + " so'm";
}

export function HomeDeliveryBanner() {
  const [banner, setBanner] = useState<HomepageBanner | null>(null);

  useEffect(() => {
    void fetchHomepageBanner().then(setBanner);
  }, []);

  if (!banner?.title) return null;

  const title =
    banner.title.includes('{amount}') || banner.title.includes('{{amount}}')
      ? banner.title
          .replace(/\{\{amount\}\}|\{amount\}/g, formatBannerAmount(banner.freeDeliveryAmount))
      : banner.title;

  return (
    <section
      className="mt-4 rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
      style={{ backgroundColor: banner.backgroundColor || '#F2E5CC' }}
    >
      <p className="text-[15px] font-semibold leading-snug text-[#111827]">{title}</p>
      {banner.subtitle ? (
        <p className="mt-1 text-xs leading-relaxed text-slate-600">{banner.subtitle}</p>
      ) : null}
    </section>
  );
}

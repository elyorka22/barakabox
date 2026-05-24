import Link from 'next/link';
import { Star } from 'lucide-react';
import { SafeImage } from '@/components/safe-image';
import { formatDeliveryTime, type StoreCard } from '@/lib/stores-api';

type Props = {
  store: StoreCard;
  href?: string;
  className?: string;
  variant?: 'carousel' | 'list';
};

export function StoreCardLink({ store, href, className = '', variant = 'list' }: Props) {
  const link = href ?? `/store/${store.slug}`;
  const deliveryLabel = formatDeliveryTime(store.deliveryTimeMinutes ?? store.deliveryTime);
  const rating = store.rating > 0 ? store.rating.toFixed(1) : null;

  if (variant === 'carousel') {
    return (
      <Link
        href={link}
        className={`flex min-w-[168px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_4px_14px_rgba(17,24,39,0.06)] active:scale-[0.98] ${className}`}
      >
        <div className="relative h-20 w-full bg-slate-100">
          {store.banner || store.bannerUrl ? (
            <SafeImage
              src={store.banner ?? store.bannerUrl ?? ''}
              alt=""
              className="h-full w-full object-cover"
              sizes="168px"
            />
          ) : null}
          <div className="absolute -bottom-5 left-3 h-10 w-10 overflow-hidden rounded-full border-2 border-white bg-white shadow-sm">
            {store.logo || store.logoUrl ? (
              <SafeImage
                src={store.logo ?? store.logoUrl ?? ''}
                alt={store.name}
                className="h-full w-full object-cover"
                sizes="40px"
              />
            ) : (
              <span className="flex h-full items-center justify-center text-lg">🏪</span>
            )}
          </div>
        </div>
        <div className="flex flex-1 flex-col px-3 pb-3 pt-7">
          <p className="line-clamp-1 text-sm font-semibold text-[#111827]">{store.name}</p>
          {store.description ? (
            <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">{store.description}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
            {deliveryLabel ? <span>{deliveryLabel}</span> : null}
            {store.productCount > 0 ? <span>{store.productCount} ta</span> : null}
            {rating ? (
              <span className="inline-flex items-center gap-0.5 font-medium text-amber-600">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {rating}
              </span>
            ) : null}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={link}
      className={`flex gap-3 rounded-2xl bg-white p-3 shadow-[0_4px_14px_rgba(17,24,39,0.06)] active:scale-[0.99] ${className}`}
    >
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100">
        {store.logo || store.logoUrl ? (
          <SafeImage
            src={store.logo ?? store.logoUrl ?? ''}
            alt={store.name}
            className="h-full w-full object-cover"
            sizes="56px"
          />
        ) : (
          <span className="flex h-full items-center justify-center text-2xl">🏪</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-[#111827]">{store.name}</p>
        {store.description ? (
          <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{store.description}</p>
        ) : null}
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
          {deliveryLabel ? <span>{deliveryLabel}</span> : null}
          {store.productCount > 0 ? <span>{store.productCount} mahsulot</span> : null}
          {rating ? (
            <span className="inline-flex items-center gap-0.5 font-medium text-amber-600">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {rating}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

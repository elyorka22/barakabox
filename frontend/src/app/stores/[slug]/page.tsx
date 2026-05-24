import { redirect } from 'next/navigation';
import { isMarketplaceEnabled } from '@/lib/marketplace-enabled';

type Props = { params: Promise<{ slug: string }> };

/** Backward-compatible URL → canonical /store/:slug */
export default async function LegacyStorePage({ params }: Props) {
  if (!isMarketplaceEnabled()) {
    redirect('/');
  }
  const { slug } = await params;
  redirect(`/store/${slug}`);
}

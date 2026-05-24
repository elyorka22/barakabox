import { redirect } from 'next/navigation';

type Props = { params: Promise<{ slug: string }> };

/** Backward-compatible URL → canonical /store/:slug */
export default async function LegacyStorePage({ params }: Props) {
  const { slug } = await params;
  redirect(`/store/${slug}`);
}

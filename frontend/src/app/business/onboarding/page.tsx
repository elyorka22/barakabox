'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BusinessOnboardingWizard } from '@/components/business/business-onboarding-wizard';
import { isMarketplaceEnabled } from '@/lib/marketplace-enabled';

export default function BusinessOnboardingPage() {
  const router = useRouter();

  useEffect(() => {
    if (!isMarketplaceEnabled()) router.replace('/business');
  }, [router]);

  if (!isMarketplaceEnabled()) return null;

  return <BusinessOnboardingWizard />;
}

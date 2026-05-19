import { api } from '@/lib/api';

export type HomepageBanner = {
  title: string;
  subtitle: string | null;
  freeDeliveryAmount: number;
  backgroundColor: string;
  isActive: boolean;
};

export async function fetchHomepageBanner(): Promise<HomepageBanner | null> {
  try {
    const data = await api.get<HomepageBanner>('/settings/homepage-banner');
    if (!data.isActive) return null;
    return data;
  } catch {
    return null;
  }
}

export async function fetchHomepageBannerAdmin(token: string): Promise<HomepageBanner | null> {
  try {
    return await api.get<HomepageBanner>('/settings/homepage-banner', token);
  } catch {
    return null;
  }
}

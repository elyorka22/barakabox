import { api } from '@/lib/api';
import type { AdminAnalyticsOverview, AdminAnalyticsPeriod, AdminAnalyticsRealtime } from '@/types/admin-analytics';

export async function fetchAdminAnalyticsOverview(
  period: AdminAnalyticsPeriod,
  token: string,
): Promise<AdminAnalyticsOverview> {
  return api.get<AdminAnalyticsOverview>(`/admin/analytics/overview?period=${period}`, token);
}

export async function fetchAdminAnalyticsRealtime(token: string): Promise<AdminAnalyticsRealtime> {
  return api.get<AdminAnalyticsRealtime>('/admin/analytics/realtime', token);
}

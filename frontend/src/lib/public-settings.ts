import { api } from './api';

export type PublicSettings = {
  supportTelegramUrl: string | null;
  supportTitle: string | null;
};

export const emptyPublicSettings = (): PublicSettings => ({
  supportTelegramUrl: null,
  supportTitle: null,
});

export async function fetchPublicSettings(): Promise<PublicSettings> {
  return api.get<PublicSettings>('/settings/public');
}

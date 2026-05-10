export type PwaAnalyticsDetail = {
  name: string;
  props?: Record<string, string | number | boolean>;
};

export const PWA_STORAGE = {
  androidBannerSoftUntil: "bb_pwa_android_banner_soft_until",
  androidNever: "bb_pwa_android_never",
  engagementCount: "bb_pwa_engagement_count",
  iosLastShownAt: "bb_pwa_ios_last_shown_at",
  iosNever: "bb_pwa_ios_never",
} as const;

export const PWA_ENGAGEMENT_THRESHOLD = 2;
export const PWA_ANDROID_BANNER_DELAY_MS = 4500;
export const PWA_IOS_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000;

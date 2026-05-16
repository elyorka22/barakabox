export type PwaAnalyticsDetail = {
  name: string;
  props?: Record<string, string | number | boolean>;
};

export const PWA_STORAGE = {
  customInstallModalUntil: "bb_pwa_custom_install_modal_until",
  androidBannerSoftUntil: "bb_pwa_android_banner_soft_until",
  androidNever: "bb_pwa_android_never",
  engagementCount: "bb_pwa_engagement_count",
  iosLastShownAt: "bb_pwa_ios_last_shown_at",
  iosNever: "bb_pwa_ios_never",
} as const;

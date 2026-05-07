export type AppEnv = {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: string;
  DATABASE_URL: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  CORS_ORIGIN: string;
  DO_SPACES_ENDPOINT: string;
  DO_SPACES_REGION: string;
  DO_SPACES_BUCKET: string;
  DO_SPACES_KEY: string;
  DO_SPACES_SECRET: string;
  DO_SPACES_PUBLIC_BASE_URL: string;
  DO_SPACES_CDN_URL: string;
  ALERT_WEBHOOK_URL: string;
  UPLOAD_ERROR_RATE_THRESHOLD: string;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHAT_ID: string;
  UPLOAD_CIRCUIT_BREAKER_THRESHOLD: string;
  UPLOAD_CIRCUIT_BREAKER_COOLDOWN_SECONDS: string;
  UPLOAD_CIRCUIT_HALF_OPEN_MAX_REQUESTS: string;
  UPLOAD_MONTHLY_STORAGE_LIMIT_BYTES: string;
  UPLOAD_BLOCK_ON_COST_LIMIT: string;
  SPACES_UPLOAD_TIMEOUT_MS: string;
};

export function validateEnv(config: Record<string, unknown>): AppEnv {
  const nodeEnv = String(config.NODE_ENV ?? 'development') as AppEnv['NODE_ENV'];
  const port = String(config.PORT ?? '4000');
  const databaseUrl = String(config.DATABASE_URL ?? '');
  const accessSecret = String(config.JWT_ACCESS_SECRET ?? '');
  const refreshSecret = String(config.JWT_REFRESH_SECRET ?? '');
  const corsOrigin = String(config.CORS_ORIGIN ?? '*');
  const spacesEndpoint = String(config.DO_SPACES_ENDPOINT ?? config.SPACES_ENDPOINT ?? '');
  const spacesRegion = String(config.DO_SPACES_REGION ?? config.SPACES_REGION ?? '');
  const spacesBucket = String(config.DO_SPACES_BUCKET ?? config.SPACES_BUCKET ?? '');
  const spacesKey = String(config.DO_SPACES_KEY ?? config.SPACES_KEY ?? '');
  const spacesSecret = String(config.DO_SPACES_SECRET ?? config.SPACES_SECRET ?? '');
  const spacesPublicBaseUrl = String(
    config.DO_SPACES_PUBLIC_BASE_URL ??
      config.SPACES_PUBLIC_BASE_URL ??
      (spacesBucket && spacesRegion ? `https://${spacesBucket}.${spacesRegion}.digitaloceanspaces.com` : ''),
  );
  const spacesCdnUrl = String(config.DO_SPACES_CDN_URL ?? config.SPACES_CDN_URL ?? '');
  const alertWebhookUrl = String(config.ALERT_WEBHOOK_URL ?? '');
  const uploadErrorRateThreshold = String(config.UPLOAD_ERROR_RATE_THRESHOLD ?? '10');
  const telegramBotToken = String(config.TELEGRAM_BOT_TOKEN ?? '');
  const telegramChatId = String(config.TELEGRAM_CHAT_ID ?? '');
  const uploadCircuitBreakerThreshold = String(config.UPLOAD_CIRCUIT_BREAKER_THRESHOLD ?? '5');
  const uploadCircuitBreakerCooldownSeconds = String(config.UPLOAD_CIRCUIT_BREAKER_COOLDOWN_SECONDS ?? '60');
  const uploadCircuitHalfOpenMaxRequests = String(config.UPLOAD_CIRCUIT_HALF_OPEN_MAX_REQUESTS ?? '1');
  const uploadMonthlyStorageLimitBytes = String(config.UPLOAD_MONTHLY_STORAGE_LIMIT_BYTES ?? '5368709120');
  const uploadBlockOnCostLimit = String(config.UPLOAD_BLOCK_ON_COST_LIMIT ?? 'true');
  const spacesUploadTimeoutMs = String(config.SPACES_UPLOAD_TIMEOUT_MS ?? '10000');

  if (!databaseUrl.startsWith('postgresql://')) {
    throw new Error('DATABASE_URL must be a valid postgresql URL');
  }
  if (!accessSecret || accessSecret.length < 16) {
    throw new Error('JWT_ACCESS_SECRET must be at least 16 characters');
  }
  if (!refreshSecret || refreshSecret.length < 16) {
    throw new Error('JWT_REFRESH_SECRET must be at least 16 characters');
  }
  if (nodeEnv === 'production' && databaseUrl.includes('localhost')) {
    throw new Error('DATABASE_URL must not use localhost in production');
  }
  if (nodeEnv === 'production' && corsOrigin.includes('localhost')) {
    throw new Error('CORS_ORIGIN must not use localhost in production');
  }
  if (!spacesEndpoint.startsWith('https://')) {
    throw new Error('DO_SPACES_ENDPOINT/SPACES_ENDPOINT must be a valid https URL');
  }
  if (!spacesRegion) {
    throw new Error('DO_SPACES_REGION/SPACES_REGION is required');
  }
  if (!spacesBucket) {
    throw new Error('DO_SPACES_BUCKET/SPACES_BUCKET is required');
  }
  if (!spacesKey) {
    throw new Error('DO_SPACES_KEY/SPACES_KEY is required');
  }
  if (!spacesSecret) {
    throw new Error('DO_SPACES_SECRET/SPACES_SECRET is required');
  }
  if (!spacesPublicBaseUrl.startsWith('https://')) {
    throw new Error('DO_SPACES_PUBLIC_BASE_URL/SPACES_PUBLIC_BASE_URL must be a valid https URL');
  }
  if (spacesCdnUrl && !spacesCdnUrl.startsWith('https://')) {
    throw new Error('DO_SPACES_CDN_URL/SPACES_CDN_URL must be a valid https URL when provided');
  }
  if (!/^\d+$/.test(spacesUploadTimeoutMs) || Number(spacesUploadTimeoutMs) < 1000) {
    throw new Error('SPACES_UPLOAD_TIMEOUT_MS must be a number >= 1000');
  }
  if (alertWebhookUrl && !alertWebhookUrl.startsWith('https://')) {
    throw new Error('ALERT_WEBHOOK_URL must be a valid https URL when provided');
  }

  return {
    NODE_ENV: nodeEnv,
    PORT: port,
    DATABASE_URL: databaseUrl,
    JWT_ACCESS_SECRET: accessSecret,
    JWT_REFRESH_SECRET: refreshSecret,
    CORS_ORIGIN: corsOrigin,
    DO_SPACES_ENDPOINT: spacesEndpoint,
    DO_SPACES_REGION: spacesRegion,
    DO_SPACES_BUCKET: spacesBucket,
    DO_SPACES_KEY: spacesKey,
    DO_SPACES_SECRET: spacesSecret,
    DO_SPACES_PUBLIC_BASE_URL: spacesPublicBaseUrl,
    DO_SPACES_CDN_URL: spacesCdnUrl,
    ALERT_WEBHOOK_URL: alertWebhookUrl,
    UPLOAD_ERROR_RATE_THRESHOLD: uploadErrorRateThreshold,
    TELEGRAM_BOT_TOKEN: telegramBotToken,
    TELEGRAM_CHAT_ID: telegramChatId,
    UPLOAD_CIRCUIT_BREAKER_THRESHOLD: uploadCircuitBreakerThreshold,
    UPLOAD_CIRCUIT_BREAKER_COOLDOWN_SECONDS: uploadCircuitBreakerCooldownSeconds,
    UPLOAD_CIRCUIT_HALF_OPEN_MAX_REQUESTS: uploadCircuitHalfOpenMaxRequests,
    UPLOAD_MONTHLY_STORAGE_LIMIT_BYTES: uploadMonthlyStorageLimitBytes,
    UPLOAD_BLOCK_ON_COST_LIMIT: uploadBlockOnCostLimit,
    SPACES_UPLOAD_TIMEOUT_MS: spacesUploadTimeoutMs,
  };
}

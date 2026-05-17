export type AppEnv = {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: string;
  DATABASE_URL: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  CORS_ORIGIN: string;
  REDIS_HOST: string;
  REDIS_PORT: string;
  REDIS_PASSWORD?: string;
  SPACES_ENDPOINT: string;
  SPACES_REGION: string;
  SPACES_BUCKET: string;
  SPACES_KEY: string;
  SPACES_SECRET: string;
  SPACES_CDN_URL?: string;
  ALERT_WEBHOOK_URL: string;
  UPLOAD_ERROR_RATE_THRESHOLD: string;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHAT_ID: string;
  UPLOAD_CIRCUIT_BREAKER_THRESHOLD: string;
  UPLOAD_CIRCUIT_BREAKER_COOLDOWN_SECONDS: string;
  UPLOAD_CIRCUIT_HALF_OPEN_MAX_REQUESTS: string;
  UPLOAD_MONTHLY_STORAGE_LIMIT_BYTES: string;
  UPLOAD_BLOCK_ON_COST_LIMIT: string;
  UPLOAD_ORPHAN_CLEANUP_ENABLED: string;
  UPLOAD_STARTUP_STRICT: string;
};

function normalizeHttpsUrl(input: string): string {
  const value = input.trim();
  if (!value) return value;
  if (value.startsWith('https://')) return value.replace(/\/$/, '');
  if (value.startsWith('http://')) return `https://${value.slice('http://'.length)}`.replace(/\/$/, '');
  return `https://${value}`.replace(/\/$/, '');
}

export function validateEnv(config: Record<string, unknown>): AppEnv {
  const nodeEnv = String(config.NODE_ENV ?? 'development') as AppEnv['NODE_ENV'];
  const port = String(config.PORT ?? '4000');
  const databaseUrl = String(config.DATABASE_URL ?? '');
  const accessSecret = String(config.JWT_ACCESS_SECRET ?? '');
  const refreshSecret = String(config.JWT_REFRESH_SECRET ?? '');
  const corsOrigin = String(config.CORS_ORIGIN ?? '*');
  const redisHost = String(config.REDIS_HOST ?? '127.0.0.1');
  const redisPort = String(config.REDIS_PORT ?? '6379');
  const redisPassword = String(config.REDIS_PASSWORD ?? '');
  const spacesEndpoint = normalizeHttpsUrl(String(config.SPACES_ENDPOINT ?? ''));
  const spacesRegion = String(config.SPACES_REGION ?? '');
  const spacesBucket = String(config.SPACES_BUCKET ?? '');
  const spacesKey = String(config.SPACES_KEY ?? '');
  const spacesSecret = String(config.SPACES_SECRET ?? '');
  const spacesCdnUrl = normalizeHttpsUrl(String(config.SPACES_CDN_URL ?? ''));
  const alertWebhookUrl = String(config.ALERT_WEBHOOK_URL ?? '');
  const uploadErrorRateThreshold = String(config.UPLOAD_ERROR_RATE_THRESHOLD ?? '10');
  const telegramBotToken = String(config.TELEGRAM_BOT_TOKEN ?? '');
  const telegramChatId = String(config.TELEGRAM_CHAT_ID ?? '');
  const uploadCircuitBreakerThreshold = String(config.UPLOAD_CIRCUIT_BREAKER_THRESHOLD ?? '5');
  const uploadCircuitBreakerCooldownSeconds = String(config.UPLOAD_CIRCUIT_BREAKER_COOLDOWN_SECONDS ?? '60');
  const uploadCircuitHalfOpenMaxRequests = String(config.UPLOAD_CIRCUIT_HALF_OPEN_MAX_REQUESTS ?? '1');
  const uploadMonthlyStorageLimitBytes = String(config.UPLOAD_MONTHLY_STORAGE_LIMIT_BYTES ?? '5368709120');
  const uploadBlockOnCostLimit = String(config.UPLOAD_BLOCK_ON_COST_LIMIT ?? 'true');
  const uploadOrphanCleanupEnabled = String(config.UPLOAD_ORPHAN_CLEANUP_ENABLED ?? 'false');
  const uploadStartupStrict = String(config.UPLOAD_STARTUP_STRICT ?? 'false');

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
  if (!redisHost) {
    throw new Error('REDIS_HOST is required');
  }
  if (!/^\d+$/.test(redisPort)) {
    throw new Error('REDIS_PORT must be a valid integer');
  }
  if (!spacesEndpoint) {
    throw new Error('SPACES_ENDPOINT is required');
  }
  if (!spacesEndpoint.startsWith('https://')) {
    throw new Error('SPACES_ENDPOINT must be a valid https URL');
  }
  if (!spacesRegion) {
    throw new Error('SPACES_REGION is required');
  }
  if (!spacesBucket) {
    throw new Error('SPACES_BUCKET is required');
  }
  if (!spacesKey) {
    throw new Error('SPACES_KEY is required');
  }
  if (!spacesSecret) {
    throw new Error('SPACES_SECRET is required');
  }
  if (spacesCdnUrl && !spacesCdnUrl.startsWith('https://')) {
    throw new Error('SPACES_CDN_URL must be a valid https URL when provided');
  }
  if (nodeEnv === 'production' && spacesCdnUrl.includes('localhost')) {
    throw new Error('SPACES_CDN_URL must not use localhost in production');
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
    REDIS_HOST: redisHost,
    REDIS_PORT: redisPort,
    REDIS_PASSWORD: redisPassword,
    SPACES_ENDPOINT: spacesEndpoint,
    SPACES_REGION: spacesRegion,
    SPACES_BUCKET: spacesBucket,
    SPACES_KEY: spacesKey,
    SPACES_SECRET: spacesSecret,
    SPACES_CDN_URL: spacesCdnUrl,
    ALERT_WEBHOOK_URL: alertWebhookUrl,
    UPLOAD_ERROR_RATE_THRESHOLD: uploadErrorRateThreshold,
    TELEGRAM_BOT_TOKEN: telegramBotToken,
    TELEGRAM_CHAT_ID: telegramChatId,
    UPLOAD_CIRCUIT_BREAKER_THRESHOLD: uploadCircuitBreakerThreshold,
    UPLOAD_CIRCUIT_BREAKER_COOLDOWN_SECONDS: uploadCircuitBreakerCooldownSeconds,
    UPLOAD_CIRCUIT_HALF_OPEN_MAX_REQUESTS: uploadCircuitHalfOpenMaxRequests,
    UPLOAD_MONTHLY_STORAGE_LIMIT_BYTES: uploadMonthlyStorageLimitBytes,
    UPLOAD_BLOCK_ON_COST_LIMIT: uploadBlockOnCostLimit,
    UPLOAD_ORPHAN_CLEANUP_ENABLED: uploadOrphanCleanupEnabled,
    UPLOAD_STARTUP_STRICT: uploadStartupStrict,
  };
}

export type AppEnv = {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: string;
  DATABASE_URL: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  CORS_ORIGIN: string;
};

export function validateEnv(config: Record<string, unknown>): AppEnv {
  const nodeEnv = String(config.NODE_ENV ?? 'development') as AppEnv['NODE_ENV'];
  const port = String(config.PORT ?? '4000');
  const databaseUrl = String(config.DATABASE_URL ?? '');
  const accessSecret = String(config.JWT_ACCESS_SECRET ?? '');
  const refreshSecret = String(config.JWT_REFRESH_SECRET ?? '');
  const corsOrigin = String(config.CORS_ORIGIN ?? '*');

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

  return {
    NODE_ENV: nodeEnv,
    PORT: port,
    DATABASE_URL: databaseUrl,
    JWT_ACCESS_SECRET: accessSecret,
    JWT_REFRESH_SECRET: refreshSecret,
    CORS_ORIGIN: corsOrigin,
  };
}

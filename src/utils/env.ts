import type { SignOptions } from 'jsonwebtoken';

const required = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'DB_HOST',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'CORS_ORIGIN',
] as const;

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  jwtSecret:        process.env.JWT_SECRET!,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET!,
  jwtExpiresIn:     (process.env.JWT_EXPIRES_IN  ?? '15m') as SignOptions['expiresIn'],
  jwtRefreshExpiry: (process.env.JWT_REFRESH_EXPIRY ?? '7d') as SignOptions['expiresIn'],
  corsOrigin:       process.env.CORS_ORIGIN!,
  port:             Number(process.env.PORT) || 3000,
};
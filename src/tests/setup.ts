// Sets env vars before env.ts throws
process.env.JWT_SECRET         = 'test-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.JWT_EXPIRES_IN     = '15m';
process.env.JWT_REFRESH_EXPIRY = '7d';
process.env.DB_HOST            = 'localhost';
process.env.DB_NAME            = 'test';
process.env.DB_USER            = 'test';
process.env.DB_PASSWORD        = 'test';
process.env.CORS_ORIGIN        = 'http://localhost:3000';
import type { JWTPayload } from './auth-dtos';

declare global {
  namespace Express {
    interface Request {
      // ✅ Typed as your own payload — no narrowing needed in handlers
      user?: JWTPayload;
    }
  }
}

export { }
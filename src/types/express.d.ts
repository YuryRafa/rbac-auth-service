import type { JWTPayload } from './authDtos';

declare global {
  namespace Express {
    interface Request {
      // ✅ Typed as your own payload — no narrowing needed in handlers
      user?: JWTPayload;
    }
  }
}

export {}
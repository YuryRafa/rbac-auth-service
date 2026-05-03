import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { PublicUser, LoginResponse } from '../types/auth-dtos';

// ── Hoist mock so it's available inside vi.mock factories ────────────────────

const mockAuthService = vi.hoisted(() => ({
  register: vi.fn(),
  login:    vi.fn(),
  refresh:  vi.fn(),
  logout:   vi.fn(),
}));

vi.mock('../modules/auth/authService', () => ({
  AuthService: vi.fn().mockImplementation(function() { return mockAuthService; }),
}));

vi.mock('../database/queries/userQueries', () => ({
  UserQueries: vi.fn().mockImplementation(function() { return {}; }),
}));

vi.mock('../database/queries/tokenQueries', () => ({
  TokenQueries: vi.fn().mockImplementation(function() { return {}; }),
}));
let register: Awaited<typeof import('../modules/auth/auth-controller')>['register'];
let login:    Awaited<typeof import('../modules/auth/auth-controller')>['login'];
let refresh:  Awaited<typeof import('../modules/auth/auth-controller')>['refresh'];
let logout:   Awaited<typeof import('../modules/auth/auth-controller')>['logout'];

beforeAll(async () => {
  const controller = await import('../modules/auth/auth-controller');
  register = controller.register;
  login    = controller.login;
  refresh  = controller.refresh;
  logout   = controller.logout;
});

// ── Helpers ──────────────────────────────────────────────────────────────────

const makeRes = (): Response => {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json   = vi.fn().mockReturnValue(res);
  return res;
};

const next: NextFunction = vi.fn();

const mockPublicUser: PublicUser = {
  id:         'user-123',
  email:      'test@example.com',
  role:       'user',
  created_at: new Date('2024-01-01'),
};

const mockLoginResponse: LoginResponse = {
  accessToken:  'access-token',
  refreshToken: 'refresh-token',
  user:         mockPublicUser,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AuthController', () => {
  beforeEach(() => vi.clearAllMocks());

  // ── register ───────────────────────────────────────────────────────────────

  describe('register', () => {
    it('returns 201 with the created user', async () => {
      mockAuthService.register.mockResolvedValue(mockPublicUser);
      const req = { body: { email: 'test@example.com', password: 'password123' } } as Request;
      const res = makeRes();

      await register(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockPublicUser });
    });

    it('calls next with 422 on invalid body', async () => {
      const req = { body: { email: 'not-an-email', password: '123' } } as Request;
      const res = makeRes();

      await register(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 422 }));
      expect(mockAuthService.register).not.toHaveBeenCalled();
    });

    it('calls next when authService.register throws', async () => {
      mockAuthService.register.mockRejectedValue(new Error('db error'));
      const req = { body: { email: 'test@example.com', password: 'password123' } } as Request;
      const res = makeRes();

      await register(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  // ── login ──────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('returns 200 with tokens and user', async () => {
      mockAuthService.login.mockResolvedValue(mockLoginResponse);
      const req = { body: { email: 'test@example.com', password: 'password123' } } as Request;
      const res = makeRes();

      await login(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockLoginResponse });
    });

    it('calls next with 422 on invalid body', async () => {
      const req = { body: { email: 'not-an-email' } } as Request;
      const res = makeRes();

      await login(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 422 }));
      expect(mockAuthService.login).not.toHaveBeenCalled();
    });

    it('calls next when authService.login throws', async () => {
      mockAuthService.login.mockRejectedValue(new Error('invalid credentials'));
      const req = { body: { email: 'test@example.com', password: 'password123' } } as Request;
      const res = makeRes();

      await login(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  // ── refresh ────────────────────────────────────────────────────────────────

  describe('refresh', () => {
    it('returns 200 with a new accessToken', async () => {
      mockAuthService.refresh.mockResolvedValue({ accessToken: 'new-access-token' });
      const req = { body: { refreshToken: 'raw-refresh-token' } } as Request;
      const res = makeRes();

      await refresh(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: { accessToken: 'new-access-token' } });
    });

    it('calls next with 400 when refreshToken is missing', async () => {
      const req = { body: {} } as Request;
      const res = makeRes();

      await refresh(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
      expect(mockAuthService.refresh).not.toHaveBeenCalled();
    });

    it('calls next when authService.refresh throws', async () => {
      mockAuthService.refresh.mockRejectedValue(new Error('expired'));
      const req = { body: { refreshToken: 'expired-token' } } as Request;
      const res = makeRes();

      await refresh(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  // ── logout ─────────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('returns 200 and calls logout when token is provided', async () => {
      mockAuthService.logout.mockResolvedValue(undefined);
      const req = { body: { refreshToken: 'raw-refresh-token' } } as Request;
      const res = makeRes();

      await logout(req, res, next);

      expect(mockAuthService.logout).toHaveBeenCalledWith('raw-refresh-token');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    it('returns 200 and skips logout when no token is provided', async () => {
      const req = { body: {} } as Request;
      const res = makeRes();

      await logout(req, res, next);

      expect(mockAuthService.logout).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('calls next when authService.logout throws', async () => {
      mockAuthService.logout.mockRejectedValue(new Error('db error'));
      const req = { body: { refreshToken: 'raw-refresh-token' } } as Request;
      const res = makeRes();

      await logout(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
import { describe, it, expect, vi } from 'vitest';
import { AuthService } from '../modules/auth/auth-service';
import { InterfaceUserRepository } from '../types/user-repository';
import { InterfaceTokenRepository } from '../types/token-repository';
import { UserRecord, PublicUser } from '../types/auth-dtos';

// ── Fixtures ────────────────────────────────────────────────────────────────

const mockUserRecord: UserRecord = {
  id: 'user-123',
  email: 'test@example.com',
  password_hash: '$2b$12$validhashhere000000000000000000000000000000000000000000',
  role: 'user',
  created_at: new Date('2024-01-01'),
};

const mockPublicUser: PublicUser = {
  id: 'user-123',
  email: 'test@example.com',
  role: 'user',
  created_at: new Date('2024-01-01'),
};

// ── Mock factories ───────────────────────────────────────────────────────────

const makeUserRepo = (overrides?: Partial<InterfaceUserRepository>): InterfaceUserRepository => ({
  findUserByEmail: vi.fn().mockResolvedValue(null),
  findUserById: vi.fn().mockResolvedValue(null),
  insertUser: vi.fn().mockResolvedValue(mockPublicUser),
  updatePassword: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

const makeTokenRepo = (overrides?: Partial<InterfaceTokenRepository>): InterfaceTokenRepository => ({
  insertRefreshToken: vi.fn().mockResolvedValue(undefined),
  findToken: vi.fn().mockResolvedValue(null),
  deleteToken: vi.fn().mockResolvedValue(undefined),
  deleteExpired: vi.fn().mockResolvedValue(undefined),
  deleteAllUserTokens: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('AuthService', () => {

  // ── register ──────────────────────────────────────────────────────────────

  describe('register', () => {
    it('creates a user and returns a PublicUser', async () => {
      const userRepo = makeUserRepo();
      const tokenRepo = makeTokenRepo();
      const sut = new AuthService(userRepo, tokenRepo);

      const result = await sut.register({ email: 'test@example.com', password: 'password123' });

      expect(userRepo.findUserByEmail).toHaveBeenCalledWith('test@example.com');
      expect(userRepo.insertUser).toHaveBeenCalled();
      expect(result).toEqual(mockPublicUser);
    });

    it('normalizes email to lowercase', async () => {
      const userRepo = makeUserRepo();
      const sut = new AuthService(userRepo, makeTokenRepo());

      await sut.register({ email: 'TEST@EXAMPLE.COM', password: 'password123' });

      expect(userRepo.findUserByEmail).toHaveBeenCalledWith('test@example.com');
      expect(userRepo.insertUser).toHaveBeenCalledWith(
        'test@example.com',
        expect.any(String),
      );
    });

    it('throws 409 when email is already registered', async () => {
      const userRepo = makeUserRepo({
        findUserByEmail: vi.fn().mockResolvedValue(mockUserRecord),
      });
      const sut = new AuthService(userRepo, makeTokenRepo());

      await expect(
        sut.register({ email: 'test@example.com', password: 'password123' })
      ).rejects.toMatchObject({ statusCode: 409 });
    });

    it('throws 422 when password exceeds 72 characters', async () => {
      const sut = new AuthService(makeUserRepo(), makeTokenRepo());

      await expect(
        sut.register({ email: 'test@example.com', password: 'a'.repeat(73) })
      ).rejects.toMatchObject({ statusCode: 422 });
    });
  });

  // ── login ─────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('returns accessToken, refreshToken and PublicUser on valid credentials', async () => {
      // Use a real bcrypt hash for 'password123'
      const bcrypt = await import('bcrypt');
      const hash = await bcrypt.hash('password123', 12);

      const userRepo = makeUserRepo({
        findUserByEmail: vi.fn().mockResolvedValue({ ...mockUserRecord, password_hash: hash }),
      });
      const sut = new AuthService(userRepo, makeTokenRepo());

      const result = await sut.login({ email: 'test@example.com', password: 'password123' });

      expect(result).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        user: mockPublicUser,
      });
    });

    it('throws 401 on wrong password', async () => {
      const bcrypt = await import('bcrypt');
      const hash = await bcrypt.hash('correctpassword', 12);

      const userRepo = makeUserRepo({
        findUserByEmail: vi.fn().mockResolvedValue({ ...mockUserRecord, password_hash: hash }),
      });
      const sut = new AuthService(userRepo, makeTokenRepo());

      await expect(
        sut.login({ email: 'test@example.com', password: 'wrongpassword' })
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('throws 401 when user does not exist (no timing leak)', async () => {
      const sut = new AuthService(makeUserRepo(), makeTokenRepo());

      await expect(
        sut.login({ email: 'ghost@example.com', password: 'anypassword' })
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('stores a hashed refresh token — never the raw value', async () => {
      const bcrypt = await import('bcrypt');
      const hash = await bcrypt.hash('password123', 12);

      const tokenRepo = makeTokenRepo();
      const userRepo = makeUserRepo({
        findUserByEmail: vi.fn().mockResolvedValue({ ...mockUserRecord, password_hash: hash }),
      });
      const sut = new AuthService(userRepo, tokenRepo);

      const { refreshToken } = await sut.login({ email: 'test@example.com', password: 'password123' });

      expect(tokenRepo.insertRefreshToken).toHaveBeenCalledWith(
        'user-123',
        expect.not.stringContaining(refreshToken), // hash ≠ raw token
        expect.any(Date),
      );
    });
  });

  // ── refresh ───────────────────────────────────────────────────────────────

  describe('refresh', () => {
    it('returns a new accessToken for a valid refresh token', async () => {
      const futureDate = new Date(Date.now() + 10_000);
      const tokenRepo = makeTokenRepo({
        findToken: vi.fn().mockResolvedValue({
          id: 'token-123',
          user_id: 'user-123',
          token_hash: 'somehash',
          expires_at: futureDate,
          created_at: new Date(),
        }),
      });
      const userRepo = makeUserRepo({
        findUserById: vi.fn().mockResolvedValue(mockUserRecord),
      });
      const sut = new AuthService(userRepo, tokenRepo);

      const result = await sut.refresh('raw-token-value');

      expect(result).toMatchObject({ accessToken: expect.any(String) });
      expect(tokenRepo.deleteToken).toHaveBeenCalledOnce(); // rotation happened
    });

    it('throws 401 when token is not found', async () => {
      const sut = new AuthService(makeUserRepo(), makeTokenRepo());

      await expect(sut.refresh('invalid-token')).rejects.toMatchObject({ statusCode: 401 });
    });

    it('throws 401 when token is expired', async () => {
      const pastDate = new Date(Date.now() - 10_000);
      const tokenRepo = makeTokenRepo({
        findToken: vi.fn().mockResolvedValue({
          id: 'token-123',
          user_id: 'user-123',
          token_hash: 'somehash',
          expires_at: pastDate,
          created_at: new Date(),
        }),
      });
      const sut = new AuthService(makeUserRepo(), tokenRepo);

      await expect(sut.refresh('expired-token')).rejects.toMatchObject({ statusCode: 401 });
    });

    it('throws 404 when user no longer exists', async () => {
      const futureDate = new Date(Date.now() + 10_000);
      const tokenRepo = makeTokenRepo({
        findToken: vi.fn().mockResolvedValue({
          id: 'token-123',
          user_id: 'deleted-user',
          token_hash: 'somehash',
          expires_at: futureDate,
          created_at: new Date(),
        }),
      });
      const sut = new AuthService(makeUserRepo(), tokenRepo); // findUserById returns null

      await expect(sut.refresh('raw-token')).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  // ── logout ────────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('deletes the hashed token', async () => {
      const tokenRepo = makeTokenRepo();
      const sut = new AuthService(makeUserRepo(), tokenRepo);

      await sut.logout('raw-token-value');

      expect(tokenRepo.deleteToken).toHaveBeenCalledOnce();
      // Must have received the SHA-256 hash, not the raw value
      expect(tokenRepo.deleteToken).not.toHaveBeenCalledWith('raw-token-value');
    });
  });
});
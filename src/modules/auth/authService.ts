import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { LoginDTO, RegisterDTO, PublicUser, LoginResponse, JWTPayload, toPublicUser } from "../../types/auth-dtos";
import { InterfaceUserRepository } from "../../types/user-repository";
import { InterfaceTokenRepository } from "../../types/token-repository";
import { AppError } from "../../utils/app-error";
import { env } from "../../utils/env";

const BCRYPT_ROUNDS = 12;
const MAX_PW_LENGTH = 72;
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DUMMY_HASH = '$2b$12$invalidhashpadding000000000000000000000000000000000000000';

class AuthService {
  constructor(
    private readonly userRepo: InterfaceUserRepository,
    private readonly tokenRepo: InterfaceTokenRepository,
  ) { }

  async register({ email, password }: RegisterDTO): Promise<PublicUser> {
    if (password.length > MAX_PW_LENGTH) {
      throw new AppError("Password too long", 422, true);
    }
    const existing = await this.userRepo.findUserByEmail(email.trim().toLowerCase());
    if (existing) {
      throw new AppError("Email already registered", 409, true);
    }
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    return this.userRepo.insertUser(email.trim().toLowerCase(), passwordHash);
  }

  async login({ email, password }: LoginDTO): Promise<LoginResponse> {
    const user = await this.userRepo.findUserByEmail(email.trim().toLowerCase());
    const valid = user
      ? await bcrypt.compare(password, user.password_hash)
      : await bcrypt.compare(password, DUMMY_HASH);

    if (!user || !valid) {
      throw new AppError("Invalid credentials", 401, true);
    }

    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const accessToken = jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

    const rawRefreshToken = crypto.randomBytes(64).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);

    await this.tokenRepo.insertRefreshToken(user.id, tokenHash, expiresAt);

    return { accessToken, refreshToken: rawRefreshToken, user: toPublicUser(user) };
  }

  async refresh(rawToken: string): Promise<{ accessToken: string }> {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const record = await this.tokenRepo.findToken(tokenHash);

    if (!record || record.expires_at < new Date()) {
      throw new AppError("Invalid or expired refresh token", 401, true);
    }

    await this.tokenRepo.deleteToken(tokenHash);
    const user = await this.userRepo.findUserById(record.user_id);
    if (!user) throw new AppError("User not found", 404, true);

    const accessToken = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn }
    );
    return { accessToken };
  }

  async logout(rawToken: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    await this.tokenRepo.deleteToken(tokenHash);
  }
}

export { AuthService };
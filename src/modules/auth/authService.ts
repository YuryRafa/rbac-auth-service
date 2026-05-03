import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { LoginDTO, RegisterDTO, PublicUser, LoginResponse, JWTPayload, toPublicUser } from "../../types/authDtos";
import { UserQueries } from "../../database/queries/userQueries";
import { TokenQueries } from "../../database/queries/tokenQueries";
import { AppError } from "../../utils/appError";
import { env } from "../../utils/env";

const userQueries  = new UserQueries();
const tokenQueries = new TokenQueries();



const BCRYPT_ROUNDS    = 12;
const MAX_PW_LENGTH    = 72;
const REFRESH_TTL_MS   = 7 * 24 * 60 * 60 * 1000; // 7 days
const DUMMY_HASH       = '$2b$12$invalidhashpadding000000000000000000000000000000000000000';

class AuthService {

  async register({ email, password }: RegisterDTO): Promise<PublicUser> {
    
    if (password.length > MAX_PW_LENGTH) {
      throw new AppError("Password too long", 422, true);
    }

    const existing = await userQueries.findUserByEmail(email.trim().toLowerCase());
    if (existing) {
      throw new AppError("Email already registered", 409, true);
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    return userQueries.insertUser(email.trim().toLowerCase(), passwordHash);
  }

  async login({ email, password }: LoginDTO): Promise<LoginResponse> {
    const user = await userQueries.findUserByEmail(email.trim().toLowerCase());

    // Always run bcrypt — prevents timing-based user enumeration
    const valid = user
      ? await bcrypt.compare(password, user.password_hash)
      : await bcrypt.compare(password, DUMMY_HASH);

    if (!user || !valid) {
      throw new AppError("Invalid credentials", 401, true);
    }

    // Access token
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      sub:   user.id,
      email: user.email,
      role:  user.role,
    };
    const accessToken = jwt.sign(payload, env.jwtSecret, {
      expiresIn: env.jwtExpiresIn,
    });

    // Refresh token — store only the hash
    const rawRefreshToken = crypto.randomBytes(64).toString('hex');
    const tokenHash       = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
    const expiresAt       = new Date(Date.now() + REFRESH_TTL_MS);

    await tokenQueries.insertRefreshToken(user.id, tokenHash, expiresAt);

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user:         toPublicUser(user),
    };
  }

  async refresh(rawToken: string): Promise<{ accessToken: string }> {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const record    = await tokenQueries.findToken(tokenHash);

    if (!record || record.expires_at < new Date()) {
      throw new AppError("Invalid or expired refresh token", 401, true);
    }

    // Rotate — delete old, issue new access token
    await tokenQueries.deleteToken(tokenHash);

    const user = await userQueries.findUserById(record.user_id);
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
    await tokenQueries.deleteToken(tokenHash);
  }
}

export { AuthService };
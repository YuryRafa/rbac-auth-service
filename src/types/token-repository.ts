export interface TokenRecord {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  created_at: Date;
}

export interface InterfaceTokenRepository {
  insertRefreshToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  findToken(tokenHash: string): Promise<TokenRecord | null>;
  deleteToken(tokenHash: string): Promise<void>;
  deleteExpired(): Promise<void>;
  deleteAllUserTokens(userId: string): Promise<void>;
}
import pool from '../connection';
import { PublicUser, UserRecord } from '../../types/auth-dtos';
import { InterfaceUserRepository } from '../../types/user-repository'

class UserQueries implements InterfaceUserRepository {
  findUserByEmail = async (email: string): Promise<UserRecord | null> => {
    const { rows } = await pool.query<UserRecord>(
      `SELECT id, email, password_hash, role, created_at
       FROM users WHERE email = $1`,
      [email]
    );
    return rows[0] ?? null;
  };

  insertUser = async (
    email: string,
    passwordHash: string,
    role = 'user'
  ): Promise<PublicUser> => {
    const { rows } = await pool.query<PublicUser>(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING id, email, role, created_at`,
      [email, passwordHash, role]
    );
    if (!rows[0]) throw new Error('Insert failed — no row returned');
    return rows[0];
  };

  findUserById = async (id: string): Promise<UserRecord | null> => {
    const { rows } = await pool.query<UserRecord>(
      `SELECT id, email, password_hash, role, created_at
       FROM users WHERE id = $1`,
      [id]
    );
    return rows[0] ?? null;
  };

  findAllUsers = async (): Promise<UserRecord[]> => {
    const { rows } = await pool.query<UserRecord>(
      `SELECT id, email, role, created_at FROM users`

    );
    return rows;
  };


  updatePassword = async (id: string, password_hash: string) => {
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() where id = $2',
      [password_hash, id]
    );
  }
}

export { UserQueries };
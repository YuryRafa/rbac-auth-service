import pool from "../connection";

interface TokenRecord {
    id: string;
    user_id: string;
    token_hash: string;
    expires_at: Date;
    created_at: Date;
}

class TokenQueries {
    insertRefreshToken = async (
        userId: string, 
        tokenHash: string, 
        expiresAt: Date
    ): Promise<void> => {
        await pool.query(
            `INSERT INTO refresh_tokens (user_id, token_hash, expires_At)
            VALUES ($1,$2,$3)
            `,
            [userId, tokenHash, expiresAt]
        );
    };

    findToken = async (tokenHash: string): Promise<TokenRecord | null> => {
        const {rows} = await pool.query<TokenRecord>(
            `SELECT * FROM refresh_tokens WHERE token_hash = $1`,
            [tokenHash]

        );
        return rows[0] ?? null;
    };


    deleteToken = async (tokenHash: string): Promise<void> => {
        await pool.query(
            `DELETE FROM refresh_tokens WHERE token_hash = $1`,
            [tokenHash]


        );
    };

    deleteExpired = async (): Promise<void> => {
        await pool.query(
            `DELETE FROM refresh_tokens WHERE expires_at < NOW()`
        );
    };

};

export {TokenQueries};
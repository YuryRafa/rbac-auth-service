export type LoginDTO = {
    email: string;
    password: string;
}

export type RegisterDTO = {
    email: string;
    password: string;
}

export interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  role: string;
  created_at: Date;
}
export interface PublicUser {
  id: string;
  email: string;
  role: string;
  created_at: Date;
}

export type LoginResponse = {
    user: PublicUser;
    accessToken: string;
    refreshToken: string;
}

export interface JWTPayload {
  sub:   string; // user id
  email: string;
  role:  string;
  iat:   number;
  exp:   number;
}


export function toPublicUser(user: UserRecord): PublicUser {
    return {
        id: user.id,
        email: user.email,
        role: user.role,
        created_at: user.created_at
    };
};


# rbac-auth-server

JWT authentication server with role-based access control, built with Node.js, Express, TypeScript, and PostgreSQL.

---

## Features

- Register and login with email + password
- Access tokens (JWT, short-lived) and refresh tokens (long-lived, stored as SHA-256 hash)
- Token rotation on refresh, invalidation on logout
- Role-based access control — `user` and `admin` roles baked into the JWT payload
- `requireRole` middleware for protecting routes by role
- Zod input validation on all auth endpoints
- Timing-safe login (constant-time bcrypt prevents user enumeration)
- Consistent error envelope on all responses
- Helmet, CORS, and environment variable validation at startup

---

## Tech stack

- **Runtime** — Node.js 18+ + TypeScript
- **Framework** — Express
- **Database** — PostgreSQL 14+ (via `node-postgres`)
- **Auth** — `jsonwebtoken`, `bcrypt`
- **Validation** — Zod
- **Security** — Helmet, CORS, `express-rate-limit`
- **Build** — `tsup`, `tsx`

---

## Project structure

```
src/
├── app.ts                        # Express app — middleware, routes, error handler
├── server.ts                     # HTTP server entry point
├── database/
│   ├── connection.ts             # pg Pool + startup health check
│   ├── migrate.ts                # Run migrations
│   ├── migrations/
│   │   └── 001_init.sql          # users + refresh_tokens schema
│   └── queries/
│       ├── userQueries.ts        # DB operations for users
│       └── tokenQueries.ts       # DB operations for refresh tokens
├── middlewares/
│   ├── jwtMiddleware.ts          # Verifies Bearer token, sets req.user
│   ├── requireRole.ts            # Guards routes by role
│   └── errorHandling.ts          # Centralised error handler
├── tests/
│   ├── auth-controller.test.ts  # HTTP layer tests (status codes, validation, error forwarding)
│   ├── auth-service.test.ts     # Business logic tests (bcrypt, token rotation, edge cases)
│   ├── setup.ts                 # Env vars injected before any module loads      
├── modules/
│   ├── auth/
│   │   ├── authController.ts     # Register, login, refresh, logout handlers
│   │   └── authService.ts        # Auth business logic + token issuance
│   └── users/
│       ├── userController.ts     # User-facing route handlers
│       └── userService.ts        # User business logic
├── routes/
│   ├── index.ts                  # Index route
│   ├── authRoutes.ts             # Public auth endpoints
│   └── userRoutes.ts             # Protected user endpoints
├── types/
│   ├── authDtos.ts               # DTOs, JWTPayload, LoginResponse
│   └── express.d.ts              # req.user type augmentation
└── utils/
    ├── appError.ts               # Operational error class
    └── env.ts                    # Startup env validation + typed accessors
```

---

## Getting started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

### Install

```bash
git clone https://github.com/your-username/rbac-auth-server.git
cd rbac-auth-server
npm install
```

### Environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Generate secure secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Run it twice — once for `JWT_SECRET`, once for `JWT_REFRESH_SECRET`. They must be different.

> The server will throw on startup if any required variable is missing.

### Run migrations

```bash
npm run migrate
```

### Start the server

```bash
# Development
npm run dev

# Development with watch mode
npm run watch

# Production
npm run build && npm start

# Type checking only
npm run typecheck
```

---

## API reference

### `POST /api/auth/register`

Create a new account.

**Body**
```json
{
  "email": "user@example.com",
  "password": "minimum8chars"
}
```

**Response `201`**
```json
{
  "success": true,
  "data": {
    "id": "48cdf1c2-25b4-4cd2-b494-d29da6bc847a",
    "email": "user@example.com",
    "role": "user",
    "created_at": "2026-01-01T00:00:00.000Z"
  }
}
```

---

### `POST /api/auth/login`

Authenticate and receive tokens.

**Body**
```json
{
  "email": "user@example.com",
  "password": "your_password"
}
```

**Response `200`**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "9aa3604d3feef676c4bf1a2eee6e8f8...",
    "user": {
      "id": "48cdf1c2-25b4-4cd2-b494-d29da6bc847a",
      "email": "user@example.com",
      "role": "user",
      "created_at": "2026-01-01T00:00:00.000Z"
    }
  }
}
```

---

### `POST /api/auth/refresh`

Exchange a valid refresh token for a new access token. The old refresh token is invalidated on use (rotation).

**Body**
```json
{
  "refreshToken": "9aa3604d3feef676c4bf1a2eee6e8f8..."
}
```

**Response `200`**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### `POST /api/auth/logout`

Invalidate a refresh token.

**Body**
```json
{
  "refreshToken": "9aa3604d3feef676c4bf1a2eee6e8f8..."
}
```

**Response `200`**
```json
{
  "success": true
}
```

---

### `GET /api/users/me`

Returns the authenticated user's profile. Requires a valid access token.

**Headers**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response `200`**
```json
{
  "success": true,
  "data": {
    "id": "48cdf1c2-25b4-4cd2-b494-d29da6bc847a",
    "email": "user@example.com",
    "role": "user",
    "created_at": "2026-01-01T00:00:00.000Z"
  }
}
```

---

### Authenticated requests

Include the access token as a Bearer header on all protected routes:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

The decoded JWT payload:

```json
{
  "sub":   "48cdf1c2-25b4-4cd2-b494-d29da6bc847a",
  "email": "user@example.com",
  "role":  "user",
  "iat":   1775870120,
  "exp":   1775871020
}
```

You can inspect any token at [jwt.io](https://jwt.io).

---

## Role-based access control

Routes are protected by combining `jwtMiddleware` (verifies the token) and `requireRole` (checks the role):

```ts
// any authenticated user
router.get("/me", jwtMiddleware, getUserMe);

// admin only

// multiple roles
router.get("/list", jwtMiddleware, requireRole("admin"), getAllUsers);
```

### Assigning the admin role

To promote a user to admin, run the following SQL directly against your database:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

The next login will issue a JWT with `"role": "admin"`.

---

## Error format

All errors follow a consistent envelope:

```json
{
  "success": false,
  "code": 401,
  "message": "Invalid credentials"
}
```

| Code | Meaning                         |
|------|---------------------------------|
| 400  | Bad request                     |
| 401  | Unauthenticated                 |
| 403  | Forbidden (insufficient role)   |
| 409  | Conflict (email already exists) |
| 422  | Validation error                |
| 429  | Too many requests               |
| 500  | Internal server error           |

---

## Database schema

```sql
-- Users
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          VARCHAR(50) NOT NULL DEFAULT 'user',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Refresh tokens (only hashes are stored — never raw tokens)
CREATE TABLE refresh_tokens (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Security notes

- Passwords are hashed with bcrypt (12 rounds)
- Refresh tokens are stored as SHA-256 hashes — the raw token is never persisted
- Login always runs bcrypt even for unknown emails to prevent timing-based user enumeration
- Passwords longer than 72 bytes are rejected (bcrypt silent truncation guard)
- Emails are normalized (trimmed + lowercased) before insert and lookup
- Rate limiting applied to `/login` and `/register`
- All security headers set via Helmet

---

## Roadmap

- [ ] Frontend — React app for practicing API consumption
- [ ] Admin secret on register for initial admin creation
- [ ] Account lockout after failed login attempts
- [ ] HTTP-only cookie transport for refresh token
- [ ] Revoke all sessions endpoint
- [ ] Structured logging (pino)
- [ ] Graceful shutdown



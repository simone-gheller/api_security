# Natter API (Node.js + Fastify)

A Node.js implementation of the Natter API from **API Security in Action** by Neil Madden.

This project is a lightweight REST API built with Fastify, designed to demonstrate modern API security concepts such as authentication, authorization, secure token handling, and defense-in-depth security practices.

## Security Features

This project implements multiple layers of security following OWASP best practices:

### 1. Security Headers
All API responses include comprehensive security headers configured globally via Fastify hooks ([src/index.js:12-18](src/index.js#L12-L18)):

- **`X-Content-Type-Options: nosniff`** - Prevents MIME type sniffing attacks
- **`X-Frame-Options: DENY`** - Protects against clickjacking attacks
- **`X-XSS-Protection: 0`** - Disables legacy XSS filters (relies on CSP instead)
- **`Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; sandbox`** - Comprehensive CSP policy blocking all resources by default
- **`Cache-Control: no-store`** - Prevents sensitive data caching

### 2. Content-Type Enforcement
Fastify automatically enforces `Content-Type: application/json` for all POST/PUT requests. Requests with incorrect content types receive a `415 Unsupported Media Type` error.

### 3. Input Validation
Strict input validation using JSON Schema validation ([src/schemas/](src/schemas/)):

### 4. Password Security
Industry-standard password hashing with bcrypt ([src/routes/users.js:11](src/routes/users.js#L11)):

- **bcrypt native library** (100x faster than bcryptjs)
- **12 salt rounds** (4096 iterations) - OWASP recommended for 2026
- Unique salt per password
- Protection against rainbow table and brute force attacks

### 5. Database Security
PostgreSQL security considerations (see [docs/postgres-security-setup.md](docs/postgres-security-setup.md)):

- **Principle of Least Privilege**: Separate database users for migrations (admin) vs runtime (limited DML permissions)
- **No DDL privileges** for application user - prevents schema manipulation attacks
- Prisma ORM prevents SQL injection by using parameterized queries

### 6. Rate Limiting
Multi-layer rate limiting implemented at both application and infrastructure level

### 7. Authentication
TODO: Implement token-based authentication:
- Basic auth
- When auth fails, ensure non repudability by logging before returning a 40x status code


## Environment Variables

Create a `.env` file:

```bash
DATABASE_URL=your_database_url
```
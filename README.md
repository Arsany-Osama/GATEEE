# GATE Platform

Production-ready local development and deployment guide for the GATE learning platform.

## Required Software
- Node.js 20.19+ for the frontend build.
- Docker Desktop for local MySQL and phpMyAdmin.
- npm 9+.
- A MySQL client is optional, but phpMyAdmin is already included for local work.

## Environment Files
Create these files:
- `server/.env`
- `client/.env`

Copy the examples first:
- `cp server/.env.example server/.env`
- `cp client/.env.example client/.env`

### Server `.env`
Minimum production and local values:
- `JWT_SECRET`
- `CERTIFICATE_HMAC_SECRET`
- `CORS_ORIGIN`
- `PUBLIC_APP_URL`
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `PORT`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

For Railway MySQL, `DB_PORT` is usually `3306`.
For local host-mode MySQL through Docker port mapping, `DB_PORT` is usually `3310`.

### Client `.env`
- `VITE_API_URL` should point to the backend in production.
- `VITE_PROXY_TARGET` is optional for local dev and defaults to `http://localhost:5000`.

## Local Development
### 1. Start MySQL and phpMyAdmin
```bash
docker compose up -d mysql phpmyadmin
```

Useful URLs:
- MySQL: `localhost:3310`
- phpMyAdmin: `http://localhost:8081`

### 2. Install dependencies
```bash
cd server && npm install
cd ../client && npm install
```

### 3. Run migrations and seed data
```bash
cd server
npm run migrate
npm run seed
```

You can also run both with:
```bash
cd server
npm run setup
```

### 4. Start the backend
```bash
cd server
node index.js
```

### 5. Start the frontend
```bash
cd client
npm run dev
```

## Seed Accounts
The current development seed script creates:
- `admin@gate.test` / `AdminPass123!`
- `student@gate.test` / `StudentPass123!`

## Production Deployment
### Vercel Frontend
- Set `VITE_API_URL` to the Railway backend URL.
- Use Node 20.19+ for the build environment.
- Do not rely on localhost defaults in production.

### Railway Backend
- Use the `server/` app as the deploy root.
- Set `PORT` from Railway.
- Set `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.
- Set `JWT_SECRET`, `CERTIFICATE_HMAC_SECRET`, `CORS_ORIGIN`, and `PUBLIC_APP_URL`.
- Set Cloudinary credentials or `CLOUDINARY_URL`.
- For cross-site auth, keep `AUTH_COOKIE_SAME_SITE=none` and `AUTH_COOKIE_SECURE=true` in production.

### MySQL
- Railway MySQL is compatible with the Knex migrations in `server/migrations/`.
- Run `npm run migrate` after the database is provisioned.

## Troubleshooting
- If login works locally but not on Vercel, check `VITE_API_URL`, `CORS_ORIGIN`, and cookie settings.
- If frontend build fails on Node 18, upgrade to Node 20.19+.
- If receipts or uploads fail, verify Cloudinary env vars.
- If migrations fail, confirm the MySQL port and credentials in `server/.env`.

## Notes
- The Vite dev server proxies API requests to the backend by default in local development.
- The backend accepts multiple CORS origins as a comma-separated `CORS_ORIGIN`.
- Certificates use an HMAC signature; existing certificates remain valid after the signature backfill migration.

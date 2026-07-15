# Client App

This frontend is a Vite app that talks to the Express backend via `VITE_API_URL`.

For local development:
- Copy `client/.env.example` to `client/.env`.
- Leave `VITE_PROXY_TARGET` pointing to `http://localhost:5000` if you want the Vite dev server to proxy API calls.
- Run `npm install` in `client/`, then `npm run dev`.

For production:
- Set `VITE_API_URL` to the Railway backend URL in Vercel.
- Build with `npm run build`.

The repository root `README.md` contains the full setup and deployment guide.

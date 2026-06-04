# TLS certificates (production)

Place your PEM files here or set:

- `SSL_KEY_PATH` — private key file
- `SSL_CERT_PATH` — certificate (full chain if the CA bundle is separate)

Default paths (when env vars are not set), checked in order:

- `ssl/ainexus.isca.org.sg-key.pem` or `ssl/key.pem`
- `ssl/ainexus.isca.org.sg-chain.pem` or `ssl/cert.pem`

HTTPS is only enabled when `NODE_ENV` is set and not `development`, **and** both resolved key and cert files exist.

Optional:

- `APP_HOST` — hostname used in startup logs (default `localhost`)

Run production with HTTPS, for example:

`NODE_ENV=production PORT=5000 node dist/main.js` (after `npm run build`).

If TLS is terminated at nginx on port **5000** (recommended when the SPA uses `:5000/api`), set `SSL_DISABLED=1` on Node and let nginx terminate HTTPS.

## Production layout (SPA on 443, API on 5000)

| Service | URL |
|--------|-----|
| Frontend | `https://ainexus.isca.org.sg` |
| Backend API | `https://ainexus.isca.org.sg:5000/api` |

**Backend `.env`:** `PORT=5000`, `NODE_ENV=production`, `FRONTEND_URLS=https://ainexus.isca.org.sg` (CORS for the SPA on :443). Restart Node after changing env.

**Login** must hit the same API host as uploads: `https://ainexus.isca.org.sg:5000/api/auth/login` (frontend `VITE_SERVER_URL=...:5000/api`). If login used port 443, cookies are not sent to :5000 and uploads return **401**.

**Frontend build:** `VITE_SERVER_URL=https://ainexus.isca.org.sg:5000/api` or `VITE_API_PORT=5000`.

**nginx:** proxy `listen 5000 ssl` → `127.0.0.1:5000` (see `deploy/nginx.example.conf`).

## nginx upload size (course section videos)

A **413 Request Entity Too Large** on `upload-video` means nginx’s `client_max_body_size` is too small on the **:5000** server block:

```nginx
client_max_body_size 500M;
proxy_read_timeout 300s;
proxy_send_timeout 300s;
```

## 404 on `/api/auth/login` at port 443

If the browser calls `https://ainexus.isca.org.sg/api/...` (no port) and gets **404**, either proxy `/api` on 443 to Node or point the frontend at `:5000/api` as above. Test the API port:

```bash
curl -i -X POST https://ainexus.isca.org.sg:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrong"}'
```

Expect **401** or **400**, not **404**.

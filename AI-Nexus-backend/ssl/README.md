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

`NODE_ENV=production PORT=3000 node dist/main.js` (after `npm run build`).

If TLS is terminated at nginx (or another reverse proxy) and Node should listen on HTTP only, set `SSL_DISABLED=1` or omit/remove the PEM files from `ssl/`.

## nginx upload size (course section videos)

A **413 Request Entity Too Large** on `upload-video` usually means nginx’s default `client_max_body_size` (1m) is too small. Raise it on **every** server block that proxies to the API (port 443 `/api` and any direct `:5000` listener):

```nginx
client_max_body_size 500M;
proxy_read_timeout 300s;
proxy_send_timeout 300s;
```

Rebuild the frontend with `VITE_SERVER_URL=https://ainexus.isca.org.sg/api` (no `:5000`) or omit `VITE_SERVER_URL` so the SPA uses same-origin `/api`.

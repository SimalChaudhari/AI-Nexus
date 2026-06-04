# Why 500 MB in nginx can still return 413

Upload URL in production is often:

`https://ainexus.isca.org.sg:5000/api/app-settings/home-ceo-launch-video`

If DevTools shows **413** and **`server: nginx`**, nginx on **port 5000** rejected the file **before** Nest ran.  
Changing only the **port 443** server block does **not** fix uploads to **:5000**.

## 1. Put the limit on the correct `server` block

```nginx
server {
    listen 5000 ssl;
    server_name ainexus.isca.org.sg;

    client_max_body_size 500M;

    location / {
        client_max_body_size 500M;
        proxy_pass http://127.0.0.1:3000;  # your Node port
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Reload:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## 2. Prove nginx on :5000 accepts large bodies

```bash
dd if=/dev/zero of=/tmp/test5m.bin bs=1M count=5
curl -k -s -o /dev/null -w "HTTP %{http_code}\n" \
  -X POST "https://ainexus.isca.org.sg:5000/api/app-settings/home-ceo-launch-video" \
  -F "video=@/tmp/test5m.bin"
```

| Result | Meaning |
|--------|---------|
| **413** | `client_max_body_size` on **:5000** is still too small (wrong file, not reloaded, or another proxy). |
| **401 / 400** | Body reached the API — nginx limit is OK. |

## 3. App limit is separate from nginx

Even with nginx **500 MB**, the API enforces **`UPLOAD_VIDEO_MAX_MB`** (default **100 MB**) in `app-settings.controller.ts`.

Set on the **backend** `.env` and restart:

```env
UPLOAD_VIDEO_MAX_MB=500
```

Match the **frontend** build:

```env
VITE_UPLOAD_VIDEO_MAX_MB=500
```

## 4. Cross-origin (site vs API port)

SPA: `https://ainexus.isca.org.sg`  
API: `https://ainexus.isca.org.sg:5000`

Backend needs:

```env
FRONTEND_URLS=https://ainexus.isca.org.sg
```

If nginx returns 413 **without** CORS headers, the browser shows a generic network error instead of JSON.

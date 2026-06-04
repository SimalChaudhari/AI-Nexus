# Nginx 413 on `https://ainexus.isca.org.sg:5000`

A **413** response with `server: nginx` means **nginx rejected the body before Node/Nest saw the request**.  
Changing only the `http { }` block or the **port 443** server is not enough if uploads go to **port 5000**.

## Fix on the machine that serves `:5000`

Inside the `server` block that has `listen 5000 ssl;` (or `listen 5000;`):

```nginx
server {
    listen 5000 ssl;
    server_name ainexus.isca.org.sg;

    # Required for large video uploads (CEO launch, course sections)
    client_max_body_size 500M;

    location / {
        proxy_pass http://127.0.0.1:3000;   # or your Nest port
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 500M;
    }
}
```

Then test and reload:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## Verify the limit is really 500M on :5000

```bash
# Create a 2MB test file
dd if=/dev/zero of=/tmp/test2m.bin bs=1M count=2

# Replace URL/cookie with a real admin session if needed
curl -k -s -o /dev/null -w "%{http_code}\n" \
  -X POST "https://ainexus.isca.org.sg:5000/api/app-settings/home-ceo-launch-video" \
  -F "video=@/tmp/test2m.bin"
```

- **413** → nginx on **5000** still has a small limit (wrong file or reload missing).
- **401/400** → body reached the API (limit OK).

## Frontend env (after nginx is verified)

In production `.env` used for `vite build`:

```env
VITE_UPLOAD_PROXY_VERIFIED=true
VITE_UPLOAD_PROXY_MAX_MB=500
VITE_UPLOAD_VIDEO_MAX_MB=100
```

Until `VITE_UPLOAD_PROXY_VERIFIED=true`, the app compresses videos like images (~900 KB) so uploads work even when `:5000` still has a 1 MB default.

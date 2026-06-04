# Fix 413 on `upload-video` (nginx on port 5000)

## Symptom

- URL: `https://ainexus.isca.org.sg:5000/api/courses/modules/sections/upload-video`
- Status: **413 Request Entity Too Large**
- Response header: `server: nginx`, `content-type: text/html`

The request is rejected **before** it reaches NestJS. The default nginx limit is **1 MB**.

## Fix (on the production server)

1. Edit the nginx `server` block that has `listen 5000 ssl` (or the file that proxies `/api/` to Node).

2. Add or increase these directives **inside that `server` block** (and inside `location /api/` if you use one):

```nginx
client_max_body_size 500M;
client_body_timeout 300s;
proxy_read_timeout 300s;
proxy_send_timeout 300s;
proxy_request_buffering off;
```

Example `location`:

```nginx
location /api/ {
    client_max_body_size 500M;
    proxy_pass http://127.0.0.1:5000/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

3. If you have a global `http { }` block with a small limit, either raise it there or ensure the **:5000** `server` block overrides it.

4. Test and reload:

```bash
sudo nginx -t
sudo nginx -s reload
```

5. Retry the upload. You should get **200** or **401** (auth), not **413**.

## Optional: global http block

```nginx
http {
    client_max_body_size 500M;
    ...
}
```

## Nest limit (after nginx)

Backend allows section videos up to `UPLOAD_SECTION_VIDEO_MAX_MB` (default **500 MB**; Express/multer cap in `src/common/upload-limits.ts`). nginx `client_max_body_size` must be at least that large.

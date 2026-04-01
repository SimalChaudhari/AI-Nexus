## Prerequisites

- Node.js 20.x (Recommended)

## Installation

**Using Yarn (Recommended)**

```sh
yarn install
yarn dev
```

**Using Npm**

```sh
npm i
npm run dev
```

## Build

```sh
yarn build
# or
npm run build
```

## Mock server

By default we provide demo data from : `https://api-dev-minimal-[version].vercel.app`

To set up your local server:

- **Guide:** [https://docs.minimals.cc/mock-server](https://docs.minimals.cc/mock-server).

- **Resource:** [Download](https://www.dropbox.com/sh/6ojn099upi105tf/AACpmlqrNUacwbBfVdtt2t6va?dl=0).

## Full version

- Create React App ([migrate to CRA](https://docs.minimals.cc/migrate-to-cra/)).
- Next.js
- Vite.js

## Starter version

- To remove unnecessary components. This is a simplified version ([https://starter.minimals.cc/](https://starter.minimals.cc/))
- Good to start a new project. You can copy components from the full version.
- Make sure to install the dependencies exactly as compared to the full version.

## Deployment and WebSockets

Real-time features (announcements list, questions list, comments) use **Socket.IO**.  
**Vercel serverless does not support WebSockets** (no long-lived connections), so if your **backend** is deployed on Vercel, Socket.IO will not connect there.

**Only for Vercel (or similar) deployment** — when your backend is on Vercel and you see WebSocket errors in production:

1. **Disable Socket.IO for that deployment (no real-time):**  
   In your **frontend** env on Vercel only, set:
   ```bash
   VITE_SOCKET_ENABLED=false
   ```
   The app will work; only live updates will require a refresh. **Do not set this locally** — keep it unset or `true` so real-time works in development.

2. **Keep real-time in production:**  
   Deploy the backend to a platform that supports WebSockets (e.g. **Railway**, **Render**, **Fly.io**). Point `VITE_SERVER_URL` at that backend and leave `VITE_SOCKET_ENABLED` unset or `true`. Socket.IO will connect and real-time will work in production too.

---

**NOTE:**
_When copying folders remember to also copy hidden files like .env. This is important because .env files often contain environment variables that are crucial for the application to run correctly._

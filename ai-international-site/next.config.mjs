/** @type {import('next').NextConfig} */

function getBackendOriginFromEnv() {
  const explicit = (process.env.BACKEND_ORIGIN || '').trim().replace(/\/+$/, '');
  if (explicit) return explicit;

  const serverUrl = (process.env.NEXT_PUBLIC_SERVER_URL || '').trim();
  if (!serverUrl) {
    throw new Error(
      '[ai-international-site] Set NEXT_PUBLIC_SERVER_URL (or BACKEND_ORIGIN) in .env / .env.local'
    );
  }

  try {
    const parsed = new URL(serverUrl);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    throw new Error(
      `[ai-international-site] Invalid NEXT_PUBLIC_SERVER_URL: ${serverUrl}`
    );
  }
}

const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  transpilePackages: ['@mui/material', '@mui/system', '@emotion/react', '@emotion/styled'],
  async rewrites() {
    const backend = getBackendOriginFromEnv();

    return [
      {
        source: '/api/:path*',
        destination: `${backend}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${backend}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;

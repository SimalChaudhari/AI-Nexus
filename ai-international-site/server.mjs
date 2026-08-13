import { createServer as createHttpServer } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'node:url';
import { fileURLToPath } from 'node:url';

import nextEnv from '@next/env';
import next from 'next';

const { loadEnvConfig } = nextEnv;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.env.NODE_ENV = process.env.NODE_ENV || 'production';
loadEnvConfig(__dirname);

const port = Number(process.env.PORT) || 3003;
const bindHost = process.env.APP_BIND_HOST?.trim() || '0.0.0.0';
const displayHost = process.env.APP_HOST?.trim() || 'localhost';

function isTrue(value) {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

function pairIfExists(keyPath, certPath) {
  if (!keyPath || !certPath || !fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
    return undefined;
  }
  return { keyPath, certPath };
}

/** Same cert lookup pattern as the Vite frontend preview HTTPS. */
function resolveSslCredentials() {
  if (isTrue(process.env.SSL_DISABLED)) {
    return undefined;
  }

  const envPair = pairIfExists(
    process.env.SSL_KEY_PATH?.trim(),
    process.env.SSL_CERT_PATH?.trim(),
  );
  if (envPair) {
    return {
      key: fs.readFileSync(envPair.keyPath),
      cert: fs.readFileSync(envPair.certPath),
    };
  }

  const sslDirCandidates = [
    path.resolve(__dirname, 'cert'),
    path.resolve(__dirname, 'ssl'),
    path.resolve(__dirname, '..', 'AI-Nexus-frontend', 'cert'),
    path.resolve(__dirname, '..', 'AI-Nexus-backend', 'ssl'),
  ];

  for (const sslDir of sslDirCandidates) {
    if (!fs.existsSync(sslDir)) continue;
    const pair =
      pairIfExists(
        path.join(sslDir, 'ainexus.isca.org.sg-key.pem'),
        path.join(sslDir, 'ainexus.isca.org.sg-chain.pem'),
      ) || pairIfExists(path.join(sslDir, 'key.pem'), path.join(sslDir, 'cert.pem'));
    if (!pair) continue;
    return {
      key: fs.readFileSync(pair.keyPath),
      cert: fs.readFileSync(pair.certPath),
    };
  }

  return undefined;
}

const httpsCredentials = resolveSslCredentials();
const app = next({
  dev: false,
  hostname: displayHost,
  port,
});
const handle = app.getRequestHandler();

await app.prepare();

const requestListener = async (req, res) => {
  try {
    const parsedUrl = parse(req.url || '/', true);
    await handle(req, res, parsedUrl);
  } catch (error) {
    console.error('Error occurred handling', req.url, error);
    res.statusCode = 500;
    res.end('internal server error');
  }
};

const server = httpsCredentials
  ? createHttpsServer(httpsCredentials, requestListener)
  : createHttpServer(requestListener);

server.once('error', (error) => {
  console.error(error);
  process.exit(1);
});

server.listen(port, bindHost, () => {
  const protocol = httpsCredentials ? 'https' : 'http';
  console.log(`> Ready on ${protocol}://${displayHost}:${port}`);
  if (!httpsCredentials) {
    console.warn(
      '> HTTPS off: no certs found. Put PEMs in cert/ (or ssl/), or set SSL_KEY_PATH and SSL_CERT_PATH.',
    );
  }
});

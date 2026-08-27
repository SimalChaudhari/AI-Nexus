import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Frontend cert paths only. */
function resolveFrontendSslCredentials() {
  const sslDirCandidates = [path.resolve(__dirname, 'cert'), path.resolve(__dirname, 'ssl')];
  const sslDir = sslDirCandidates.find((dir) => fs.existsSync(dir));
  if (!sslDir) {
    return undefined;
  }

  let keyPath = process.env.VITE_SSL_KEY_PATH?.trim();
  let certPath = process.env.VITE_SSL_CERT_PATH?.trim();

  if (!keyPath) {
    const iscaKey = path.join(sslDir, 'ainexus.isca.org.sg-key.pem');
    keyPath = fs.existsSync(iscaKey) ? iscaKey : path.join(sslDir, 'key.pem');
  }
  if (!certPath) {
    const iscaCert = path.join(sslDir, 'ainexus.isca.org.sg-chain.pem');
    certPath = fs.existsSync(iscaCert) ? iscaCert : path.join(sslDir, 'cert.pem');
  }

  if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
    return undefined;
  }
  return {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };
}

const httpsCredentials = resolveFrontendSslCredentials();

export default defineConfig(({ mode }) => {
  const isDevOrProd = mode === 'development' || mode === 'production';
  const canUseHttps = isDevOrProd && Boolean(httpsCredentials);

  return {
    plugins: [react()],
    resolve: {
      alias: {
        src: path.resolve(__dirname, 'src'),
      },
      dedupe: ['react', 'react-dom', '@mui/x-date-pickers'],
    },
    optimizeDeps: {
      include: ['@mui/x-date-pickers', '@mui/x-date-pickers/AdapterDayjs'],
    },
    server: {
      port: 3000,
      strictPort: true,
      ...(canUseHttps && process.env.VITE_DEV_HTTPS === '1' ? { https: httpsCredentials } : {}),
    },
    preview: {
      port: 3000,
      strictPort: true,
      ...(canUseHttps ? { https: httpsCredentials } : {}),
    },
  };
});

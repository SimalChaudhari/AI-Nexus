import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'path'

import react from '@vitejs/plugin-react'
import dotenv from 'dotenv'
import { defineConfig } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** Production preview TLS (same layout as AI-Nexus-frontend and shared workspace SSL). */
function resolvePreviewSslCredentials() {
    const sslDirCandidates = [
        resolve(__dirname, 'ssl'),
        resolve(__dirname, 'cert'),
        resolve(__dirname, '../../../SSL')
    ]
    const sslDir = sslDirCandidates.find((dir) => fs.existsSync(dir))
    if (!sslDir) {
        return undefined
    }

    let keyPath = process.env.VITE_SSL_KEY_PATH?.trim()
    let certPath = process.env.VITE_SSL_CERT_PATH?.trim()

    if (!keyPath) {
        const flowiseKey = resolve(sslDir, 'flowise.ainexus.isca.org.sg-key.pem')
        const iscaKey = resolve(sslDir, 'ainexus.isca.org.sg-key.pem')
        keyPath = fs.existsSync(flowiseKey) ? flowiseKey : fs.existsSync(iscaKey) ? iscaKey : resolve(sslDir, 'key.pem')
    }
    if (!certPath) {
        const flowiseCert = resolve(sslDir, 'flowise.ainexus.isca.org.sg-chain.pem')
        const iscaCert = resolve(sslDir, 'ainexus.isca.org.sg-chain.pem')
        certPath = fs.existsSync(flowiseCert)
            ? flowiseCert
            : fs.existsSync(iscaCert)
              ? iscaCert
              : resolve(sslDir, 'cert.pem')
    }

    if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
        return undefined
    }

    return {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
    }
}

const httpsCredentials = resolvePreviewSslCredentials()

export default defineConfig(async ({ mode }) => {
    dotenv.config()

    const previewPort = parseInt(process.env.VITE_PREVIEW_PORT ?? '3001', 10)

    let proxy = undefined
    if (mode === 'development') {
        const serverEnv = dotenv.config({ processEnv: {}, path: '../server/.env' }).parsed
        // Use 127.0.0.1 instead of localhost: on Windows, localhost → IPv6/IPv4 parallel connect
        // often yields AggregateError (EADDRINUSE / connection quirks) with Vite's HTTP proxy.
        const rawHost = serverEnv?.['HOST']?.trim()
        const serverHost =
            !rawHost || rawHost === 'localhost' || rawHost === '::1' || rawHost === '::' ? '127.0.0.1' : rawHost
        const serverPort = parseInt(serverEnv?.['PORT'] ?? 3002, 10)
        if (!Number.isNaN(serverPort) && serverPort > 0 && serverPort < 65535) {
            proxy = {
                '^/api(/|$).*': {
                    target: `http://${serverHost}:${serverPort}`,
                    changeOrigin: true
                }
            }
        }
    }

    const canUseHttps = Boolean(httpsCredentials)

    return {
        plugins: [react()],
        resolve: {
            alias: {
                '@': resolve(__dirname, 'src'),
                '@codemirror/state': resolve(__dirname, '../../node_modules/@codemirror/state'),
                '@codemirror/view': resolve(__dirname, '../../node_modules/@codemirror/view'),
                '@codemirror/language': resolve(__dirname, '../../node_modules/@codemirror/language'),
                '@codemirror/lang-javascript': resolve(__dirname, '../../node_modules/@codemirror/lang-javascript'),
                '@codemirror/lang-json': resolve(__dirname, '../../node_modules/@codemirror/lang-json'),
                '@uiw/react-codemirror': resolve(__dirname, '../../node_modules/@uiw/react-codemirror'),
                '@uiw/codemirror-theme-vscode': resolve(__dirname, '../../node_modules/@uiw/codemirror-theme-vscode'),
                '@uiw/codemirror-theme-sublime': resolve(__dirname, '../../node_modules/@uiw/codemirror-theme-sublime'),
                '@lezer/common': resolve(__dirname, '../../node_modules/@lezer/common'),
                '@lezer/highlight': resolve(__dirname, '../../node_modules/@lezer/highlight')
            }
        },
        root: resolve(__dirname),
        build: {
            outDir: './build'
        },
        server: {
            open: true,
            proxy,
            port: process.env.VITE_PORT ?? 8080,
            host: process.env.VITE_HOST,
            ...(canUseHttps ? { https: httpsCredentials } : {})
        },
        preview: {
            port: Number.isNaN(previewPort) ? 3001 : previewPort,
            strictPort: true,
            host: process.env.VITE_PREVIEW_HOST ?? '0.0.0.0',
            ...(canUseHttps ? { https: httpsCredentials } : {})
        }
    }
})

// BEWARE: This file is an intereem solution until we have a proper config strategy

import path from 'path'
import fs from 'fs'
import dotenv from 'dotenv'

const envDir = path.join(__dirname, '..', '..')
const defaultEnvPath = path.join(envDir, '.env')
const nodeEnv = process.env.NODE_ENV?.trim()
const nodeEnvFile = nodeEnv ? `.env.${nodeEnv}` : ''
const nodeEnvPath = nodeEnvFile ? path.join(envDir, nodeEnvFile) : ''

// Load base env first, then overlay environment-specific values when present.
dotenv.config({ path: defaultEnvPath, override: false })
if (nodeEnvPath && fs.existsSync(nodeEnvPath)) {
    dotenv.config({ path: nodeEnvPath, override: true })
}

// default config
const loggingConfig = {
    dir: process.env.LOG_PATH ?? path.join(__dirname, '..', '..', 'logs'),
    server: {
        level: process.env.LOG_LEVEL ?? 'info',
        filename: 'server.log',
        errorFilename: 'server-error.log'
    },
    express: {
        level: process.env.LOG_LEVEL ?? 'info',
        format: 'jsonl', // can't be changed currently
        filename: 'server-requests.log.jsonl' // should end with .jsonl
    }
}

export default {
    logging: loggingConfig
}

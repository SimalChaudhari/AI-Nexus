import { IActiveCache, MODE } from './Interface'
import Redis from 'ioredis'

/** Max in-memory cache entries per pool (LLM / embedding / MCP). Override with CACHE_POOL_MAX_ENTRIES. */
const CACHE_POOL_MAX_ENTRIES = process.env.CACHE_POOL_MAX_ENTRIES
    ? Math.max(1, parseInt(process.env.CACHE_POOL_MAX_ENTRIES))
    : 50
/** Redis TTL seconds for LLM/embedding caches in queue mode. Override with CACHE_POOL_REDIS_TTL_SEC. */
const CACHE_POOL_REDIS_TTL_SEC = process.env.CACHE_POOL_REDIS_TTL_SEC
    ? Math.max(30, parseInt(process.env.CACHE_POOL_REDIS_TTL_SEC))
    : 3600

/**
 * This pool is to keep track of in-memory cache used for LLM and Embeddings
 */
export class CachePool {
    private redisClient: Redis | null = null
    activeLLMCache: IActiveCache = {}
    activeEmbeddingCache: IActiveCache = {}
    activeMCPCache: { [key: string]: any } = {}
    ssoTokenCache: { [key: string]: any } = {}
    private llmAccessOrder: string[] = []
    private embeddingAccessOrder: string[] = []
    private mcpAccessOrder: string[] = []

    constructor() {
        if (process.env.MODE === MODE.QUEUE) {
            if (process.env.REDIS_URL) {
                this.redisClient = new Redis(process.env.REDIS_URL, {
                    keepAlive:
                        process.env.REDIS_KEEP_ALIVE && !isNaN(parseInt(process.env.REDIS_KEEP_ALIVE, 10))
                            ? parseInt(process.env.REDIS_KEEP_ALIVE, 10)
                            : undefined
                })
            } else {
                this.redisClient = new Redis({
                    host: process.env.REDIS_HOST || 'localhost',
                    port: parseInt(process.env.REDIS_PORT || '6379'),
                    username: process.env.REDIS_USERNAME || undefined,
                    password: process.env.REDIS_PASSWORD || undefined,
                    tls:
                        process.env.REDIS_TLS === 'true'
                            ? {
                                  cert: process.env.REDIS_CERT ? Buffer.from(process.env.REDIS_CERT, 'base64') : undefined,
                                  key: process.env.REDIS_KEY ? Buffer.from(process.env.REDIS_KEY, 'base64') : undefined,
                                  ca: process.env.REDIS_CA ? Buffer.from(process.env.REDIS_CA, 'base64') : undefined
                              }
                            : undefined,
                    keepAlive:
                        process.env.REDIS_KEEP_ALIVE && !isNaN(parseInt(process.env.REDIS_KEEP_ALIVE, 10))
                            ? parseInt(process.env.REDIS_KEEP_ALIVE, 10)
                            : undefined
                })
            }
        }
    }

    private touchOrder(order: string[], key: string): void {
        const idx = order.indexOf(key)
        if (idx >= 0) order.splice(idx, 1)
        order.push(key)
    }

    private evictIfNeeded(cache: Record<string, any>, order: string[]): void {
        while (order.length > CACHE_POOL_MAX_ENTRIES) {
            const oldest = order.shift()
            if (oldest) delete cache[oldest]
        }
    }

    /**
     * Add to the sso token cache pool
     * @param {string} ssoToken
     * @param {any} value
     */
    async addSSOTokenCache(ssoToken: string, value: any) {
        if (process.env.MODE === MODE.QUEUE) {
            if (this.redisClient) {
                const serializedValue = JSON.stringify(value)
                await this.redisClient.set(`ssoTokenCache:${ssoToken}`, serializedValue, 'EX', 120)
            }
        } else {
            this.ssoTokenCache[ssoToken] = { value, expiresAt: Date.now() + 120_000 }
            this.pruneSsoTokenCache()
        }
    }

    private pruneSsoTokenCache(): void {
        const now = Date.now()
        const keys = Object.keys(this.ssoTokenCache)
        for (const key of keys) {
            const entry = this.ssoTokenCache[key]
            if (entry?.expiresAt && entry.expiresAt <= now) {
                delete this.ssoTokenCache[key]
            }
        }
        const remaining = Object.keys(this.ssoTokenCache)
        const max = 200
        if (remaining.length > max) {
            remaining.slice(0, remaining.length - max).forEach((key) => {
                delete this.ssoTokenCache[key]
            })
        }
    }

    async getSSOTokenCache(ssoToken: string): Promise<any | undefined> {
        if (process.env.MODE === MODE.QUEUE) {
            if (this.redisClient) {
                const serializedValue = await this.redisClient.get(`ssoTokenCache:${ssoToken}`)
                if (serializedValue) {
                    return JSON.parse(serializedValue)
                }
            }
        } else {
            const entry = this.ssoTokenCache[ssoToken]
            if (!entry) return undefined
            if (entry.expiresAt && entry.expiresAt <= Date.now()) {
                delete this.ssoTokenCache[ssoToken]
                return undefined
            }
            return entry.value !== undefined ? entry.value : entry
        }
        return undefined
    }

    async deleteSSOTokenCache(ssoToken: string) {
        if (process.env.MODE === MODE.QUEUE) {
            if (this.redisClient) {
                await this.redisClient.del(`ssoTokenCache:${ssoToken}`)
            }
        } else {
            delete this.ssoTokenCache[ssoToken]
        }
    }

    /**
     * Add to the llm cache pool
     * @param {string} chatflowid
     * @param {Map<any, any>} value
     */
    async addLLMCache(chatflowid: string, value: Map<any, any>) {
        if (process.env.MODE === MODE.QUEUE) {
            if (this.redisClient) {
                const serializedValue = JSON.stringify(Array.from(value.entries()))
                await this.redisClient.set(`llmCache:${chatflowid}`, serializedValue, 'EX', CACHE_POOL_REDIS_TTL_SEC)
            }
        } else {
            this.activeLLMCache[chatflowid] = value
            this.touchOrder(this.llmAccessOrder, chatflowid)
            this.evictIfNeeded(this.activeLLMCache, this.llmAccessOrder)
        }
    }

    /**
     * Add to the embedding cache pool
     * @param {string} chatflowid
     * @param {Map<any, any>} value
     */
    async addEmbeddingCache(chatflowid: string, value: Map<any, any>) {
        if (process.env.MODE === MODE.QUEUE) {
            if (this.redisClient) {
                const serializedValue = JSON.stringify(Array.from(value.entries()))
                await this.redisClient.set(`embeddingCache:${chatflowid}`, serializedValue, 'EX', CACHE_POOL_REDIS_TTL_SEC)
            }
        } else {
            this.activeEmbeddingCache[chatflowid] = value
            this.touchOrder(this.embeddingAccessOrder, chatflowid)
            this.evictIfNeeded(this.activeEmbeddingCache, this.embeddingAccessOrder)
        }
    }

    /**
     * Add to the mcp toolkit cache pool
     * @param {string} cacheKey
     * @param {any} value
     */
    async addMCPCache(cacheKey: string, value: any) {
        // Only add to cache for non-queue mode, because we are storing the toolkit instances in memory, and we can't store them in redis
        if (process.env.MODE !== MODE.QUEUE) {
            const key = `mcpCache:${cacheKey}`
            this.activeMCPCache[key] = value
            this.touchOrder(this.mcpAccessOrder, key)
            this.evictIfNeeded(this.activeMCPCache, this.mcpAccessOrder)
        }
    }

    /**
     * Get item from mcp toolkit cache pool
     * @param {string} cacheKey
     */
    async getMCPCache(cacheKey: string): Promise<any | undefined> {
        if (process.env.MODE !== MODE.QUEUE) {
            const key = `mcpCache:${cacheKey}`
            const value = this.activeMCPCache[key]
            if (value !== undefined) this.touchOrder(this.mcpAccessOrder, key)
            return value
        }
        return undefined
    }

    /**
     * Get item from llm cache pool
     * @param {string} chatflowid
     */
    async getLLMCache(chatflowid: string): Promise<Map<any, any> | undefined> {
        if (process.env.MODE === MODE.QUEUE) {
            if (this.redisClient) {
                const serializedValue = await this.redisClient.get(`llmCache:${chatflowid}`)
                if (serializedValue) {
                    return new Map(JSON.parse(serializedValue))
                }
            }
        } else {
            const value = this.activeLLMCache[chatflowid]
            if (value !== undefined) this.touchOrder(this.llmAccessOrder, chatflowid)
            return value
        }
        return undefined
    }

    /**
     * Get item from embedding cache pool
     * @param {string} chatflowid
     */
    async getEmbeddingCache(chatflowid: string): Promise<Map<any, any> | undefined> {
        if (process.env.MODE === MODE.QUEUE) {
            if (this.redisClient) {
                const serializedValue = await this.redisClient.get(`embeddingCache:${chatflowid}`)
                if (serializedValue) {
                    return new Map(JSON.parse(serializedValue))
                }
            }
        } else {
            const value = this.activeEmbeddingCache[chatflowid]
            if (value !== undefined) this.touchOrder(this.embeddingAccessOrder, chatflowid)
            return value
        }
        return undefined
    }

    /**
     * Close Redis connection if applicable
     */
    async close() {
        if (this.redisClient) {
            await this.redisClient.quit()
        }
    }
}

let cachePoolInstance: CachePool | undefined

export function getInstance(): CachePool {
    if (cachePoolInstance === undefined) {
        cachePoolInstance = new CachePool()
    }

    return cachePoolInstance
}

import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

const SPOTLIGHTR_CREATE_VIDEO_URL = 'https://api.spotlightr.com/api/createVideo';
const SPOTLIGHTR_LIST_VIDEOS_URL = 'https://api.spotlightr.com/api/videos';
const SPOTLIGHTR_UPDATE_SETTINGS_URL = 'https://api.spotlightr.com/video/updateSettings';

const parsePositiveNumber = (value: string | undefined, fallback: number): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

/** Cache Spotlightr API responses so concurrent learners do not stampede api.spotlightr.com. */
const VIDEO_RECORD_TTL_MS = parsePositiveNumber(process.env.SPOTLIGHTR_CACHE_TTL_MS, 60 * 60 * 1000);
const PLAYBACK_CACHE_TTL_MS = parsePositiveNumber(
    process.env.SPOTLIGHTR_PLAYBACK_CACHE_TTL_MS,
    6 * 60 * 60 * 1000,
);
const API_TIMEOUT_MS = parsePositiveNumber(process.env.SPOTLIGHTR_API_TIMEOUT_MS, 8_000);
const CIRCUIT_FAILURE_THRESHOLD = parsePositiveNumber(process.env.SPOTLIGHTR_CIRCUIT_FAILURES, 3);
const CIRCUIT_OPEN_MS = parsePositiveNumber(process.env.SPOTLIGHTR_CIRCUIT_OPEN_MS, 5 * 60 * 1000);

type CacheEntry<T> = { value: T; expiresAt: number };

@Injectable()
export class SpotlightrService {
    private readonly logger = new Logger(SpotlightrService.name);
    private readonly videoRecordCache = new Map<string, CacheEntry<Record<string, unknown> | null>>();
    private readonly playbackCache = new Map<
        string,
        CacheEntry<{ directUrl: string | null; settingsUpdated: boolean }>
    >();
    private readonly settingsApplied = new Set<string>();
    private readonly inflightLookups = new Map<string, Promise<Record<string, unknown> | null>>();
    private readonly inflightPlayback = new Map<
        string,
        Promise<{ directUrl: string | null; settingsUpdated: boolean }>
    >();
    private consecutiveApiFailures = 0;
    private circuitOpenUntil = 0;
    private circuitOpenLoggedAt = 0;

    isConfigured(): boolean {
        return Boolean(String(process.env.SPOTLIGHTR_API_KEY || '').trim());
    }

    /** When false, skip management API (settings/lookup). Embed watch URLs still play in the browser. */
    isPreparePlaybackEnabled(): boolean {
        const raw = String(process.env.SPOTLIGHTR_PREPARE_PLAYBACK_ENABLED ?? 'true')
            .trim()
            .toLowerCase();
        return !['0', 'false', 'no', 'off'].includes(raw);
    }

    /** Spotlightr management API is down / rate-limited — do not call it. */
    isApiCircuitOpen(): boolean {
        return Date.now() < this.circuitOpenUntil;
    }

    private noteApiSuccess(): void {
        this.consecutiveApiFailures = 0;
        this.circuitOpenUntil = 0;
    }

    private noteApiFailure(context: string): void {
        this.consecutiveApiFailures += 1;
        if (this.consecutiveApiFailures < CIRCUIT_FAILURE_THRESHOLD) return;

        const wasOpen = this.isApiCircuitOpen();
        this.circuitOpenUntil = Date.now() + CIRCUIT_OPEN_MS;
        const now = Date.now();
        // Log at most once per open window to avoid flooding Nest logs.
        if (!wasOpen || now - this.circuitOpenLoggedAt > CIRCUIT_OPEN_MS) {
            this.circuitOpenLoggedAt = now;
            this.logger.warn(
                `Spotlightr management API circuit OPEN for ${Math.round(CIRCUIT_OPEN_MS / 1000)}s ` +
                    `(after ${this.consecutiveApiFailures} failures; last: ${context}). ` +
                    `Learners still use embed watch URLs; prepare-playback is skipped until Spotlightr recovers.`,
            );
        }
    }

    private getCached<T>(map: Map<string, CacheEntry<T>>, key: string): T | undefined {
        const entry = map.get(key);
        if (!entry) return undefined;
        if (entry.expiresAt <= Date.now()) {
            map.delete(key);
            return undefined;
        }
        return entry.value;
    }

    private setCached<T>(map: Map<string, CacheEntry<T>>, key: string, value: T, ttlMs: number): void {
        map.set(key, { value, expiresAt: Date.now() + ttlMs });
    }

    async uploadVideo(file: Express.Multer.File, name?: string): Promise<string> {
        const vooKey = String(process.env.SPOTLIGHTR_API_KEY || '').trim();
        if (!vooKey) {
            throw new Error('Spotlightr API key is not configured');
        }

        const form = new FormData();
        form.append('vooKey', vooKey);
        form.append('name', (name || file.originalname || 'course-section-video').trim());
        form.append('customS3', String(process.env.SPOTLIGHTR_CUSTOM_S3 ?? '0'));
        form.append('hls', String(process.env.SPOTLIGHTR_HLS ?? '0'));
        form.append('create', '1');

        const videoGroup = String(process.env.SPOTLIGHTR_VIDEO_GROUP || '').trim();
        if (videoGroup) {
            form.append('videoGroup', videoGroup);
        }

        const blob = new Blob([Uint8Array.from(file.buffer)], { type: file.mimetype || 'video/mp4' });
        form.append('file', blob, file.originalname || 'video.mp4');

        try {
            const response = await axios.post(SPOTLIGHTR_CREATE_VIDEO_URL, form, {
                maxBodyLength: Infinity,
                maxContentLength: Infinity,
                timeout: parsePositiveNumber(process.env.SPOTLIGHTR_UPLOAD_TIMEOUT_MS, 600_000),
            });

            const url = this.extractVideoUrl(response.data);
            if (!url) {
                this.logger.error('Spotlightr createVideo returned unexpected body', {
                    data: response.data,
                });
                throw new Error('Spotlightr upload succeeded but no video URL was returned');
            }
            const trimmedUrl = url.trim().split('?')[0];
            await this.allowForwardSeekingForWatchUrl(trimmedUrl);
            return trimmedUrl;
        } catch (error) {
            const message = axios.isAxiosError(error)
                ? String(error.response?.data || error.message)
                : error instanceof Error
                  ? error.message
                  : 'Spotlightr upload failed';
            this.logger.error(`Spotlightr upload failed: ${message}`);
            throw new Error(message);
        }
    }

    /**
     * Enable free timeline seeking for a Spotlightr watch URL and return a direct MP4 when available.
     * Direct MP4 bypasses the Spotlightr iframe player (and theme forward-seek lock) entirely.
     * Cached + single-flight so many concurrent learners share one Spotlightr API call per video.
     */
    async preparePlaybackForWatchUrl(watchUrl: string): Promise<{
        directUrl: string | null;
        settingsUpdated: boolean;
    }> {
        const empty = { directUrl: null as string | null, settingsUpdated: false };
        if (!this.isPreparePlaybackEnabled()) {
            return empty;
        }

        const videoId = this.extractWatchUrlVideoId(watchUrl);
        const cacheKey = videoId || String(watchUrl || '').trim();
        if (!cacheKey) {
            return empty;
        }

        const cached = this.getCached(this.playbackCache, cacheKey);
        if (cached) return cached;

        // Spotlightr dashboard/API is down — skip calls so Nest logs and worker threads stay healthy.
        if (this.isApiCircuitOpen()) {
            return empty;
        }

        const inflight = this.inflightPlayback.get(cacheKey);
        if (inflight) return inflight;

        const promise = this.preparePlaybackUncached(watchUrl, videoId)
            .then((result) => {
                // Successful lookups stay warm; failures expire quickly so Spotlightr recovery is picked up.
                const ttl =
                    result.directUrl || result.settingsUpdated
                        ? PLAYBACK_CACHE_TTL_MS
                        : Math.min(PLAYBACK_CACHE_TTL_MS, 60_000);
                this.setCached(this.playbackCache, cacheKey, result, ttl);
                return result;
            })
            .finally(() => {
                this.inflightPlayback.delete(cacheKey);
            });

        this.inflightPlayback.set(cacheKey, promise);
        return promise;
    }

    private async preparePlaybackUncached(
        watchUrl: string,
        videoId: string | null,
    ): Promise<{ directUrl: string | null; settingsUpdated: boolean }> {
        // Settings only need to be applied once per video; do not block playback on Spotlightr.
        const settingsPromise = this.allowForwardSeekingForWatchUrl(watchUrl);
        const directUrl = videoId ? await this.resolveVideoFileUrl(videoId) : null;
        const settingsUpdated = await settingsPromise;
        return { directUrl, settingsUpdated };
    }

    /** Allow timeline forward/backward jumps for course playback (overrides theme default). */
    async allowForwardSeekingForWatchUrl(watchUrl: string): Promise<boolean> {
        const videoId = this.extractWatchUrlVideoId(watchUrl);
        if (!videoId) return false;

        const candidates = this.buildVideoIdCandidates(videoId);
        const numericId = candidates.find((candidate) => /^\d+$/.test(candidate));
        if (numericId && this.settingsApplied.has(numericId)) {
            return true;
        }

        if (this.isApiCircuitOpen()) return false;

        const updated = await this.updateVideoPlayerSettings(videoId, {
            disable_forward_seek: false,
            disableForwardSeek: false,
            forward_seek_disabled: false,
            forwardSeekDisabled: false,
        });
        if (updated && numericId) {
            this.settingsApplied.add(numericId);
        }
        return updated;
    }

    private extractWatchUrlVideoId(watchUrl: string): string | null {
        const match = String(watchUrl || '').trim().match(/\/watch\/([^/?#]+)/i);
        if (!match) return null;
        return decodeURIComponent(match[1]);
    }

    private async updateVideoPlayerSettings(
        videoId: string,
        settings: Record<string, unknown>,
    ): Promise<boolean> {
        const vooKey = String(process.env.SPOTLIGHTR_API_KEY || '').trim();
        if (!vooKey || this.isApiCircuitOpen()) return false;

        const candidates = this.buildVideoIdCandidates(videoId);
        const numericId = candidates.find((candidate) => /^\d+$/.test(candidate));
        if (!numericId) {
            this.logger.warn(`Spotlightr settings update skipped; no numeric id for ${videoId}`);
            return false;
        }

        try {
            await axios.post(
                SPOTLIGHTR_UPDATE_SETTINGS_URL,
                {
                    vooKey,
                    id: Number(numericId),
                    settings,
                },
                { timeout: API_TIMEOUT_MS },
            );
            this.logger.log(`Spotlightr player settings updated for video id=${numericId}`);
            this.settingsApplied.add(numericId);
            this.noteApiSuccess();
            return true;
        } catch (error) {
            const message = axios.isAxiosError(error)
                ? String(error.response?.data || error.message)
                : error instanceof Error
                  ? error.message
                  : 'Spotlightr settings update failed';
            this.noteApiFailure(`settings id=${numericId}: ${message}`);
            if (!this.isApiCircuitOpen()) {
                this.logger.warn(`Spotlightr settings update failed for id=${numericId}: ${message}`);
            }
            return false;
        }
    }

    /** Look up a Spotlightr video row by numeric id (from watch URL path). */
    async resolveVideoRecord(videoId: string): Promise<Record<string, unknown> | null> {
        const vooKey = String(process.env.SPOTLIGHTR_API_KEY || '').trim();
        if (!vooKey) {
            this.logger.warn('Spotlightr API key is not configured; cannot resolve video');
            return null;
        }

        const candidates = this.buildVideoIdCandidates(videoId);
        if (!candidates.length) return null;

        for (const candidate of candidates) {
            const record = await this.fetchVideoRecordByApiId(vooKey, candidate);
            if (record) return record;
        }

        return null;
    }

    private buildVideoIdCandidates(videoId: string): string[] {
        const raw = String(videoId || '').trim();
        if (!raw) return [];

        const out: string[] = [];
        const add = (value: string) => {
            const next = String(value || '').trim();
            if (next && !out.includes(next)) out.push(next);
        };

        add(raw);
        if (/^\d+$/.test(raw)) return out;

        const decoded = this.decodeSpotlightrBase64Id(raw);
        if (decoded) add(decoded);

        return out;
    }

    private decodeSpotlightrBase64Id(value: string): string | null {
        try {
            const normalized = String(value).replace(/-/g, '+').replace(/_/g, '/');
            const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
            return Buffer.from(padded, 'base64').toString('utf8');
        } catch {
            return null;
        }
    }

    private async fetchVideoRecordByApiId(
        vooKey: string,
        videoId: string,
    ): Promise<Record<string, unknown> | null> {
        const id = String(videoId || '').trim();
        if (!/^\d+$/.test(id)) return null;

        const cached = this.getCached(this.videoRecordCache, id);
        if (cached !== undefined) return cached;

        const inflight = this.inflightLookups.get(id);
        if (inflight) return inflight;

        const promise = this.fetchVideoRecordUncached(vooKey, id)
            .then((record) => {
                // Cache misses briefly so a Spotlightr outage does not retry on every request.
                const ttl = record ? VIDEO_RECORD_TTL_MS : Math.min(VIDEO_RECORD_TTL_MS, 60_000);
                this.setCached(this.videoRecordCache, id, record, ttl);
                return record;
            })
            .finally(() => {
                this.inflightLookups.delete(id);
            });

        this.inflightLookups.set(id, promise);
        return promise;
    }

    private async fetchVideoRecordUncached(
        vooKey: string,
        videoId: string,
    ): Promise<Record<string, unknown> | null> {
        if (this.isApiCircuitOpen()) return null;

        try {
            const response = await axios.get(SPOTLIGHTR_LIST_VIDEOS_URL, {
                // Spotlightr expects `videoID` (not `id`) to return a single video.
                params: { vooKey, videoID: videoId },
                timeout: API_TIMEOUT_MS,
            });
            const rows = this.extractVideoRows(response.data);
            const match = rows.find((row) => {
                const rowId = String(row?.id ?? '');
                const altId = String(row?.altID ?? '');
                return rowId === videoId || altId === videoId;
            });
            const record = match || rows[0] || null;
            if (record) this.noteApiSuccess();
            return record;
        } catch (error) {
            const message = axios.isAxiosError(error)
                ? String(error.response?.data || error.message)
                : error instanceof Error
                  ? error.message
                  : 'Spotlightr video lookup failed';
            this.noteApiFailure(`lookup id=${videoId}: ${message}`);
            if (!this.isApiCircuitOpen()) {
                this.logger.error(`Spotlightr video lookup failed for id=${videoId}: ${message}`);
            }
            return null;
        }
    }

    /**
     * Duration in seconds for progress/watchtime.
     * Spotlightr `duration` and source MP4 headers often include tail padding that is trimmed
     * from the HLS stream the embedded player actually plays — prefer stream length when lower.
     */
    async resolveVideoDurationSeconds(videoId: string): Promise<number | null> {
        const record = await this.resolveVideoRecord(videoId);
        if (!record) return null;

        const metadataDuration = Number(record.duration);
        const meta =
            Number.isFinite(metadataDuration) && metadataDuration > 0
                ? Math.round(metadataDuration)
                : null;
        const streamDuration = await this.resolveHlsStreamDurationSeconds(record);

        if (streamDuration != null && meta != null) {
            // Metadata and source MP4 often include tail padding trimmed from the HLS stream.
            if (streamDuration < meta) return streamDuration;
            return meta;
        }
        if (streamDuration != null) return streamDuration;
        if (meta != null) return meta;
        return null;
    }

    private async resolveHlsStreamDurationSeconds(
        record: Record<string, unknown>,
    ): Promise<number | null> {
        const playlistUrl = this.resolveHlsPlaylistUrl(record);
        if (!playlistUrl) return null;

        try {
            const mediaPlaylistUrl = await this.resolveHlsMediaPlaylistUrl(playlistUrl);
            if (!mediaPlaylistUrl) return null;
            return await this.fetchHlsPlaylistDurationSeconds(mediaPlaylistUrl);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Spotlightr HLS duration lookup failed: ${message}`);
            return null;
        }
    }

    private resolveHlsPlaylistUrl(record: Record<string, unknown>): string | null {
        const fromOptimized = this.extractLowestHlsFromOptimizedUrls(record.optimizedUrls);
        if (fromOptimized) return fromOptimized;

        const stream = String(record.url || '').trim();
        if (stream.toLowerCase().includes('.m3u8')) return stream;

        return null;
    }

    private extractLowestHlsFromOptimizedUrls(raw: unknown): string | null {
        let entries: Array<Record<string, string>> = [];
        if (typeof raw === 'string') {
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) entries = parsed;
            } catch {
                return null;
            }
        } else if (Array.isArray(raw)) {
            entries = raw.filter((row): row is Record<string, string> => Boolean(row && typeof row === 'object'));
        }

        let bestUrl: string | null = null;
        let bestHeight = Number.POSITIVE_INFINITY;
        for (const entry of entries) {
            for (const [heightKey, url] of Object.entries(entry)) {
                const text = String(url || '').trim();
                if (!text.toLowerCase().includes('.m3u8')) continue;
                const height = Number(heightKey);
                if (Number.isFinite(height) && height < bestHeight) {
                    bestHeight = height;
                    bestUrl = text;
                } else if (!Number.isFinite(height) && !bestUrl) {
                    bestUrl = text;
                }
            }
        }
        return bestUrl;
    }

    private async resolveHlsMediaPlaylistUrl(playlistUrl: string): Promise<string | null> {
        const text = await this.fetchTextResource(playlistUrl);
        if (!text.includes('#EXT-X-STREAM-INF')) return playlistUrl;

        const lines = text.split(/\r?\n/);
        let bestUrl: string | null = null;
        let bestBandwidth = Number.POSITIVE_INFINITY;
        for (let i = 0; i < lines.length; i += 1) {
            const line = lines[i].trim();
            if (!line.startsWith('#EXT-X-STREAM-INF')) continue;
            const bandwidthMatch = line.match(/BANDWIDTH=(\d+)/i);
            const bandwidth = bandwidthMatch ? Number(bandwidthMatch[1]) : Number.POSITIVE_INFINITY;
            const next = (lines[i + 1] || '').trim();
            if (!next || next.startsWith('#')) continue;
            if (bandwidth < bestBandwidth) {
                bestBandwidth = bandwidth;
                bestUrl = this.resolvePlaylistRelativeUrl(playlistUrl, next);
            }
        }
        return bestUrl;
    }

    private resolvePlaylistRelativeUrl(playlistUrl: string, entry: string): string {
        const trimmed = String(entry || '').trim();
        if (/^https?:\/\//i.test(trimmed)) return trimmed;
        const base = playlistUrl.split('?')[0];
        const slash = base.lastIndexOf('/');
        const prefix = slash >= 0 ? base.slice(0, slash + 1) : `${base}/`;
        return `${prefix}${trimmed.replace(/^\//, '')}`;
    }

    private async fetchHlsPlaylistDurationSeconds(mediaPlaylistUrl: string): Promise<number | null> {
        const text = await this.fetchTextResource(mediaPlaylistUrl);
        let total = 0;
        for (const match of text.matchAll(/#EXTINF:([\d.]+)/g)) {
            total += Number(match[1]);
        }
        if (!(total > 0)) return null;
        return Math.round(total);
    }

    private async fetchTextResource(url: string): Promise<string> {
        const response = await axios.get(url, {
            timeout: API_TIMEOUT_MS,
            responseType: 'text',
            transformResponse: [(data) => data],
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
        });
        return String(response.data || '');
    }

    /** Resolve a direct MP4/WebM URL for header-based duration fallback. */
    async resolveVideoFileUrl(videoId: string): Promise<string | null> {
        const match = await this.resolveVideoRecord(videoId);
        if (!match) return null;

        const original = String(match.originalFileURL || '').trim();
        if (original && this.isDirectVideoUrl(original)) return original;

        const stream = String(match.url || '').trim();
        if (stream && this.isDirectVideoUrl(stream)) return stream;

        return this.extractSmallestMp4FromOptimizedUrls(match.optimizedUrls);
    }

    private isDirectVideoUrl(url: string): boolean {
        const lower = url.toLowerCase();
        return lower.includes('.mp4') || lower.includes('.webm') || lower.includes('.mov');
    }

    private extractSmallestMp4FromOptimizedUrls(raw: unknown): string | null {
        let entries: Array<Record<string, string>> = [];
        if (typeof raw === 'string') {
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) entries = parsed;
            } catch {
                return null;
            }
        } else if (Array.isArray(raw)) {
            entries = raw.filter((row): row is Record<string, string> => Boolean(row && typeof row === 'object'));
        }

        let bestUrl: string | null = null;
        let bestHeight = Number.POSITIVE_INFINITY;
        for (const entry of entries) {
            for (const [heightKey, url] of Object.entries(entry)) {
                const text = String(url || '').trim();
                if (!text.toLowerCase().includes('.mp4')) continue;
                const height = Number(heightKey);
                if (Number.isFinite(height) && height < bestHeight) {
                    bestHeight = height;
                    bestUrl = text;
                } else if (!Number.isFinite(height) && !bestUrl) {
                    bestUrl = text;
                }
            }
        }
        return bestUrl;
    }

    private extractVideoRows(data: unknown): Array<Record<string, unknown>> {
        if (!data || typeof data !== 'object') return [];
        const record = data as Record<string, unknown>;
        const videos = record.videos;
        if (videos && typeof videos === 'object') {
            const nested = (videos as Record<string, unknown>).data;
            if (Array.isArray(nested)) {
                return nested.filter((row): row is Record<string, unknown> => Boolean(row && typeof row === 'object'));
            }
        }
        if (Array.isArray(record.data)) {
            return record.data.filter((row): row is Record<string, unknown> => Boolean(row && typeof row === 'object'));
        }
        return [];
    }

    private extractVideoUrl(data: unknown): string | null {
        if (typeof data === 'string') {
            const trimmed = data.trim();
            if (/spotlightr\.com\/watch\//i.test(trimmed)) {
                return trimmed.split('?')[0];
            }
            try {
                return this.extractVideoUrl(JSON.parse(trimmed));
            } catch {
                return null;
            }
        }

        if (data && typeof data === 'object') {
            const record = data as Record<string, unknown>;
            for (const key of ['url', 'URL', 'videoUrl', 'watchUrl', 'data', 'message']) {
                const value = record[key];
                if (typeof value === 'string') {
                    const nested = this.extractVideoUrl(value);
                    if (nested) return nested;
                } else if (value && typeof value === 'object') {
                    const nested = this.extractVideoUrl(value);
                    if (nested) return nested;
                }
            }
        }

        return null;
    }
}

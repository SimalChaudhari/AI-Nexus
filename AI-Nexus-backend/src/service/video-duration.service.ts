import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { SpotlightrService } from './spotlightr.service';

const BROWSER_USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

@Injectable()
export class VideoDurationService {
    private readonly logger = new Logger(VideoDurationService.name);

    constructor(private readonly spotlightrService: SpotlightrService) {}

    async detectDurationSeconds(url: string): Promise<number> {
        const trimmed = String(url || '').trim();
        if (!trimmed) {
            throw new Error('Video URL is required');
        }

        const youtubeId = this.extractYouTubeVideoId(trimmed);
        if (youtubeId) {
            return this.detectYouTubeDurationSeconds(youtubeId);
        }

        const spotlightrId = this.extractSpotlightrVideoId(trimmed);
        if (spotlightrId) {
            return this.detectSpotlightrDurationSeconds(spotlightrId);
        }

        return this.detectDirectVideoDurationSeconds(trimmed);
    }

    private extractYouTubeVideoId(url: string): string | null {
        const trimmed = url.trim();
        if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

        let normalized = trimmed;
        if (!/^https?:\/\//i.test(normalized)) {
            normalized = `https://${normalized}`;
        }

        try {
            const parsed = new URL(normalized);
            const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();

            if (host === 'youtu.be') {
                return parsed.pathname.split('/').filter(Boolean)[0] || null;
            }

            if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
                const fromQuery = parsed.searchParams.get('v');
                if (fromQuery) return fromQuery;
                const parts = parsed.pathname.split('/').filter(Boolean);
                const [kind, id] = parts;
                if (id && ['embed', 'shorts', 'live', 'v'].includes(kind)) return id;
            }

            if (host === 'youtube-nocookie.com') {
                const parts = parsed.pathname.split('/').filter(Boolean);
                if (parts[0] === 'embed' && parts[1]) return parts[1];
            }
        } catch {
            // fall through to regex
        }

        const match = trimmed.match(
            /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/|v\/))([a-zA-Z0-9_-]{6,})/,
        );
        return match?.[1] || null;
    }

    private extractSpotlightrVideoId(url: string): string | null {
        const match = String(url || '').trim().match(
            /https?:\/\/[a-z0-9-]+\.cdn\.spotlightr\.com\/watch\/([^/?#]+)/i,
        );
        if (!match) return null;
        const raw = decodeURIComponent(match[1]);
        if (/^\d+$/.test(raw)) return raw;
        const decoded = this.decodeSpotlightrBase64Id(raw);
        return decoded && /^\d+$/.test(decoded) ? decoded : raw;
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

    private async detectYouTubeDurationSeconds(videoId: string): Promise<number> {
        const response = await axios.get(`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`, {
            headers: { 'User-Agent': BROWSER_USER_AGENT },
            timeout: 20000,
            maxContentLength: 5 * 1024 * 1024,
        });

        const html = String(response.data || '');
        const lengthMatch = html.match(/"lengthSeconds":"(\d+)"/);
        if (lengthMatch) {
            const seconds = Number(lengthMatch[1]);
            if (Number.isFinite(seconds) && seconds > 0) return Math.round(seconds);
        }

        const approxMatch = html.match(/"approxDurationMs":"(\d+)"/);
        if (approxMatch) {
            const seconds = Number(approxMatch[1]) / 1000;
            if (Number.isFinite(seconds) && seconds > 0) return Math.round(seconds);
        }

        throw new Error('Could not detect YouTube video duration');
    }

    private async detectSpotlightrDurationSeconds(videoId: string): Promise<number> {
        const fileUrl = await this.spotlightrService.resolveVideoFileUrl(videoId);
        if (!fileUrl) {
            throw new Error('Could not resolve Spotlightr video file for duration detection');
        }
        return this.detectMp4DurationSeconds(fileUrl);
    }

    private async detectDirectVideoDurationSeconds(url: string): Promise<number> {
        const lower = url.toLowerCase();
        if (lower.includes('.mp4') || lower.includes('.webm') || lower.includes('.mov')) {
            return this.detectMp4DurationSeconds(url);
        }
        throw new Error('Unsupported video URL for duration detection');
    }

    private async detectMp4DurationSeconds(fileUrl: string): Promise<number> {
        const response = await axios.get(fileUrl, {
            headers: {
                Range: 'bytes=0-1048575',
                'User-Agent': BROWSER_USER_AGENT,
            },
            responseType: 'arraybuffer',
            timeout: 30000,
            maxContentLength: 2 * 1024 * 1024,
            validateStatus: (status) => status === 200 || status === 206,
        });

        const buffer = Buffer.from(response.data);
        const seconds = this.readMp4DurationSeconds(buffer);
        if (seconds > 0) return seconds;

        throw new Error('Could not read video duration from file metadata');
    }

    private readMp4DurationSeconds(buffer: Buffer): number {
        const marker = Buffer.from('mvhd');
        const idx = buffer.indexOf(marker);
        if (idx < 0 || idx + 36 > buffer.length) return 0;

        const version = buffer[idx + 4];
        if (version === 0) {
            const timescale = buffer.readUInt32BE(idx + 16);
            const duration = buffer.readUInt32BE(idx + 20);
            if (timescale > 0 && duration > 0) return Math.round(duration / timescale);
        } else if (version === 1) {
            const timescale = buffer.readUInt32BE(idx + 24);
            const durationHi = buffer.readUInt32BE(idx + 28);
            const durationLo = buffer.readUInt32BE(idx + 32);
            const duration = durationHi * 2 ** 32 + durationLo;
            if (timescale > 0 && duration > 0) return Math.round(duration / timescale);
        }

        return 0;
    }
}

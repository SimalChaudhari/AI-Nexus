import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

const SPOTLIGHTR_CREATE_VIDEO_URL = 'https://api.spotlightr.com/api/createVideo';

@Injectable()
export class SpotlightrService {
    private readonly logger = new Logger(SpotlightrService.name);

    isConfigured(): boolean {
        return Boolean(String(process.env.SPOTLIGHTR_API_KEY || '').trim());
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
            return url.trim().split('?')[0];
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

const parsePositiveNumber = (value: string | undefined, fallback: number): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

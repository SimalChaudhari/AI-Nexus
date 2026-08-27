import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as os from 'os';

function parsePositiveMs(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function formatMb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

/**
 * Logs process + host memory on an interval so production leaks are visible
 * before the process is OOM-killed.
 */
@Injectable()
export class MemoryWatchService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MemoryWatchService.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastWarnAt = 0;

  onModuleInit(): void {
    const intervalMs = parsePositiveMs(
      process.env.MEMORY_WATCH_INTERVAL_MS,
      process.env.NODE_ENV === 'production' ? 60_000 : 180_000,
    );
    this.logSnapshot('boot');
    this.timer = setInterval(() => this.logSnapshot('watch'), intervalMs);
    this.timer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  getSnapshot() {
    const mem = process.memoryUsage();
    const total = os.totalmem();
    const free = os.freemem();
    const used = Math.max(0, total - free);
    return {
      rss: mem.rss,
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      external: mem.external,
      arrayBuffers: mem.arrayBuffers,
      systemUsed: used,
      systemTotal: total,
      systemFree: free,
      systemUsedPercent: total > 0 ? Math.round((used / total) * 1000) / 10 : 0,
      heapUsedPercentOfRss: mem.rss > 0 ? Math.round((mem.heapUsed / mem.rss) * 1000) / 10 : 0,
    };
  }

  private logSnapshot(reason: string): void {
    const snap = this.getSnapshot();
    const line =
      `[memory:${reason}] rss=${formatMb(snap.rss)} heap=${formatMb(snap.heapUsed)}/${formatMb(snap.heapTotal)} ` +
      `external=${formatMb(snap.external)} system=${snap.systemUsedPercent}% ` +
      `(${formatMb(snap.systemUsed)}/${formatMb(snap.systemTotal)})`;

    const heapRatio = snap.heapTotal > 0 ? snap.heapUsed / snap.heapTotal : 0;
    const warnHeap = heapRatio >= 0.85;
    const warnSystem = snap.systemUsedPercent >= 70;
    const now = Date.now();
    if ((warnHeap || warnSystem) && now - this.lastWarnAt > 60_000) {
      this.lastWarnAt = now;
      this.logger.warn(line);
      return;
    }
    this.logger.log(line);
  }
}

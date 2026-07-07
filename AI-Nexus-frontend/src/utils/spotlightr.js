/**
 * Parse a Spotlightr watch/embed URL into player metadata.
 * @param {string} url
 * @returns {{ cdnHost: string, videoId: string, watchUrl: string, embedUrl: string, scriptUrl: string } | null}
 */
export function parseSpotlightrUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  const match = trimmed.match(/https?:\/\/([^/?#]+)\/watch\/([^/?#]+)/i);
  if (!match || !/spotlightr\.com/i.test(match[1])) return null;

  const host = String(match[1]).replace(/\/+$/, '');
  const videoId = decodeURIComponent(match[2]);
  const watchUrl = trimmed.split('?')[0].split('#')[0];
  const scriptHost = host.includes('.cdn.') ? host : `${host.split('.')[0]}.cdn.spotlightr.com`;

  return {
    cdnHost: host.replace(/\.spotlightr\.com$/i, ''),
    videoId,
    watchUrl,
    embedUrl: buildSpotlightrEmbedUrl(watchUrl),
    scriptUrl: `https://${scriptHost}/assets/spotlightr.js`,
  };
}

/**
 * Spotlightr iframe src — advanced embed (no fallback) when spotlightr.js is loaded;
 * optional `fallback=true` when the script is unavailable.
 */
export function buildSpotlightrWatchEmbedUrl(watchUrl, startSeconds = 0, options = {}) {
  const trimmed = String(watchUrl || '').trim();
  if (!trimmed) return '';
  const base = trimmed.split('?')[0];
  const params = new URLSearchParams();
  if (options?.useFallback === true) params.set('fallback', 'true');
  const start = Math.floor(Number(startSeconds) || 0);
  if (start > 2) params.set('s', String(start));
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/** Standard embed URL with `fallback=true` for reliable iframe playback. */
export function buildSpotlightrEmbedUrl(watchUrl, startSeconds = 0) {
  return buildSpotlightrWatchEmbedUrl(watchUrl, startSeconds, { useFallback: true });
}

/** Update iframe src to resume at `startSeconds` (Spotlightr `s` query param). */
export function applySpotlightrEmbedStart(container, watchUrl, startSeconds, options = {}) {
  const start = Math.floor(Number(startSeconds) || 0);
  if (!(start > 2) || !container) return false;
  const iframe = container.querySelector('iframe');
  if (!iframe) return false;
  const nextSrc = buildSpotlightrWatchEmbedUrl(watchUrl, start, options);
  if (iframe.src === nextSrc) return false;
  iframe.src = nextSrc;
  return true;
}

/** Turn off Spotlightr theme forward-seek lock (single call — invalid methods spam console errors). */
export function unlockSpotlightrForwardSeeking(videoId, container = null, preferredId = null) {
  if (!isSpotlightrApiAvailable()) return false;

  const api = window.spotlightrAPI || window.vooAPI;
  const id = preferredId
    ? String(preferredId)
    : resolveSpotlightrApiId(videoId, container);
  if (!id) return false;

  try {
    api(id, 'disableForwardSeeking', false);
    return true;
  } catch {
    return false;
  }
}

/**
 * Official Spotlightr advanced embed: script tag immediately before iframe in the same container.
 * @returns {HTMLIFrameElement|null}
 */
export function mountSpotlightrEmbed(container, options = {}) {
  if (!container) return null;

  const watchUrl = String(options?.watchUrl || '').trim();
  const videoId = String(options?.videoId || '').trim();
  const scriptUrl = String(options?.scriptUrl || '').trim();
  const startSeconds = Number(options?.startSeconds || 0);
  // Advanced embed (spotlightr.js + plain watch URL). Fallback only when no script is loaded.
  const useFallback = options?.useFallback ?? !scriptUrl;
  if (!watchUrl || !videoId) return null;

  while (container.firstChild) container.removeChild(container.firstChild);

  const iframe = document.createElement('iframe');
  iframe.className = 'video-player-container spotlightr';
  iframe.dataset.playerid = videoId;
  iframe.setAttribute('data-playerid', videoId);
  iframe.setAttribute('watch-type', '');
  iframe.setAttribute('url-params', '');
  iframe.src = buildSpotlightrWatchEmbedUrl(watchUrl, startSeconds, { useFallback });
  iframe.allow = 'autoplay; fullscreen; encrypted-media; picture-in-picture';
  iframe.allowFullscreen = true;
  iframe.setAttribute('playsinline', 'true');
  iframe.setAttribute('webkit-playsinline', 'true');
  iframe.setAttribute('allowtransparency', 'true');
  iframe.frameBorder = '0';
  iframe.scrolling = 'no';
  iframe.name = 'videoPlayerframe';
  iframe.title = options?.title || 'Course video';
  iframe.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0';
  container.appendChild(iframe);

  return iframe;
}

/** @param {string} url */
export function isSpotlightrUrl(url) {
  return Boolean(parseSpotlightrUrl(url));
}

/** Decode Spotlightr base64 watch path segment (e.g. MTk4ODA0NA== → 1988044). */
export function decodeSpotlightrBase64Id(videoId) {
  if (!videoId) return null;
  try {
    const normalized = String(videoId).replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    return atob(padded);
  } catch {
    return null;
  }
}

/** Candidate player ids Spotlightr may register for the same watch URL. */
export function getSpotlightrPlayerIdCandidates(videoId) {
  if (!videoId) return [];
  const raw = String(videoId).trim();
  const out = [];
  const add = (value) => {
    const next = String(value || '').trim();
    if (next && !out.includes(next)) out.push(next);
  };

  add(raw);
  add(encodeURIComponent(raw));
  const decoded = decodeSpotlightrBase64Id(raw);
  if (decoded) add(decoded);
  if (/^\d+$/.test(raw)) {
    try {
      add(btoa(raw));
    } catch {
      // ignore
    }
  }
  return out;
}

/** True when two Spotlightr ids refer to the same video (base64 vs numeric, etc.). */
export function spotlightrPlayerIdsMatch(a, b) {
  if (a == null || b == null) return false;
  const left = getSpotlightrPlayerIdCandidates(a);
  const right = getSpotlightrPlayerIdCandidates(b);
  return left.some((id) => right.includes(id));
}

export function isAppleMobileDevice() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return navigator.platform === 'MacIntel' && Number(navigator.maxTouchPoints) > 1;
}

/** @returns {boolean} */
export function isSpotlightrApiAvailable() {
  if (typeof window === 'undefined') return false;
  return typeof (window.spotlightrAPI || window.vooAPI) === 'function';
}

/** Normalize Spotlightr API time/duration callback payloads. */
export function normalizeSpotlightrTime(value) {
  if (value == null) return 0;
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, value);
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }
  if (typeof value === 'object') {
    const nested =
      value.returnValue ?? value.currentTime ?? value.time ?? value.value ?? value.duration;
    return normalizeSpotlightrTime(nested);
  }
  return 0;
}

/** Resolve the player id Spotlightr registered (iframe data-playerid beats URL segment). */
export function resolveSpotlightrApiId(videoId, container = null) {
  const iframe = container?.querySelector?.('iframe');
  const fromIframe =
    iframe?.dataset?.playerid ||
    iframe?.getAttribute('data-playerid') ||
    iframe?.getAttribute('data-player-id');
  if (fromIframe) return String(fromIframe);
  const candidates = getSpotlightrPlayerIdCandidates(videoId);
  return candidates[0] || String(videoId || '');
}

/** Read current playback time — one call per poll; sequential getTime fallback only when needed. */
export function readSpotlightrPlayerTime(videoId, callback, options = {}) {
  if (typeof callback !== 'function') return;
  const container = options?.container ?? null;
  const resolvedId = resolveSpotlightrApiId(videoId, container);
  const finish = (value) => callback(normalizeSpotlightrTime(value));

  callSpotlightrApi(
    resolvedId,
    'getCurrentTime',
    null,
    (value) => {
      const t = normalizeSpotlightrTime(value);
      if (t > 0) {
        finish(t);
        return;
      }
      callSpotlightrApi(resolvedId, 'getTime', null, (fallback) => finish(fallback), { container });
    },
    { container }
  );
}

/** Read video duration — getDuration with getTime(['duration']) fallback. */
export function readSpotlightrPlayerDuration(videoId, callback, options = {}) {
  if (typeof callback !== 'function') return;
  const container = options?.container ?? null;
  const resolvedId = resolveSpotlightrApiId(videoId, container);
  const finish = (value) => callback(normalizeSpotlightrTime(value));

  callSpotlightrApi(
    resolvedId,
    'getDuration',
    null,
    (value) => {
      const d = normalizeSpotlightrTime(value);
      if (d > 0) {
        finish(d);
        return;
      }
      callSpotlightrApi(
        resolvedId,
        'getTime',
        ['duration'],
        (fallback) => finish(fallback),
        { container }
      );
    },
    { container }
  );
}

/** Seek player to `seconds` — single setter to avoid seek/timeupdate loops. */
export function seekSpotlightrPlayer(videoId, seconds, callback, options = {}) {
  const target = Math.max(0, Number(seconds) || 0);
  const container = options?.container ?? null;
  const id = resolveSpotlightrApiId(videoId, container);
  callSpotlightrApi(id, 'setTime', [target], null, { container });
  callback?.(true);
}

/**
 * Call Spotlightr JS API (global spotlightrAPI or legacy vooAPI).
 */
export function callSpotlightrApi(videoId, method, param, callback, options = {}) {
  if (typeof window === 'undefined') return;
  const api = window.spotlightrAPI || window.vooAPI;
  if (typeof api !== 'function') return;

  const container = options?.container ?? null;
  const id = resolveSpotlightrApiId(videoId, container);

  if (callback) {
    if (param !== undefined && param !== null) {
      api(id, method, param, callback);
    } else {
      api(id, method, null, callback);
    }
    return;
  }

  if (param !== undefined && param !== null) {
    api(id, method, param);
  } else {
    api(id, method);
  }
}

/** Load spotlightr.js once per CDN host; resolves when vooAPI / spotlightrAPI is callable. */
export function loadSpotlightrScript(scriptUrl, options = {}) {
  const timeoutMs = options?.timeoutMs ?? 15000;

  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      resolve(false);
      return;
    }

    const finish = (loaded) => resolve(Boolean(loaded));

    const waitForApi = (startedAt) => {
      if (window.spotlightrAPI || window.vooAPI) {
        finish(true);
        return;
      }
      if (Date.now() - startedAt > timeoutMs) {
        finish(false);
        return;
      }
      window.setTimeout(() => waitForApi(startedAt), 50);
    };

    const markLoaded = (script) => {
      if (script) script.dataset.loaded = 'true';
    };

    const existing = document.querySelector(`script[data-spotlightr="${scriptUrl}"]`);
    if (existing) {
      if (window.spotlightrAPI || window.vooAPI) {
        markLoaded(existing);
        finish(true);
        return;
      }
      if (existing.dataset.loaded === 'true') {
        waitForApi(Date.now());
        return;
      }
      existing.addEventListener(
        'load',
        () => {
          markLoaded(existing);
          waitForApi(Date.now());
        },
        { once: true }
      );
      existing.addEventListener(
        'error',
        () => reject(new Error('Failed to load Spotlightr player')),
        { once: true }
      );
      return;
    }

    const script = document.createElement('script');
    script.src = scriptUrl;
    script.async = true;
    script.dataset.spotlightr = scriptUrl;
    script.onload = () => {
      markLoaded(script);
      waitForApi(Date.now());
    };
    script.onerror = () => reject(new Error('Failed to load Spotlightr player'));
    document.head.appendChild(script);
  });
}

/**
 * Wait until Spotlightr player API is ready (vooPlayerReady or timeout fallback).
 * @returns {Promise<string|null>} Canonical API player id, or null when API is unavailable.
 */
export function waitForSpotlightrPlayer(videoId, options = {}) {
  const timeoutMs = options?.timeoutMs ?? 12000;
  const container = options?.container ?? null;

  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve(null);
      return;
    }

    let settled = false;
    const finish = (playerId) => {
      if (settled) return;
      settled = true;
      document.removeEventListener('vooPlayerReady', onReady);
      clearTimeout(timer);
      clearInterval(pollTimer);
      resolve(playerId || null);
    };

    const acceptPlayerId = (rawId) => {
      if (!rawId) return;
      const playerId = String(rawId);
      if (!videoId || spotlightrPlayerIdsMatch(playerId, videoId)) {
        finish(playerId);
        return;
      }
      // Pasted URLs often use base64 in the path while the API registers a numeric id.
      if (container?.querySelector('iframe')) {
        const iframe = container.querySelector('iframe');
        iframe.dataset.playerid = playerId;
        iframe.setAttribute('data-playerid', playerId);
        finish(playerId);
      }
    };

    const onReady = (event) => {
      const detailId =
        event?.detail?.playerId ??
        event?.detail?.videoId ??
        event?.detail?.id ??
        event?.playerId ??
        event?.videoId;
      acceptPlayerId(detailId);
    };

    document.addEventListener('vooPlayerReady', onReady);

    const pollTimer = setInterval(() => {
      const iframe = container?.querySelector?.('iframe[data-playerid], iframe.spotlightr, iframe');
      const pid =
        iframe?.dataset?.playerid ||
        iframe?.getAttribute('data-playerid') ||
        iframe?.getAttribute('data-player-id');
      if (pid) acceptPlayerId(pid);
    }, 250);

    const timer = setTimeout(() => {
      if (!window.spotlightrAPI && !window.vooAPI) {
        finish(null);
        return;
      }
      const candidates = getSpotlightrPlayerIdCandidates(videoId);
      finish(candidates[0] || videoId || null);
    }, timeoutMs);
  });
}

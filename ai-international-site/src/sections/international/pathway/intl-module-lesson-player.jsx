'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { LessonVideoCoverageStrip } from 'src/components/lesson-video-coverage-strip';
import { resolveAssetUrl } from 'src/utils/asset-url';
import {
  appendCoverageSlice,
  clipCoverageRanges,
  coverageMeasureSeconds,
  coveragePercentDisplay,
  parseCoverageRangePairs,
  precisePlaybackSeconds,
  roundedVideoDurationSeconds,
  sealCoverageRangesToVideoEnd,
  sealCoverageRangesWhenComplete,
  serializeCoverageRangesPrecise,
} from 'src/utils/video-coverage';
import {
  saveIntlModuleProgress,
  saveIntlModuleProgressOnUnload,
  flushPendingIntlModuleProgress,
  registerActiveIntlProgressFlusher,
  consumeSkipNextUnmountPersist,
} from 'src/utils/intl-module-progress-save';
import { intlPathwayProgressService } from 'src/services/intl-pathway-progress.service';
import { isIntlAuthenticated } from 'src/auth/intl-session';
import {
  bookmarkSecondsFromProgress,
  mergeProgressRow,
  readCachedModuleProgress,
  writeCachedModuleProgress,
} from 'src/utils/intl-progress-cache';
import { getYouTubeEmbedIframeSrc, getYouTubeVideoId } from 'src/utils/youtube';
import {
  callSpotlightrApi,
  isSpotlightrApiAvailable,
  loadSpotlightrScript,
  mountSpotlightrEmbed,
  normalizeSpotlightrTime,
  parseSpotlightrUrl,
  readSpotlightrPlayerDuration,
  readSpotlightrPlayerTime,
  seekSpotlightrPlayer,
  unlockSpotlightrForwardSeeking,
  waitForSpotlightrPlayer,
} from 'src/utils/spotlightr';

/** Fort uses ~50s; only while playing — not every few seconds when paused with coverage. */
const HEARTBEAT_MS = 50000;
const FIRST_SAVE_MS = 2500;
const POLL_MS = 300;
/** Fort: scrub/jump larger than this must not fill unique coverage. */
const JUMP_GAP_SEC = 2.75;
/** Max wall-clock credit per poll tick (API often returns 0 inside Spotlightr). */
const WALL_CLOCK_STEP_SEC = 1.25;

function isDirectVideoUrl(url) {
  if (!url) return false;
  const cleaned = String(url).split('?')[0].split('#')[0].toLowerCase();
  return /\.(mp4|webm|ogg|m4v|mov)$/.test(cleaned) || cleaned.includes('/uploads/');
}

function resolveKind(videoUrl) {
  const raw = String(videoUrl || '').trim();
  if (!raw) return { kind: 'empty' };
  const youtubeId = getYouTubeVideoId(raw);
  if (youtubeId) return { kind: 'youtube', youtubeId, src: getYouTubeEmbedIframeSrc(raw) };
  const spotlightr = parseSpotlightrUrl(raw);
  if (spotlightr) return { kind: 'spotlightr', spotlightr };
  const resolved = resolveAssetUrl(raw);
  if (isDirectVideoUrl(resolved) || isDirectVideoUrl(raw)) return { kind: 'video', src: resolved };
  if (/^https?:\/\//i.test(resolved)) return { kind: 'iframe', src: resolved };
  return { kind: 'empty' };
}

function loadYouTubeApi() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }
    if (window.YT?.Player) {
      resolve(true);
      return;
    }
    const existing = document.querySelector('script[data-yt-iframe-api]');
    const ready = () => resolve(Boolean(window.YT?.Player));
    window.onYouTubeIframeAPIReady = ready;
    if (existing) {
      window.setTimeout(ready, 400);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.dataset.ytIframeApi = '1';
    script.onload = () => window.setTimeout(ready, 200);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

export function IntlModuleLessonPlayer({
  code,
  title,
  videoUrl,
  requiredSecondsHint = 0,
  progress: progressProp = null,
  onProgress,
  courseId = '',
  moduleId = '',
  sectionId = '',
}) {
  const media = useMemo(() => resolveKind(videoUrl), [videoUrl]);
  const lmsIdsRef = useRef({ courseId: '', moduleId: '', sectionId: '' });
  lmsIdsRef.current = {
    courseId: String(courseId || '').trim(),
    moduleId: String(moduleId || '').trim(),
    sectionId: String(sectionId || '').trim(),
  };
  const videoRef = useRef(null);
  const youtubeHostRef = useRef(null);
  const youtubePlayerRef = useRef(null);
  const spotlightrHostRef = useRef(null);
  const spotlightrPlayerIdRef = useRef('');
  const rangesRef = useRef([]);
  const lastTimeRef = useRef(0);
  const playingRef = useRef(false);
  const lastTickAtMsRef = useRef(0);
  const seekingUntilRef = useRef(0);
  const lastSeekTargetRef = useRef(null);
  const durationRef = useRef(0);
  const progressRef = useRef(null);
  const saveInFlightRef = useRef(false);
  const pendingPersistRef = useRef(false);
  const lastPersistAtRef = useRef(0);
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;
  const progressPropRef = useRef(progressProp);
  progressPropRef.current = progressProp;
  const applyTickRef = useRef(() => {});
  const userJumpedRef = useRef(false);
  const resumeFnRef = useRef(() => {});
  const lastAppliedBookmarkRef = useRef(0);
  const resumeAppliedRef = useRef(false);
  const serverHydratedRef = useRef(false);
  const getBookmarkRef = useRef(() => 0);
  /** True only after Spotlightr/native reports real length — catalog minutes are often too short. */
  const playerDurationTrustedRef = useRef(false);
  /** Last real Spotlightr API time — never invent coverage from 0:00 when API returns 0. */
  const lastGoodApiTimeRef = useRef({ t: 0, at: 0 });

  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [ranges, setRanges] = useState([]);
  const [progress, setProgress] = useState(null);
  const [mediaReady, setMediaReady] = useState(false);

  const requiredHintRef = useRef(requiredSecondsHint);
  requiredHintRef.current = requiredSecondsHint;

  const isLikelyCatalogDuration = useCallback((sec) => {
    const hint = Math.max(0, Number(requiredHintRef.current) || 0);
    const d = Math.max(0, Number(sec) || 0);
    if (!(d > 0) || !(hint > 0)) return false;
    return Math.abs(d - hint) <= 90;
  }, []);

  const ensureMinDuration = useCallback((sec, { trusted = false } = {}) => {
    const next = roundedVideoDurationSeconds(sec);
    if (!(next > 0)) return durationRef.current;
    const hint = Math.max(0, Number(requiredHintRef.current) || 0);
    const catalogLike = hint > 0 && Math.abs(next - hint) <= 90;
    const clearlyLongerThanCatalog = hint > 0 && next > hint + 120;
    if (trusted && (clearlyLongerThanCatalog || !(hint > 0))) {
      playerDurationTrustedRef.current = true;
    }
    // Catalog minutes are a valid provisional timeline for the strip (e.g. 8:00).
    // Never replace them with the playhead alone — that parked the red bar at the "end".
    if (catalogLike && !playerDurationTrustedRef.current) {
      if (next >= durationRef.current) {
        durationRef.current = next;
        setDuration(next);
      }
      return durationRef.current;
    }
    if (next > durationRef.current) {
      durationRef.current = next;
      setDuration(next);
    }
    return durationRef.current;
  }, []);

  /** Update bookmark/UI only — never paint coverage for a scrub/jump (Fort LMS). */
  const syncPlayheadOnly = useCallback(
    (time, dur) => {
      const t = Math.max(0, Number(time) || 0);
      const reported = roundedVideoDurationSeconds(Number(dur) || 0);
      const looksLikePlayheadCap = t > 2 && reported > 0 && reported <= t + 2.5;
      // Only grow timeline from a reported duration — never from playhead `t`.
      if (reported > 0 && !looksLikePlayheadCap) ensureMinDuration(reported);
      else if (!(durationRef.current > 0)) {
        const hint = Math.max(0, Number(requiredHintRef.current) || 0);
        if (hint > 0) ensureMinDuration(hint);
      }
      const d = roundedVideoDurationSeconds(
        Math.max(durationRef.current, looksLikePlayheadCap ? 0 : reported, Number(requiredHintRef.current) || 0),
      );
      lastTimeRef.current = t;
      lastTickAtMsRef.current = Date.now();
      if (t > 0) lastGoodApiTimeRef.current = { t, at: Date.now() };
      setCurrentTime(t);
      if (d > 0) {
        durationRef.current = Math.max(durationRef.current, d);
        setDuration(durationRef.current);
      }
      setRanges([...rangesRef.current]);

      const timeline = Math.max(durationRef.current, d, Number(requiredHintRef.current) || 0);
      const watched = coverageMeasureSeconds(rangesRef.current, timeline);
      const hintReq = Math.max(0, Number(requiredHintRef.current) || 0);
      const savedReq = Math.max(0, Number(progressRef.current?.requiredSeconds) || 0);
      const catalogOrSaved = savedReq > 0 ? savedReq : hintReq;
      const required =
        timeline > 0
          ? catalogOrSaved > 0 && timeline > catalogOrSaved + 120
            ? timeline
            : catalogOrSaved > 0
              ? Math.min(catalogOrSaved, timeline)
              : timeline
          : catalogOrSaved;
      const live = {
        ...(progressRef.current || {}),
        lastPositionSeconds: t,
        watchedSeconds: watched,
        durationSeconds: timeline,
        videoDurationSeconds: timeline,
        requiredSeconds: required,
        watchedCoverageRanges: rangesRef.current,
        completionPercent: coveragePercentDisplay(watched, timeline, {
          isComplete: Boolean(progressRef.current?.isCompleted),
        }),
        isCompleted: Boolean(progressRef.current?.isCompleted),
      };
      progressRef.current = mergeProgressRow(progressRef.current, live);
      writeCachedModuleProgress(code, live);
      onProgressRef.current?.(code, progressRef.current);
    },
    [code, ensureMinDuration],
  );

  const applyTick = useCallback((time, dur, { ended = false } = {}) => {
    const t = Math.max(0, Number(time) || 0);
    const reported = roundedVideoDurationSeconds(Number(dur) || 0);
    const looksLikePlayheadCap = t > 2 && reported > 0 && reported <= t + 2.5;
    if (reported > 0 && !looksLikePlayheadCap) {
      ensureMinDuration(reported, {
        trusted: reported > (Number(requiredHintRef.current) || 0) + 120,
      });
    } else if (!(durationRef.current > 0)) {
      const hint = Math.max(0, Number(requiredHintRef.current) || 0);
      if (hint > 0) ensureMinDuration(hint);
    }
    const d = roundedVideoDurationSeconds(
      Math.max(
        looksLikePlayheadCap ? 0 : reported,
        durationRef.current,
        Number(requiredHintRef.current) || 0,
        ended ? t : 0,
      ),
    );
    if (d > 0) durationRef.current = Math.max(durationRef.current, d);
    const savedBookmark = bookmarkSecondsFromProgress(progressRef.current, d);
    // Block only boot-time 0:00 ticks before LMS resume — never while playing.
    if (
      !userJumpedRef.current &&
      !ended &&
      !playingRef.current &&
      !resumeAppliedRef.current &&
      t < 1.25 &&
      savedBookmark > 2
    ) {
      return;
    }
    const prev = Math.max(0, Number(lastTimeRef.current) || 0);
    const now = Date.now();
    const wallMs = lastTickAtMsRef.current > 0 ? now - lastTickAtMsRef.current : null;
    const durationCap = playerDurationTrustedRef.current && d > 0 ? d : 7200;
    // Cap like Fort + hard seek guard: jumps must not fill 0→scrub as watched.
    const maxAccept = Math.min(
      8,
      wallMs != null
        ? Math.min(durationCap, Math.max(2.5, (wallMs / 1000) * 1.5 + 1.5))
        : 2.5,
    );
    const forwardDelta = t - prev;
    const isJump = !ended && Math.abs(forwardDelta) > Math.max(JUMP_GAP_SEC, maxAccept);
    if (isJump) {
      userJumpedRef.current = true;
      resumeAppliedRef.current = true;
      syncPlayheadOnly(t, d);
      return;
    }

    const isForwardStep = forwardDelta > 0.05 && forwardDelta <= maxAccept;
    // Fort Spotlightr: a valid forward poll step invents playing AND appends coverage.
    // Waiting for onPlay alone broke SPA-open progress until full page refresh.
    if (isForwardStep && !playingRef.current) {
      playingRef.current = true;
      resumeAppliedRef.current = true;
    }

    if (ended) {
      appendCoverageSlice(rangesRef, prev, t, d, { atEnd: true, wallElapsedMs: wallMs });
      if (d > 0) {
        rangesRef.current = sealCoverageRangesToVideoEnd(rangesRef.current, d);
        rangesRef.current = sealCoverageRangesWhenComplete(rangesRef.current, d);
      }
    } else if (isForwardStep) {
      appendCoverageSlice(rangesRef, prev, t, d, { atEnd: false, wallElapsedMs: wallMs });
    }

    lastTimeRef.current = t;
    if (playingRef.current || isForwardStep) lastTickAtMsRef.current = now;
    setCurrentTime(t);
    if (d > 0) setDuration(d);
    setRanges([...rangesRef.current]);

    const watched = coverageMeasureSeconds(rangesRef.current, d);
    const hintReq = Math.max(0, Number(requiredHintRef.current) || 0);
    const savedReq = Math.max(0, Number(progressRef.current?.requiredSeconds) || 0);
    const catalogOrSaved = savedReq > 0 ? savedReq : hintReq;
    const required =
      d > 0
        ? catalogOrSaved > 0 && d > catalogOrSaved + 120
          ? d
          : catalogOrSaved > 0
            ? Math.min(catalogOrSaved, d)
            : d
        : catalogOrSaved;
    const justCompleted = required > 0 && watched >= required;
    const live = {
      ...(progressRef.current || {}),
      lastPositionSeconds: t,
      watchedSeconds: watched,
      durationSeconds: d,
      videoDurationSeconds: d,
      requiredSeconds: required,
      watchedCoverageRanges: rangesRef.current,
      completionPercent: coveragePercentDisplay(watched, d, {
        isComplete: Boolean(progressRef.current?.isCompleted) || justCompleted,
      }),
      isCompleted: Boolean(progressRef.current?.isCompleted) || justCompleted,
    };
    progressRef.current = mergeProgressRow(progressRef.current, live);
    writeCachedModuleProgress(code, live);
    onProgressRef.current?.(code, progressRef.current);
  }, [code, ensureMinDuration, syncPlayheadOnly]);

  const buildPayload = useCallback(() => {
    const playerDur = roundedVideoDurationSeconds(durationRef.current);
    const lastPos = precisePlaybackSeconds(lastTimeRef.current);
    // Never persist short catalog placeholders as video duration — that clips jump ranges.
    const persistDur =
      playerDurationTrustedRef.current || (playerDur > 0 && !isLikelyCatalogDuration(playerDur))
        ? Math.max(playerDur, Math.ceil(lastPos))
        : lastPos > playerDur
          ? Math.ceil(lastPos)
          : playerDur > 0 && lastPos > 0
            ? Math.max(playerDur, Math.ceil(lastPos))
            : 0;
    const sealed =
      persistDur > 0 ? sealCoverageRangesWhenComplete(rangesRef.current, persistDur) : rangesRef.current;
    const watched = coverageMeasureSeconds(sealed, persistDur);
    const lms = lmsIdsRef.current || {};
    return {
      // Fort: lastPosition is float (double precision) — never Math.round.
      lastPositionSeconds: lastPos,
      watchedSeconds: Number(Math.max(0, watched).toFixed(2)),
      durationSeconds: Math.max(0, Math.round(Number(persistDur) || 0)),
      watchedCoverageRanges: serializeCoverageRangesPrecise(sealed),
      ...(lms.courseId ? { courseId: lms.courseId } : {}),
      ...(lms.moduleId ? { moduleId: lms.moduleId } : {}),
      ...(lms.sectionId ? { sectionId: lms.sectionId } : {}),
    };
  }, [isLikelyCatalogDuration]);

  const hasMeaningfulProgress = useCallback((payload) => {
    if (!payload) return false;
    if (Array.isArray(payload.watchedCoverageRanges) && payload.watchedCoverageRanges.length > 0) {
      return true;
    }
    return Number(payload.watchedSeconds) > 0 || Number(payload.lastPositionSeconds) > 0;
  }, []);

  const persist = useCallback(
    async ({ keepalive = false, force = false } = {}) => {
      if (!code) return null;
      const payload = buildPayload();
      if (!hasMeaningfulProgress(payload)) return null;
      const now = Date.now();
      if (!keepalive && !force && now - lastPersistAtRef.current < 1500) return null;
      lastPersistAtRef.current = now;
      payload.lastPositionSeconds = precisePlaybackSeconds(lastTimeRef.current);
      writeCachedModuleProgress(code, {
        ...(progressRef.current || {}),
        ...payload,
      });
      onProgressRef.current?.(code, { ...(progressRef.current || {}), ...payload });
      if (keepalive) {
        saveIntlModuleProgressOnUnload(code, payload);
        return null;
      }
      if (saveInFlightRef.current) {
        pendingPersistRef.current = true;
        return null;
      }
      saveInFlightRef.current = true;
      let data = null;
      try {
        data = await saveIntlModuleProgress(code, payload);
        if (data) {
          progressRef.current = mergeProgressRow(progressRef.current, data);
          setProgress(progressRef.current);
          writeCachedModuleProgress(code, data);
          onProgressRef.current?.(code, progressRef.current);
        }
      } catch (error) {
        console.error('[intl-pathway] save progress failed', code, error);
        data = null;
      } finally {
        saveInFlightRef.current = false;
      }
      if (pendingPersistRef.current) {
        pendingPersistRef.current = false;
        void persist({ force: true });
      }
      return data;
    },
    [buildPayload, code, hasMeaningfulProgress],
  );

  applyTickRef.current = applyTick;

  const syncPlayheadOnlyRef = useRef(syncPlayheadOnly);
  syncPlayheadOnlyRef.current = syncPlayheadOnly;

  const ensureMinDurationRef = useRef(ensureMinDuration);
  ensureMinDurationRef.current = ensureMinDuration;

  const persistRef = useRef(persist);
  persistRef.current = persist;

  // Register so accordion / module navigation can PUT progress before this player unmounts.
  // Fort: one forced PUT on leave (useLayoutEffect cleanup) — no per-section GET on enter.
  useEffect(() => {
    const flush = async () => {
      // Wait out an in-flight save so navigate flush does not return early with null.
      for (let i = 0; i < 50 && saveInFlightRef.current; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => {
          window.setTimeout(resolve, 40);
        });
      }
      return persistRef.current({ force: true });
    };
    registerActiveIntlProgressFlusher(flush);
    return () => {
      registerActiveIntlProgressFlusher(null);
      if (consumeSkipNextUnmountPersist()) return;
      void persistRef.current({ force: true });
    };
  }, [code]);

  const getBookmarkSeconds = useCallback(() => {
    const row =
      progressRef.current || progressPropRef.current || readCachedModuleProgress(code);
    return bookmarkSecondsFromProgress(row, durationRef.current);
  }, [code]);
  getBookmarkRef.current = getBookmarkSeconds;

  useEffect(() => {
    userJumpedRef.current = false;
    lastAppliedBookmarkRef.current = 0;
    resumeAppliedRef.current = false;
    serverHydratedRef.current = false;
    playerDurationTrustedRef.current = false;
    lastGoodApiTimeRef.current = { t: 0, at: 0 };
    playingRef.current = false;
    lastTimeRef.current = 0;
    lastTickAtMsRef.current = 0;
    lastSeekTargetRef.current = null;
    seekingUntilRef.current = 0;
    rangesRef.current = [];
    progressRef.current = null;
    saveInFlightRef.current = false;
    pendingPersistRef.current = false;
    lastPersistAtRef.current = 0;
    setCurrentTime(0);
    setRanges([]);
    setProgress(null);
    // Seed strip length from catalog minutes immediately (e.g. 8:00) — never from playhead.
    const hint = Math.max(0, Number(requiredHintRef.current) || 0);
    const seeded = Math.max(
      Number(progressPropRef.current?.durationSeconds) || 0,
      Number(progressPropRef.current?.videoDurationSeconds) || 0,
    );
    if (hint > 0) {
      durationRef.current = roundedVideoDurationSeconds(hint);
    } else if (seeded > 0) {
      durationRef.current = roundedVideoDurationSeconds(seeded);
    } else {
      durationRef.current = 0;
    }
    setDuration(durationRef.current);
  }, [code]);

  const applyProgressRow = useCallback((row, { fromServer = false } = {}) => {
    if (!row) {
      if (fromServer) {
        progressRef.current = null;
        rangesRef.current = [];
        lastTimeRef.current = 0;
        setProgress(null);
        setRanges([]);
        setCurrentTime(0);
      }
      return null;
    }
    const merged = mergeProgressRow(progressRef.current, row, { allowReset: fromServer });
    progressRef.current = merged;
    setProgress(merged);
    rangesRef.current = parseCoverageRangePairs(merged.watchedCoverageRanges);
    const bookmark = bookmarkSecondsFromProgress(merged, durationRef.current);
    if (!playingRef.current && bookmark > 2 && (Number(lastTimeRef.current) || 0) < bookmark - 1) {
      lastTimeRef.current = bookmark;
    } else if (fromServer && bookmark <= 0) {
      lastTimeRef.current = 0;
    }
    const incomingDur = Math.max(
      Number(merged.durationSeconds || merged.videoDurationSeconds) || 0,
      Number(requiredHintRef.current) || 0,
    );
    // Never use bookmark/playhead as duration — that parked the red bar at the strip end.
    if (
      incomingDur > durationRef.current &&
      !(playerDurationTrustedRef.current && isLikelyCatalogDuration(incomingDur))
    ) {
      durationRef.current = roundedVideoDurationSeconds(incomingDur);
    }
    setRanges([...rangesRef.current]);
    setCurrentTime(lastTimeRef.current);
    if (durationRef.current > 0) setDuration(durationRef.current);
    writeCachedModuleProgress(code, merged);
    return merged;
  }, [code, isLikelyCatalogDuration]);

  useEffect(() => {
    let active = true;
    // Mount player immediately — do not block 2nd video on GET (Spotlightr race).
    setMediaReady(true);
    // Seed from parent map / memory immediately (Fort sidebar live map).
    const seed =
      progressPropRef.current ||
      readCachedModuleProgress(code) ||
      null;
    applyProgressRow(seed);
    serverHydratedRef.current = Boolean(seed);

    (async () => {
      try {
        await flushPendingIntlModuleProgress();
      } catch {
        // ignore
      }
      // Fetch this module's saved coverage on open — empty DB must reset playhead to 0:00.
      if (code && isIntlAuthenticated()) {
        try {
          const remote = await intlPathwayProgressService.getModuleProgress(code);
          if (!active) return;
          if (remote && typeof remote === 'object') {
            const remoteCode = String(remote.pathwayCode || remote.code || '').trim();
            // Ignore a row that belongs to another pathway module (shared LMS ids).
            if (remoteCode && remoteCode !== code) {
              if (!playingRef.current && !(rangesRef.current.length > 0)) {
                applyProgressRow(null, { fromServer: true });
              }
            } else {
              applyProgressRow(remote, { fromServer: true });
              onProgressRef.current?.(code, remote);
            }
            serverHydratedRef.current = true;
          } else if (!playingRef.current && !(rangesRef.current.length > 0) && !(lastTimeRef.current > 0.5)) {
            applyProgressRow(null, { fromServer: true });
            serverHydratedRef.current = true;
          } else {
            serverHydratedRef.current = true;
          }
        } catch {
          // offline / 401 — keep seed
        }
      }
      if (!active) return;
      if (pendingPersistRef.current || (playingRef.current && lastTimeRef.current > 0.5)) {
        void persistRef.current({ force: true });
      }
    })();
    return () => {
      active = false;
    };
    // Only re-hydrate when the lesson code changes — not when applyProgressRow identity shifts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const hydratedFromPropRef = useRef(false);
  useEffect(() => {
    hydratedFromPropRef.current = false;
  }, [code]);

  useEffect(() => {
    if (!mediaReady || !progressProp || playingRef.current) return;
    const hasCoverage =
      Boolean(progressProp.isCompleted) ||
      Number(progressProp.watchedSeconds) > 0 ||
      Number(progressProp.lastPositionSeconds) > 2 ||
      (Array.isArray(progressProp.watchedCoverageRanges) &&
        progressProp.watchedCoverageRanges.length > 0);
    if (!hasCoverage) return;
    // Re-apply when parent map catches up after open (list/planner race).
    const prevWatched = Number(progressRef.current?.watchedSeconds) || 0;
    const nextWatched = Number(progressProp.watchedSeconds) || 0;
    if (hydratedFromPropRef.current && nextWatched <= prevWatched) return;
    hydratedFromPropRef.current = true;
    applyProgressRow(progressProp);
    window.setTimeout(() => resumeFnRef.current?.(), 80);
  }, [applyProgressRow, mediaReady, progressProp]);

  useEffect(() => {
    const first = window.setTimeout(() => {
      // Only persist after real playback — not because resume/playhead was non-zero.
      if (playingRef.current) {
        void persistRef.current({ force: true });
      }
    }, FIRST_SAVE_MS);
    const timer = window.setInterval(() => {
      if (playingRef.current) {
        void persistRef.current({ force: true });
      }
    }, HEARTBEAT_MS);
    const onHide = () => {
      if (document.visibilityState === 'hidden') void persistRef.current({ keepalive: true, force: true });
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
      // Leave-save is owned by the flusher / register cleanup (Fort: one PUT on section switch).
    };
  }, [code]);

  const snapPlayhead = useCallback((seconds) => {
    const cap = durationRef.current;
    const t = Math.max(0, cap > 0 ? Math.min(cap, Number(seconds) || 0) : Number(seconds) || 0);
    lastTimeRef.current = t;
    lastTickAtMsRef.current = Date.now();
    seekingUntilRef.current = Date.now() + 4000;
    lastSeekTargetRef.current = t;
    setCurrentTime(t);
    return t;
  }, []);

  const seekTo = useCallback((seconds, { fromUser = false } = {}) => {
    if (fromUser) {
      userJumpedRef.current = true;
      resumeAppliedRef.current = true;
    }
    const t = snapPlayhead(seconds);
    if (fromUser) {
      syncPlayheadOnly(t, durationRef.current);
      void persistRef.current({ force: true });
    }
    const native = videoRef.current;
    if (native && typeof native.currentTime === 'number') {
      native.currentTime = t;
    }
    const yt = youtubePlayerRef.current;
    if (yt?.seekTo) yt.seekTo(t, true);

    const container = spotlightrHostRef.current;
    const playerId = spotlightrPlayerIdRef.current || parseSpotlightrUrl(videoUrl)?.videoId;
    if (!playerId || !container) return t;

    unlockSpotlightrForwardSeeking(playerId, container, playerId);
    const fire = (tryNum = 0) => {
      if (tryNum > 12) return;
      if (!fromUser && userJumpedRef.current) return;
      if (fromUser && lastSeekTargetRef.current != null && Math.abs(lastSeekTargetRef.current - t) > 0.4) {
        return;
      }
      readSpotlightrPlayerTime(
        playerId,
        (current) => {
          const live = Math.max(0, Number(current) || 0);
          if (live > 0 && Math.abs(live - t) <= 1.75) {
            seekingUntilRef.current = 0;
            lastTimeRef.current = live;
            lastTickAtMsRef.current = Date.now();
            setCurrentTime(live);
            return;
          }
          // Spotlightr ignores setTime until playback has started (LMS waits for live > 0.5).
          if (!fromUser && tryNum < 4 && live < 0.5) {
            window.setTimeout(() => fire(tryNum + 1), 350 + tryNum * 150);
            return;
          }
          seekSpotlightrPlayer(playerId, t, null, { container });
          window.setTimeout(() => fire(tryNum + 1), 280);
        },
        { container },
      );
    };
    fire(0);
    return t;
  }, [snapPlayhead, syncPlayheadOnly, videoUrl]);

  const applyResumeBookmark = useCallback(() => {
    if (userJumpedRef.current) return false;
    const start = getBookmarkSeconds();
    const playerReady = Boolean(
      videoRef.current || youtubePlayerRef.current?.seekTo || spotlightrPlayerIdRef.current,
    );
    if (!(start > 2)) {
      // No progress — force 0:00 (Spotlightr/browser may otherwise reopen mid-video).
      if (playerReady) {
        const live =
          Math.max(
            0,
            Number(videoRef.current?.currentTime) || 0,
            Number(lastTimeRef.current) || 0,
          );
        if (live > 2) {
          seekTo(0);
          lastTimeRef.current = 0;
          setCurrentTime(0);
        }
      }
      if (serverHydratedRef.current) resumeAppliedRef.current = true;
      lastAppliedBookmarkRef.current = 0;
      return false;
    }
    if (!playerReady) return false;
    seekTo(start);
    resumeAppliedRef.current = true;
    lastAppliedBookmarkRef.current = start;
    return true;
  }, [getBookmarkSeconds, seekTo]);

  resumeFnRef.current = applyResumeBookmark;

  const onNativeTime = (event) => {
    const el = event.currentTarget;
    applyTick(el.currentTime, el.duration, { ended: event.type === 'ended' });
  };

  useEffect(() => {
    if (!mediaReady || media.kind !== 'youtube' || !media.youtubeId) return undefined;
    let cancelled = false;
    let poll = null;
    (async () => {
      const ok = await loadYouTubeApi();
      if (!ok || cancelled || !youtubeHostRef.current || !window.YT?.Player) return;
      youtubePlayerRef.current = new window.YT.Player(youtubeHostRef.current, {
        videoId: media.youtubeId,
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1, origin: window.location.origin },
        events: {
          onReady: (event) => {
            const dur = event.target.getDuration?.() || 0;
            if (dur > 0) ensureMinDurationRef.current(dur, { trusted: true });
            applyResumeBookmark();
          },
          onStateChange: (event) => {
            const playing = event.data === window.YT.PlayerState.PLAYING;
            const ended = event.data === window.YT.PlayerState.ENDED;
            playingRef.current = playing;
            if (playing) lastTickAtMsRef.current = Date.now();
            const t = event.target.getCurrentTime?.() || 0;
            const d = event.target.getDuration?.() || durationRef.current;
            applyTickRef.current(t, d, { ended });
            if (playing && !resumeAppliedRef.current) {
              const bookmark = getBookmarkSeconds();
              if (!userJumpedRef.current && bookmark > 2 && t + 2 < bookmark) applyResumeBookmark();
            }
            if (!playing) void persistRef.current({ force: true });
          },
        },
      });
      poll = window.setInterval(() => {
        const player = youtubePlayerRef.current;
        if (!player?.getCurrentTime) return;
        applyTickRef.current(player.getCurrentTime(), player.getDuration?.() || durationRef.current);
      }, POLL_MS);
    })();
    return () => {
      cancelled = true;
      if (poll) window.clearInterval(poll);
      try {
        youtubePlayerRef.current?.destroy?.();
      } catch {
        // ignore
      }
      youtubePlayerRef.current = null;
    };
  }, [mediaReady, media.kind, media.youtubeId]);

  const spotlightrVideoId = media.kind === 'spotlightr' ? media.spotlightr?.videoId : '';
  const spotlightrWatchUrl = media.kind === 'spotlightr' ? media.spotlightr?.watchUrl : '';
  const spotlightrScriptUrl = media.kind === 'spotlightr' ? media.spotlightr?.scriptUrl : '';

  useEffect(() => {
    if (!mediaReady || media.kind !== 'spotlightr' || !spotlightrVideoId || !spotlightrWatchUrl) {
      return undefined;
    }
    let cancelled = false;
    let pollId = 0;
    let apiEnabled = false;
    const container = () => spotlightrHostRef.current;
    const getApiVideoId = () => spotlightrPlayerIdRef.current || spotlightrVideoId;

    const markPlaying = () => {
      playingRef.current = true;
      resumeAppliedRef.current = true;
      lastTickAtMsRef.current = Date.now();
    };

    /** Fort applyPlayingPollTick → applyTick (forward step invents playing + coverage). */
    const handlePollTime = (rawTime) => {
      if (rawTime == null) return;
      const t = normalizeSpotlightrTime(rawTime);
      const prev = Math.max(0, Number(lastTimeRef.current) || 0);
      const d = durationRef.current;

      if (t > 0) lastGoodApiTimeRef.current = { t, at: Date.now() };

      // Large jump = scrub/resume bookmark only (Fort onSeeked).
      if (t > 0 && Math.abs(t - prev) > JUMP_GAP_SEC) {
        userJumpedRef.current = true;
        resumeAppliedRef.current = true;
        syncPlayheadOnlyRef.current(t, d);
        return;
      }

      if (!(t > 0) && !(playingRef.current && lastTickAtMsRef.current > 0)) return;

      let tick = t;
      if (!(tick > 0) && playingRef.current && lastTickAtMsRef.current > 0) {
        const elapsed = Math.max(0, (Date.now() - lastTickAtMsRef.current) / 1000);
        tick = prev + Math.min(WALL_CLOCK_STEP_SEC, elapsed);
      }
      if (!(tick > 0)) return;
      applyTickRef.current(tick, d);
    };

    const clearPoll = () => {
      if (pollId) {
        window.clearInterval(pollId);
        pollId = 0;
      }
    };

    const startProgressPoll = () => {
      clearPoll();
      pollId = window.setInterval(() => {
        if (!apiEnabled || cancelled) return;
        readSpotlightrPlayerTime(getApiVideoId(), handlePollTime, { container: container() });
      }, POLL_MS);
    };

    const refreshDurationFromPlayer = () => {
      readSpotlightrPlayerDuration(
        getApiVideoId(),
        (dur) => {
          if (!(dur > 0) || cancelled) return;
          ensureMinDurationRef.current(dur, { trusted: true });
        },
        { container: container() },
      );
    };

    const bindPlayerApi = () => {
      if (cancelled || !isSpotlightrApiAvailable()) return;
      apiEnabled = true;
      const id = getApiVideoId();
      unlockSpotlightrForwardSeeking(id, container());
      refreshDurationFromPlayer();
      window.setTimeout(refreshDurationFromPlayer, 2000);
      window.setTimeout(refreshDurationFromPlayer, 5000);
      startProgressPoll();

      callSpotlightrApi(id, 'onPlay', null, () => {
        markPlaying();
        refreshDurationFromPlayer();
        readSpotlightrPlayerTime(
          getApiVideoId(),
          (raw) => {
            if (raw == null || !playingRef.current) return;
            const live = normalizeSpotlightrTime(raw);
            if (live >= 0) {
              lastTimeRef.current = live;
              lastTickAtMsRef.current = Date.now();
              setCurrentTime(live);
            }
          },
          { container: container() },
        );
        if (!pollId) startProgressPoll();
        void persistRef.current({ force: true });
      }, { container: container() });

      callSpotlightrApi(id, 'onPause', null, () => {
        const sliceFrom = Math.max(0, Number(lastTimeRef.current) || 0);
        const wasPlaying = playingRef.current;
        const wallMs =
          wasPlaying && lastTickAtMsRef.current > 0
            ? Math.max(0, Date.now() - lastTickAtMsRef.current)
            : null;
        playingRef.current = false;

        const finishPause = (rawTime) => {
          const live = normalizeSpotlightrTime(rawTime);
          let current = sliceFrom;
          if (live > 0) current = Math.max(current, live);
          if (wasPlaying && wallMs != null && wallMs > 0) {
            current = Math.max(current, sliceFrom + wallMs / 1000);
          }
          const d = durationRef.current;
          if (d > 0) current = Math.min(d, current);
          if (wasPlaying) applyTickRef.current(current, d);
          else syncPlayheadOnlyRef.current(current, d);
          lastTickAtMsRef.current = 0;
          void persistRef.current({ force: true });
        };

        let settled = false;
        const settleOnce = (raw) => {
          if (settled) return;
          settled = true;
          finishPause(raw);
        };
        readSpotlightrPlayerTime(getApiVideoId(), settleOnce, { container: container() });
        window.setTimeout(() => settleOnce(null), 180);
      }, { container: container() });

      callSpotlightrApi(id, 'onSeeked', null, (rawTime) => {
        const t = Math.max(0, normalizeSpotlightrTime(rawTime));
        userJumpedRef.current = true;
        resumeAppliedRef.current = true;
        syncPlayheadOnlyRef.current(t, durationRef.current);
        void persistRef.current({ force: true });
      }, { container: container() });

      callSpotlightrApi(id, 'onEnded', null, () => {
        const d = durationRef.current;
        const endAt = d > 0 ? d : lastTimeRef.current;
        applyTickRef.current(endAt, d, { ended: true });
        playingRef.current = false;
        lastTickAtMsRef.current = 0;
        void persistRef.current({ force: true });
      }, { container: container() });
    };

    const runLmsResume = (tryNum = 0) => {
      if (cancelled || userJumpedRef.current || tryNum > 14) {
        resumeAppliedRef.current = true;
        return;
      }
      const target = getBookmarkRef.current?.() || 0;
      const dur = durationRef.current;
      if (dur > 0 && target >= dur - 1) {
        resumeAppliedRef.current = true;
        return;
      }
      if (!(target > 2)) {
        resumeAppliedRef.current = true;
        return;
      }
      readSpotlightrPlayerTime(
        getApiVideoId(),
        (current) => {
          if (cancelled || userJumpedRef.current) return;
          const pos = Math.max(0, Number(current) || 0);
          if (Math.abs(pos - target) <= 2) {
            resumeAppliedRef.current = true;
            lastTimeRef.current = pos;
            setCurrentTime(pos);
            return;
          }
          if (tryNum < 4 && pos < 0.5) {
            window.setTimeout(() => runLmsResume(tryNum + 1), 350 + tryNum * 150);
            return;
          }
          seekSpotlightrPlayer(getApiVideoId(), target, null, { container: container() });
          window.setTimeout(() => runLmsResume(tryNum + 1), 400);
        },
        { container: container() },
      );
    };

    (async () => {
      if (cancelled || !spotlightrHostRef.current) return;

      // Fort setupPlayer: mount advanced embed → load script → wait for API → bind + poll.
      mountSpotlightrEmbed(spotlightrHostRef.current, {
        watchUrl: spotlightrWatchUrl,
        videoId: spotlightrVideoId,
        scriptUrl: spotlightrScriptUrl,
        startSeconds: 0,
        useFallback: false,
        title,
      });

      try {
        await loadSpotlightrScript(spotlightrScriptUrl);
      } catch {
        // iframe still plays without JS API
      }
      if (cancelled || !container()) return;

      if (isSpotlightrApiAvailable()) {
        const resolvedId = await waitForSpotlightrPlayer(spotlightrVideoId, {
          container: container(),
          timeoutMs: 12000,
        });
        if (resolvedId) spotlightrPlayerIdRef.current = resolvedId;
        if (!cancelled) {
          bindPlayerApi();
          window.setTimeout(() => runLmsResume(0), 500);
        }
      }
    })();

    return () => {
      cancelled = true;
      apiEnabled = false;
      playingRef.current = false;
      spotlightrPlayerIdRef.current = '';
      clearPoll();
    };
  }, [mediaReady, media.kind, spotlightrScriptUrl, spotlightrVideoId, spotlightrWatchUrl, title]);

  useEffect(() => {
    if (!mediaReady) return undefined;
    const native = videoRef.current;
    const start = getBookmarkSeconds();
    if (
      native &&
      start > 2 &&
      Number.isFinite(native.duration) &&
      native.duration > 0 &&
      start < native.duration - 1
    ) {
      native.currentTime = start;
    }
    return undefined;
  }, [getBookmarkSeconds, media.src, mediaReady]);

  const hintSeconds = Math.max(0, Number(requiredSecondsHint) || 0);
  const savedDur = Math.max(
    Number(progress?.durationSeconds) || 0,
    Number(progress?.videoDurationSeconds) || 0,
  );
  // Playhead must never become the strip length (that put the red watch bar at the far right).
  const looksLikePlayheadCap =
    duration > 0 && currentTime > 2 && duration <= currentTime + 2.5;
  const displayDuration = (() => {
    if (playerDurationTrustedRef.current && duration > 0 && !looksLikePlayheadCap) {
      return Math.max(duration, hintSeconds > 0 && duration <= hintSeconds + 90 ? hintSeconds : 0);
    }
    const candidates = [hintSeconds, looksLikePlayheadCap ? 0 : duration, savedDur].filter(
      (n) => Number(n) > 0,
    );
    return candidates.length ? Math.max(...candidates) : 0;
  })();
  const savedRequired = Math.max(0, Number(progress?.requiredSeconds) || 0);
  // Strip marker: always use admin/catalog minutes when set (01-06=36m, 01-07=107m, 01-09=111m).
  // Completion still uses its own rule inside applyTick / backend.
  const requiredSeconds = hintSeconds > 0 ? hintSeconds : savedRequired > 0 ? savedRequired : 0;
  const watchedRanges = clipCoverageRanges(ranges, displayDuration || 0);

  if (media.kind === 'empty') {
    return (
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          borderRadius: '10px',
          overflow: 'hidden',
          border: '1px solid #d8dee8',
          bgcolor: '#0b1220',
          aspectRatio: '16 / 9',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <Typography sx={{ color: 'rgba(255,255,255,0.72)', fontSize: 13 }}>
          Video link not available for this module yet
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          borderRadius: '10px',
          overflow: 'hidden',
          border: '1px solid #d8dee8',
          bgcolor: '#0b1220',
          aspectRatio: '16 / 9',
        }}
      >
        {mediaReady && media.kind === 'video' ? (
          <Box
            component="video"
            ref={videoRef}
            key={media.src}
            src={media.src}
            controls
            playsInline
            preload="metadata"
            onPlay={() => {
              playingRef.current = true;
              lastTickAtMsRef.current = Date.now();
              if (resumeAppliedRef.current || userJumpedRef.current) return;
              const bookmark = getBookmarkSeconds();
              const live = Number(videoRef.current?.currentTime) || 0;
              if (bookmark > 2 && live + 2 < bookmark) seekTo(bookmark);
            }}
            onPause={() => {
              playingRef.current = false;
              void persistRef.current({ force: true });
            }}
            onEnded={(event) => {
              playingRef.current = false;
              onNativeTime(event);
              void persistRef.current({ force: true });
            }}
            onSeeked={() => {
              if (resumeAppliedRef.current) userJumpedRef.current = true;
            }}
            onTimeUpdate={onNativeTime}
            onLoadedMetadata={(event) => {
              const el = event.currentTarget;
              ensureMinDuration(el.duration, { trusted: true });
              const start = getBookmarkSeconds();
              if (start > 2 && start < el.duration - 1) el.currentTime = start;
            }}
            sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', bgcolor: '#000' }}
          />
        ) : null}

        {mediaReady && media.kind === 'youtube' ? (
          <Box ref={youtubeHostRef} sx={{ position: 'absolute', inset: 0 }} />
        ) : null}

        {mediaReady && media.kind === 'spotlightr' ? (
          <Box ref={spotlightrHostRef} sx={{ position: 'absolute', inset: 0 }} />
        ) : null}

        {mediaReady && media.kind === 'iframe' ? (
          <Box
            component="iframe"
            src={media.src}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
          />
        ) : null}
      </Box>

      <LessonVideoCoverageStrip
        durationSeconds={displayDuration}
        watchedRanges={watchedRanges}
        currentTimeSec={currentTime}
        requiredSeconds={requiredSeconds}
        isComplete={Boolean(progress?.isCompleted)}
        onSeekTo={(seconds) => seekTo(seconds, { fromUser: true })}
      />
    </Box>
  );
}

import { useEffect, useRef } from 'react';

import {
  callSpotlightrApi,
  isAppleMobileDevice,
  isSpotlightrApiAvailable,
  loadSpotlightrScript,
  mountSpotlightrEmbed,
  normalizeSpotlightrTime,
  readSpotlightrPlayerDuration,
  readSpotlightrPlayerTime,
  resolveSpotlightrApiId,
  seekSpotlightrPlayer,
  spotlightrPlayerIdsMatch,
  waitForSpotlightrPlayer,
} from 'src/utils/spotlightr';
import {
  parseCoverageRangePairs,
  computeUnwatchedRanges,
  clipCoverageRanges,
  preferCatalogDurationWhenPlayerSkewed,
} from 'src/sections/learning/utils/video-coverage';

const MIN_TRUSTED_DURATION_SEC = 10;
/** Spotlightr CMS/MP4 metadata can exceed the HLS stream the player plays by ~1 min. */
const SPOTLIGHTR_METADATA_STREAM_SKEW_SEC = 120;
const RESUME_GRACE_MS = 6000;
const SEEK_RELOCK_AFTER_RESUME_MS = 500;
const SEEK_ROLLBACK_COOLDOWN_MS = 800;

const isUuid = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || '')
  );

/** Mark resume handled without calling setTime (avoids Video.js handleStartTime loops). */
const markResumeHandled = ({
  resumeOnceRef,
  resumeMeta,
  activeLessonId,
  seconds,
  spotlightrProgressRef,
}) => {
  const target = Math.max(0, Number(seconds) || 0);
  resumeOnceRef.current = true;
  if (resumeMeta.sectionId === activeLessonId) {
    resumeMeta.applied = true;
    resumeMeta.seconds = target;
  }
  const prog = spotlightrProgressRef.current;
  prog.lastTime = Math.max(prog.lastTime || 0, target);
  prog.maxWatchedTimeline = Math.max(prog.maxWatchedTimeline || 0, target);
};

/** Spotlightr iframe + JS API — mirrors YouTube player progress / seek-lock behavior. */
export function useSpotlightrLessonPlayer({
  spotlightrMeta,
  activeLessonId,
  activeLessonGateBlocked,
  watchtimeSeconds,
  completionPercentage,
  sectionProgressData,
  resumeSeekAppliedRef,
  videoCoverageRangesRef,
  spotlightrContainerRef,
  spotlightrPlayerRef,
  spotlightrProgressRef,
  nativeVideoProgressRef,
  autoPlayNextRef,
  activeLessonIdRef,
  courseIdRef,
  flushSectionProgressRef,
  updateSectionPlayerSnapshotRef,
  persistVideoBookmarkRef,
  shouldBlockForwardSeekRef,
  sectionPlayerSnapshotRef,
  sectionVideoProgressResetRef,
  videoWatchedEnoughRef,
  feedbackLessonId,
  markVideoSeekClampGrace,
  effectiveRequiredSeconds,
  appendCoverageSlicePlayer,
  coverageMeasurePlayer,
  isPlaybackAtVideoEnd,
  syncProgressOnFullDuration,
  maybeSyncFullVideoCoverage,
  buildVideoCoveragePayloadFromRef,
  sendProgressUpdate,
  completeSection,
  getNextLessonFromModules,
  startAutoNextCountdown,
  computeMaxAllowedTimeline,
  isVideoSeekClampGraceActive,
  lessonFallbackDurationSeconds,
  modules,
  flatLessons,
  liveSectionProgressMap,
}) {
  const sectionProgressLatestRef = useRef(sectionProgressData);
  const watchtimeSecondsRef = useRef(watchtimeSeconds);
  const completionPercentageRef = useRef(completionPercentage);
  const modulesRef = useRef(modules);
  const flatLessonsRef = useRef(flatLessons);
  const liveSectionProgressMapRef = useRef(liveSectionProgressMap);
  const callbacksRef = useRef({});
  const playerSessionRef = useRef('');
  const pollIntervalIdRef = useRef(null);
  const apiVideoIdRef = useRef(null);
  const listenersBoundSessionRef = useRef('');
  const resumeOnceRef = useRef(false);
  const resumeViaApiRef = useRef(null);
  const seekRollbackUntilRef = useRef(0);
  const forwardSeekLockOnRef = useRef(false);
  const lastSeekLockApplyAtRef = useRef(0);
  const playerTeardownRef = useRef(false);

  sectionProgressLatestRef.current = sectionProgressData;
  watchtimeSecondsRef.current = watchtimeSeconds;
  completionPercentageRef.current = completionPercentage;
  modulesRef.current = modules;
  flatLessonsRef.current = flatLessons;
  liveSectionProgressMapRef.current = liveSectionProgressMap;
  callbacksRef.current = {
    markVideoSeekClampGrace,
    effectiveRequiredSeconds,
    appendCoverageSlicePlayer,
    coverageMeasurePlayer,
    isPlaybackAtVideoEnd,
    syncProgressOnFullDuration,
    maybeSyncFullVideoCoverage,
    buildVideoCoveragePayloadFromRef,
    sendProgressUpdate,
    completeSection,
    getNextLessonFromModules,
    startAutoNextCountdown,
    computeMaxAllowedTimeline,
    isVideoSeekClampGraceActive,
    lessonFallbackDurationSeconds,
  };

  const spotlightrVideoId = spotlightrMeta?.videoId || null;

  useEffect(() => {
    const clearPoll = () => {
      if (pollIntervalIdRef.current) {
        clearInterval(pollIntervalIdRef.current);
        pollIntervalIdRef.current = null;
      }
    };

    const getContainer = () => spotlightrContainerRef.current;

    const releaseForwardSeekLock = () => {
      forwardSeekLockOnRef.current = false;
    };

    const destroyIframe = () => {
      playerTeardownRef.current = true;
      apiVideoIdRef.current = null;
      spotlightrPlayerRef.current = null;
      forwardSeekLockOnRef.current = false;
      lastSeekLockApplyAtRef.current = 0;
      const wrapper = getContainer();
      if (wrapper) while (wrapper.firstChild) wrapper.removeChild(wrapper.firstChild);
    };

    if (activeLessonGateBlocked || !spotlightrMeta || !spotlightrVideoId) {
      playerSessionRef.current = '';
      resumeOnceRef.current = false;
      clearPoll();
      destroyIframe();
      return undefined;
    }

    const sessionKey = `${activeLessonId}|${spotlightrVideoId}`;
    const { videoId, scriptUrl } = spotlightrMeta;
    const wrapper = getContainer();
    const hasLiveIframe = Boolean(wrapper?.querySelector('iframe'));
    const sessionChanged = playerSessionRef.current !== sessionKey;

    if (sessionChanged) {
      if (playerSessionRef.current) {
        destroyIframe();
      }
      playerSessionRef.current = sessionKey;
      resumeOnceRef.current = false;
      apiVideoIdRef.current = null;
      listenersBoundSessionRef.current = '';
      seekRollbackUntilRef.current = 0;
      forwardSeekLockOnRef.current = false;
      lastSeekLockApplyAtRef.current = 0;

      const sp = sectionProgressLatestRef.current;
      const snap = sectionPlayerSnapshotRef?.current?.[activeLessonId] || null;
      const live = liveSectionProgressMapRef.current?.[activeLessonId] || null;
      // ONLY this section's saved bookmark — never inherit previous section's in-memory
      // lastTime/maxTimeline (same Spotlightr video URL across sections would leak playhead).
      const serverLastPos = Math.max(
        0,
        Number(sp?.lastPositionSeconds || 0),
        Number(snap?.lastPositionSeconds || 0),
        Number(live?.lastPositionSeconds || 0)
      );
      let snapCovMax = 0;
      const covSources = [
        ...(Array.isArray(snap?.watchedCoverageRanges) ? snap.watchedCoverageRanges : []),
        ...(Array.isArray(live?.watchedCoverageRanges) ? live.watchedCoverageRanges : []),
        ...(Array.isArray(sp?.watchedCoverageRanges) ? sp.watchedCoverageRanges : []),
      ];
      for (const item of covSources) {
        if (!Array.isArray(item) || item.length < 2) continue;
        const end = Number(item[1]);
        if (Number.isFinite(end)) snapCovMax = Math.max(snapCovMax, end);
      }
      const maxTimeline = Math.max(serverLastPos, snapCovMax);
      const adminDurSeed = (() => {
        const lesson = flatLessonsRef.current.find((l) => l.id === activeLessonId);
        if (!lesson) return 0;
        return Math.max(
          0,
          Number(
            callbacksRef.current.lessonFallbackDurationSeconds(
              lesson,
              liveSectionProgressMapRef.current
            )
          ) || 0
        );
      })();

      spotlightrProgressRef.current = {
        watchedSeconds: 0,
        pendingDeltaSeconds: 0,
        lastTime: serverLastPos,
        duration: Math.max(0, adminDurSeed),
        maxWatchedTimeline: maxTimeline,
        isPlaying: false,
        lastTickAtMs: 0,
        markedComplete: Boolean(sp?.isCompleted || sp?.isWatched || live?.isCompleted || live?.isWatched),
      };
      // Reset native/youtube in-memory playhead too — shared refs otherwise keep prior section time.
      nativeVideoProgressRef.current.lastTime = serverLastPos;
      nativeVideoProgressRef.current.maxWatchedTimeline = maxTimeline;
      nativeVideoProgressRef.current.isPlaying = false;
      nativeVideoProgressRef.current.lastTickAtMs = 0;
      nativeVideoProgressRef.current.pendingDeltaSeconds = 0;
    }

    let cancelled = false;
    let needsPlayerRefSync = sessionChanged;
    let apiEnabled = false;
    let durationFetchAttempts = 0;

    const cb = () => callbacksRef.current;
    const getSectionProgress = () => sectionProgressLatestRef.current;
    const getApiVideoId = () =>
      apiVideoIdRef.current || resolveSpotlightrApiId(videoId, getContainer());
    const callPlayerApi = (method, param, callback) =>
      callSpotlightrApi(getApiVideoId(), method, param, callback, { container: getContainer() });

    const isLessonPlaybackComplete = () => {
      const prog = spotlightrProgressRef.current;
      const sp = getSectionProgress();
      return Boolean(prog.markedComplete || sp?.isCompleted || sp?.isWatched);
    };

    const isLessonVideoFullyWatched = () => {
      const prog = spotlightrProgressRef.current;
      const d = resolveDurationSeconds(prog.duration);
      const durRounded = Math.round(Number(d) || 0);
      if (durRounded <= 0) return false;
      const ranges = clipCoverageRanges(
        parseCoverageRangePairs(videoCoverageRangesRef.current),
        durRounded
      );
      if (!ranges.length) return false;
      const gaps = computeUnwatchedRanges(ranges, durRounded);
      const gapSeconds = gaps.reduce((sum, [start, end]) => sum + Math.max(0, end - start), 0);
      return gapSeconds < 1;
    };

    const shouldBlockForwardSeek = () => {
      if (typeof shouldBlockForwardSeekRef?.current === 'function') {
        return shouldBlockForwardSeekRef.current();
      }
      return !isLessonPlaybackComplete();
    };

    const getResumeSeconds = () => {
      if (isLessonVideoFullyWatched()) return 0;
      const resumeMeta = resumeSeekAppliedRef.current;
      const sp = getSectionProgress();
      const snap = sectionPlayerSnapshotRef?.current?.[activeLessonId] || null;
      const d = resolveDurationSeconds(spotlightrProgressRef.current.duration);
      const durRounded = Math.round(Number(d) || 0);
      if (isLessonPlaybackComplete()) {
        const lastPos = Math.max(
          Number(sp?.lastPositionSeconds || 0),
          Number(snap?.lastPositionSeconds || 0),
          resumeMeta.sectionId === activeLessonId ? Number(resumeMeta.seconds || 0) : 0
        );
        if (durRounded > 0 && lastPos >= durRounded - 1) return 0;
      }
      const metaSeconds =
        resumeMeta.sectionId === activeLessonId ? Math.max(0, Number(resumeMeta.seconds || 0)) : 0;
      const snapSeconds = Math.max(0, Number(snap?.lastPositionSeconds || 0));
      const serverSeconds = Math.max(0, Number(sp?.lastPositionSeconds || 0));
      const liveLast = Math.max(0, Number(spotlightrProgressRef.current?.lastTime || 0));
      const fromCoverage = parseCoverageRangePairs(
        sp?.watchedCoverageRanges || snap?.watchedCoverageRanges
      ).reduce((max, pair) => Math.max(max, Number(pair?.[1]) || 0), 0);
      const bookmark = metaSeconds || snapSeconds || serverSeconds || fromCoverage;
      if (liveLast > bookmark + 0.5) return liveLast;
      return bookmark;
    };

    const getAdminDurationSeconds = () => {
      const currentLesson = flatLessonsRef.current.find(
        (lesson) => lesson.id === activeLessonIdRef.current
      );
      if (!currentLesson) return 0;
      return Math.max(
        0,
        Number(cb().lessonFallbackDurationSeconds(currentLesson, liveSectionProgressMapRef.current)) ||
          0
      );
    };

    const isTrustedPlayerDuration = (seconds, lastPos) => {
      const value = Math.max(0, Number(seconds) || 0);
      const pos = Math.max(0, Number(lastPos) || 0);
      if (value <= 0) return false;
      if (value >= MIN_TRUSTED_DURATION_SEC) return true;
      return pos < value;
    };

    const resolveDurationSeconds = (rawDuration) => {
      const prog = spotlightrProgressRef.current;
      const lastPos = Math.max(0, Number(prog.lastTime) || 0);
      const fromPlayer = Math.max(0, Number(rawDuration) || 0, Number(prog.duration) || 0);
      const adminDuration = getAdminDurationSeconds();
      const trustedPlayer = isTrustedPlayerDuration(fromPlayer, lastPos) ? fromPlayer : 0;

      if (adminDuration > 0 && trustedPlayer > 0) {
        if (trustedPlayer < adminDuration) {
          const skew = adminDuration - trustedPlayer;
          if (skew > SPOTLIGHTR_METADATA_STREAM_SKEW_SEC || trustedPlayer < adminDuration * 0.85) {
            return trustedPlayer;
          }
          if (trustedPlayer >= adminDuration * 0.9) {
            return trustedPlayer;
          }
        }
        return preferCatalogDurationWhenPlayerSkewed(trustedPlayer, adminDuration);
      }
      if (trustedPlayer > 0) return trustedPlayer;
      if (adminDuration > 0) return adminDuration;
      return 0;
    };

    const syncPlayerRef = () => {
      const prog = spotlightrProgressRef.current;
      spotlightrPlayerRef.current = {
        getCurrentTime: () => {
          const last = Math.max(0, Number(prog.lastTime) || 0);
          // While playing, advance by wall clock so tab-hide flush does not use a stale poll value.
          if (prog.isPlaying && Number.isFinite(prog.lastTickAtMs) && prog.lastTickAtMs > 0) {
            const wallSec = Math.max(0, (Date.now() - prog.lastTickAtMs) / 1000);
            const estimated = last + wallSec;
            const dur = resolveDurationSeconds(prog.duration);
            return dur > 0 ? Math.min(dur, estimated) : estimated;
          }
          return last;
        },
        getDuration: () => resolveDurationSeconds(prog.duration),
      };
    };

    const refreshDurationFromPlayer = () => {
      if (!apiEnabled || durationFetchAttempts >= 6) return;
      durationFetchAttempts += 1;
      readSpotlightrPlayerDuration(getApiVideoId(), (duration) => {
        const parsed = normalizeSpotlightrTime(duration);
        const lastPos = Math.max(0, Number(spotlightrProgressRef.current.lastTime) || 0);
        if (!isTrustedPlayerDuration(parsed, lastPos)) return;
        const adminDur = getAdminDurationSeconds();
        const mergedDur = Math.max(spotlightrProgressRef.current.duration || 0, parsed);
        spotlightrProgressRef.current.duration =
          adminDur > 0
            ? preferCatalogDurationWhenPlayerSkewed(mergedDur, adminDur)
            : mergedDur;
        syncPlayerRef();
      }, { container: getContainer() });
    };

    if (needsPlayerRefSync) {
      syncPlayerRef();
      needsPlayerRefSync = false;
    }

    const rollbackSpotlightrIfSeekPastAllowed = () => false;

    const mergeCoverageRangesForSnapshot = (ranges) => {
      const pairs = Array.isArray(ranges) ? ranges : [];
      const merged = [];
      for (const item of pairs) {
        if (!Array.isArray(item) || item.length < 2) continue;
        const a = Number(item[0]);
        const b = Number(item[1]);
        if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
        merged.push([
          Math.round(Math.min(a, b) * 100) / 100,
          Math.round(Math.max(a, b) * 100) / 100,
        ]);
      }
      return merged;
    };

    const persistSectionSnapshot = (currentTime, rawDuration) => {
      const sid = activeLessonIdRef.current;
      if (!sid || !isUuid(sid)) return;
      const prog = spotlightrProgressRef.current;
      const d = resolveDurationSeconds(rawDuration ?? prog.duration);
      const current = Math.max(0, Number(currentTime ?? prog.lastTime) || 0);
      const durRounded = Math.round(Number(d) || 0);
      const cov =
        durRounded > 0 ? cb().coverageMeasurePlayer(videoCoverageRangesRef.current, durRounded) : 0;
      const ranges = mergeCoverageRangesForSnapshot(videoCoverageRangesRef.current);
      updateSectionPlayerSnapshotRef?.current?.(sid, {
        lastPositionSeconds: current,
        durationSeconds: durRounded,
        watchedSeconds: cov,
        watchedCoverageRanges: ranges,
      });
    };

    const saveProgressOnPause = (currentTime, rawDuration, wallElapsedMs = null, sliceFromOverride = null) => {
      if (playerTeardownRef.current) return;
      const cid = courseIdRef.current;
      const sid = activeLessonIdRef.current;
      if (!cid || !sid || !isUuid(sid)) return;

      const prog = spotlightrProgressRef.current;
      const d = resolveDurationSeconds(rawDuration ?? prog.duration);
      const current = Math.max(0, Number(currentTime) || 0);
      const durRounded = Math.round(Number(d) || 0);
      const sliceFrom = Math.max(0, Number(sliceFromOverride ?? prog.lastTime) || 0);

      cb().appendCoverageSlicePlayer(
        videoCoverageRangesRef,
        sliceFrom,
        current,
        durRounded,
        cb().isPlaybackAtVideoEnd(current, d),
        wallElapsedMs
      );
      prog.lastTime = current;
      prog.lastTickAtMs = 0;
      const payload = cb().buildVideoCoveragePayloadFromRef(videoCoverageRangesRef, current, d, {
        ended: cb().isPlaybackAtVideoEnd(current, d),
      });
      if (durRounded > 0 && payload.watchedSeconds >= durRounded) {
        cb().syncProgressOnFullDuration(sid, current, d, true);
      }
      persistSectionSnapshot(current, d);
      persistVideoBookmarkRef?.current?.(sid, payload);
      cb().sendProgressUpdate(cid, sid, payload);
      prog.pendingDeltaSeconds = 0;
      syncPlayerRef();
    };

    const applyPlayingPollTick = (t, previousTime, d, durRounded, requiredSec, releaseLockOnComplete) => {
      const prog = spotlightrProgressRef.current;
      const wallMs =
        Number.isFinite(prog.lastTickAtMs) && prog.lastTickAtMs > 0
          ? Math.max(0, Date.now() - prog.lastTickAtMs)
          : null;
      const durationCap = durRounded > 0 ? durRounded : 7200;
      const maxAccept =
        Number.isFinite(wallMs) && wallMs != null
          ? Math.min(durationCap, Math.max(2.5, (wallMs / 1000) * 1.5 + 1.5))
          : 2.5;
      const forwardDelta = t - previousTime;
      const isForwardStep =
        forwardDelta > 0.05 && Math.abs(forwardDelta) <= maxAccept;

      if (!prog.isPlaying && isForwardStep) {
        prog.isPlaying = true;
      }

      if (isForwardStep) {
        if (Math.abs(t - previousTime) <= maxAccept) {
          prog.maxWatchedTimeline = Math.max(prog.maxWatchedTimeline ?? 0, t);
        }
        cb().appendCoverageSlicePlayer(
          videoCoverageRangesRef,
          previousTime,
          t,
          durRounded,
          cb().isPlaybackAtVideoEnd(t, d),
          wallMs
        );
        const cov =
          durRounded > 0
            ? cb().coverageMeasurePlayer(videoCoverageRangesRef.current, durRounded)
            : 0;
        if (durRounded > 0 && cov >= durRounded) {
          cb().syncProgressOnFullDuration(activeLessonIdRef.current, t, d, true);
        }
        cb().maybeSyncFullVideoCoverage?.(activeLessonIdRef.current, t, d);
        prog.watchedSeconds = cov;
        prog.pendingDeltaSeconds = 0;
        if (requiredSec > 0 && cov >= requiredSec) {
          prog.markedComplete = true;
          if (releaseLockOnComplete) releaseForwardSeekLock();
          videoWatchedEnoughRef.current?.();
        }
      }

      prog.lastTime = t;
      if (prog.isPlaying || isForwardStep) prog.lastTickAtMs = Date.now();
      syncPlayerRef();
      if (prog.isPlaying || t > 0) {
        persistSectionSnapshot(t, prog.duration);
      }
    };

    const handlePollTime = (rawTime) => {
      if (rawTime == null) {
        if (durationFetchAttempts < 6 && durationFetchAttempts % 2 === 0) {
          refreshDurationFromPlayer();
        }
        return;
      }
      const t = normalizeSpotlightrTime(rawTime);
      const prog = spotlightrProgressRef.current;
      const d = resolveDurationSeconds(prog.duration);
      const requiredSec = cb().effectiveRequiredSeconds(
        watchtimeSecondsRef.current,
        d,
        completionPercentageRef.current
      );
      const durRounded = Math.round(Number(d) || 0);
      const previousTime = Math.max(0, Number(prog.lastTime || 0));

      if (!shouldBlockForwardSeek()) {
        applyPlayingPollTick(t, previousTime, d, durRounded, requiredSec, false);
        return;
      }

      if (rollbackSpotlightrIfSeekPastAllowed(t)) return;

      applyPlayingPollTick(t, previousTime, d, durRounded, requiredSec, true);
    };

    const pollCurrentTime = () => {
      if (!apiEnabled) return;
      readSpotlightrPlayerTime(getApiVideoId(), handlePollTime, { container: getContainer() });
    };

    const startProgressPoll = () => {
      clearPoll();
      const isCoarsePointer =
        typeof window !== 'undefined' &&
        window.matchMedia('(hover: none) and (pointer: coarse)').matches;
      const pollMs = isCoarsePointer ? 100 : 300;
      pollIntervalIdRef.current = setInterval(pollCurrentTime, pollMs);
    };

    /**
     * Background tabs throttle setInterval; allow free-credit catch-up from wall clock
     * + live player time when returning / leaving the tab.
     */
    const sealCoverageFromLivePlayer = (reason = 'visibility') => {
      if (cancelled || playerTeardownRef.current || !apiEnabled) return;
      const prog = spotlightrProgressRef.current;
      const isVisibilitySeal =
        reason === 'hidden' || reason === 'visible' || reason === 'pause-catchup';
      if (!prog.isPlaying && !isVisibilitySeal) return;

      const applySeal = (liveRaw) => {
        if (cancelled || playerTeardownRef.current) return;
        const live = normalizeSpotlightrTime(liveRaw);
        const d = resolveDurationSeconds(prog.duration);
        const durRounded = Math.round(Number(d) || 0);
        const previous = Math.max(0, Number(prog.lastTime) || 0);
        const wallMs =
          Number.isFinite(prog.lastTickAtMs) && prog.lastTickAtMs > 0
            ? Math.max(0, Date.now() - prog.lastTickAtMs)
            : null;

        let current = previous;
        if (live > 0) current = Math.max(current, live);
        if (prog.isPlaying && Number.isFinite(wallMs) && wallMs != null && wallMs > 0) {
          current = Math.max(current, previous + wallMs / 1000);
        }
        if (d > 0) current = Math.min(d, current);
        if (current <= previous + 0.05) {
          if (reason === 'hidden' || reason === 'visible') {
            flushSectionProgressRef?.current?.(reason === 'hidden', true);
          }
          return;
        }

        cb().appendCoverageSlicePlayer(
          videoCoverageRangesRef,
          previous,
          current,
          durRounded,
          cb().isPlaybackAtVideoEnd(current, d),
          wallMs
        );
        prog.lastTime = current;
        prog.maxWatchedTimeline = Math.max(prog.maxWatchedTimeline ?? 0, current);
        if (prog.isPlaying) prog.lastTickAtMs = Date.now();

        const cov =
          durRounded > 0
            ? cb().coverageMeasurePlayer(videoCoverageRangesRef.current, durRounded)
            : 0;
        prog.watchedSeconds = cov;
        persistSectionSnapshot(current, d);
        syncPlayerRef();

        if (durRounded > 0 && cov >= durRounded) {
          cb().syncProgressOnFullDuration(activeLessonIdRef.current, current, d, true);
        }

        if (reason === 'visible' || reason === 'hidden') {
          flushSectionProgressRef?.current?.(reason === 'hidden', true);
        }
      };

      // Hide may delay postMessage getTime — seal from wall clock first, then refine.
      if (reason === 'hidden') {
        applySeal(prog.lastTime);
      }

      readSpotlightrPlayerTime(
        getApiVideoId(),
        (rawTime) => applySeal(rawTime),
        { container: getContainer() }
      );
    };

    /**
     * Resume via API setTime only — never `?s=` in the embed URL.
     * Some Spotlightr HLS videos infinite-loop in handleStartTime when `?s=` is set.
     */
    const applyApiResumeOnce = (targetSeconds) => {
      if (resumeOnceRef.current || isLessonVideoFullyWatched()) return false;
      const resumeMeta = resumeSeekAppliedRef.current;
      const target = Math.max(0, Number(targetSeconds) || 0);
      const liveLast = Math.max(0, Number(spotlightrProgressRef.current?.lastTime || 0));
      if (resumeMeta.sectionId !== activeLessonId || !(target > 2)) return false;
      if (liveLast > target + 0.5) {
        markResumeHandled({
          resumeOnceRef,
          resumeMeta,
          activeLessonId,
          seconds: Math.round(liveLast),
          spotlightrProgressRef,
        });
        return true;
      }

      markResumeHandled({
        resumeOnceRef,
        resumeMeta,
        activeLessonId,
        seconds: target,
        spotlightrProgressRef,
      });
      cb().markVideoSeekClampGrace(RESUME_GRACE_MS);
      seekRollbackUntilRef.current = Date.now() + SEEK_ROLLBACK_COOLDOWN_MS;
      syncPlayerRef();

      const attemptSeek = (tryNum = 0) => {
        if (cancelled || playerTeardownRef.current) return;
        if (tryNum > 12) return;
        // User scrubbed — stop forcing the old bookmark.
        if (
          resumeSeekAppliedRef.current.sectionId === activeLessonId &&
          resumeSeekAppliedRef.current.applied &&
          Math.abs(Number(resumeSeekAppliedRef.current.seconds || 0) - target) > 2
        ) {
          return;
        }

        readSpotlightrPlayerTime(
          getApiVideoId(),
          (current) => {
            if (cancelled || playerTeardownRef.current) return;
            if (
              resumeSeekAppliedRef.current.sectionId === activeLessonId &&
              resumeSeekAppliedRef.current.applied &&
              Math.abs(Number(resumeSeekAppliedRef.current.seconds || 0) - target) > 2
            ) {
              return;
            }
            const pos = Math.max(0, Number(current) || 0);
            if (pos >= target - 2) return;
            if (pos > target + 0.5) return;

            if (tryNum < 4 && pos < 0.5) {
              window.setTimeout(() => attemptSeek(tryNum + 1), 350 + tryNum * 150);
              return;
            }

            seekSpotlightrPlayer(getApiVideoId(), target, null, { container: getContainer() });
            window.setTimeout(() => attemptSeek(tryNum + 1), 400);
          },
          { container: getContainer() }
        );
      };

      window.setTimeout(() => attemptSeek(0), 500);
      return true;
    };

    resumeViaApiRef.current = applyApiResumeOnce;

    const onVooPlayerReady = (event) => {
      const detailId =
        event?.detail?.video ??
        event?.detail?.playerId ??
        event?.detail?.videoId ??
        event?.detail?.id ??
        event?.playerId ??
        event?.videoId;
      if (detailId && videoId && !spotlightrPlayerIdsMatch(detailId, videoId)) return;
      if (detailId) apiVideoIdRef.current = String(detailId);
      if (isSpotlightrApiAvailable() && !cancelled) {
        bindPlayerApi();
      }
    };

    const bindPlayerApi = () => {
      if (cancelled || !isSpotlightrApiAvailable()) return;
      playerTeardownRef.current = false;
      apiEnabled = true;
      syncPlayerRef();
      refreshDurationFromPlayer();
      window.setTimeout(() => refreshDurationFromPlayer(), 2000);
      window.setTimeout(() => refreshDurationFromPlayer(), 5000);

      const resumeMeta = resumeSeekAppliedRef.current;
      const resumeTarget = getResumeSeconds();
      if (
        !resumeOnceRef.current &&
        !isLessonVideoFullyWatched() &&
        resumeMeta.sectionId === activeLessonId &&
        resumeTarget > 2
      ) {
        applyApiResumeOnce(resumeTarget);
      }

      startProgressPoll();

      const needsListeners = listenersBoundSessionRef.current !== sessionKey;
      if (!needsListeners) return;
      listenersBoundSessionRef.current = sessionKey;

      if (autoPlayNextRef.current) {
        callPlayerApi('play');
        autoPlayNextRef.current = false;
      }

      callPlayerApi('onPlay', null, () => {
        if (activeLessonId) sectionVideoProgressResetRef?.current?.delete(activeLessonId);
        const prog = spotlightrProgressRef.current;
        prog.isPlaying = true;
        prog.lastTickAtMs = Date.now();
        if (!pollIntervalIdRef.current) startProgressPoll();
        refreshDurationFromPlayer();
        // Sync lastTime from the live player so a play→pause race doesn't invent a gap.
        readSpotlightrPlayerTime(
          getApiVideoId(),
          (raw) => {
            if (raw == null || !spotlightrProgressRef.current.isPlaying) return;
            const t = normalizeSpotlightrTime(raw);
            if (!(t >= 0)) return;
            spotlightrProgressRef.current.lastTime = t;
            spotlightrProgressRef.current.lastTickAtMs = Date.now();
            syncPlayerRef();
          },
          { container: getContainer() }
        );
      });

      callPlayerApi('onPause', null, () => {
        const prog = spotlightrProgressRef.current;
        const sliceFrom = Math.max(0, Number(prog.lastTime) || 0);
        const wasPlaying = prog.isPlaying;
        const wallMs =
          wasPlaying && Number.isFinite(prog.lastTickAtMs) && prog.lastTickAtMs > 0
            ? Math.max(0, Date.now() - prog.lastTickAtMs)
            : null;
        prog.isPlaying = false;

        const finishPause = (rawTime) => {
          const d = resolveDurationSeconds(prog.duration);
          const apiTime = normalizeSpotlightrTime(rawTime);
          let current = sliceFrom;
          if (apiTime > 0) current = Math.max(current, apiTime);
          if (wasPlaying && Number.isFinite(wallMs) && wallMs != null && wallMs > 0) {
            const estimated = sliceFrom + wallMs / 1000;
            current = Math.max(current, estimated);
          }
          if (d > 0) current = Math.min(d, current);
          saveProgressOnPause(current, d, wallMs, sliceFrom);
        };

        let settled = false;
        const settleOnce = (raw) => {
          if (settled) return;
          settled = true;
          finishPause(raw);
        };
        readSpotlightrPlayerTime(getApiVideoId(), settleOnce, { container: getContainer() });
        window.setTimeout(() => settleOnce(null), 180);
      });

      callPlayerApi('onSeeked', null, (rawTime) => {
        const t = Math.max(0, normalizeSpotlightrTime(rawTime));
        spotlightrProgressRef.current.lastTime = t;
        syncPlayerRef();
        // Treat any seek (resume or user scrub) as final — stop resume retries yanking back.
        if (activeLessonId) {
          resumeSeekAppliedRef.current = {
            sectionId: activeLessonId,
            seconds: Math.round(t),
            applied: true,
          };
          resumeOnceRef.current = true;
        }
      });

      callPlayerApi('onEnded', null, () => {
        const prog = spotlightrProgressRef.current;
        const wallMs =
          prog.isPlaying && Number.isFinite(prog.lastTickAtMs) && prog.lastTickAtMs > 0
            ? Math.max(0, Date.now() - prog.lastTickAtMs)
            : null;
        prog.isPlaying = false;
        prog.lastTickAtMs = 0;

        const t = Math.max(0, Number(prog.lastTime) || 0);
        const d = resolveDurationSeconds(prog.duration);
        const currentId = activeLessonIdRef.current;
        const currentLesson = flatLessonsRef.current.find((l) => l.id === currentId);
        const fallbackDur = currentLesson
          ? cb().lessonFallbackDurationSeconds(currentLesson, liveSectionProgressMapRef.current)
          : 0;
        const durationForSync = d > 0 ? d : Math.max(Number(fallbackDur) || 0, 0);
        const cid = courseIdRef.current;
        const sid = activeLessonIdRef.current;
        const endAt = d > 0 ? d : t;

        if (cid && sid) {
          cb().appendCoverageSlicePlayer(
            videoCoverageRangesRef,
            prog.lastTime,
            endAt,
            Math.round(Number(d) || 0),
            true,
            wallMs
          );
        }

        const durRounded = Math.round(Number(durationForSync || d) || 0);

        const maybeAutoNextAfterServer = (confirmed) => {
          if (!confirmed || !currentId || currentId === feedbackLessonId) return;
          const next = cb().getNextLessonFromModules(modulesRef.current, currentId);
          if (next?.id) cb().startAutoNextCountdown(next);
        };

        cb()
          .syncProgressOnFullDuration(activeLessonIdRef.current, durRounded || t, durationForSync, true)
          ?.then?.((data) => {
            const confirmed =
              data?.isCompleted === true ||
              data?.isWatched === true;
            if (!confirmed) return;
            prog.markedComplete = true;
            releaseForwardSeekLock();
            maybeAutoNextAfterServer(true);
          });
      });
    };

    const handleSpotlightrVisibility = () => {
      if (typeof document === 'undefined') return;
      if (document.visibilityState === 'hidden') {
        sealCoverageFromLivePlayer('hidden');
      } else if (document.visibilityState === 'visible') {
        const liveLast = Math.max(0, Number(spotlightrProgressRef.current?.lastTime || 0));
        if (liveLast > 2 && activeLessonId) {
          resumeSeekAppliedRef.current = {
            sectionId: activeLessonId,
            seconds: Math.round(liveLast),
            applied: true,
          };
        }
        window.setTimeout(() => sealCoverageFromLivePlayer('visible'), 50);
        window.setTimeout(() => sealCoverageFromLivePlayer('visible'), 400);
      }
    };

    document.addEventListener('visibilitychange', handleSpotlightrVisibility);
    window.addEventListener('pageshow', handleSpotlightrVisibility);

    const isCoarsePointerDevice = () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    const spotlightrApiTimeoutMs = isCoarsePointerDevice() ? 18000 : 12000;

    const setupPlayer = async () => {
      if (cancelled) return;

      document.addEventListener('vooPlayerReady', onVooPlayerReady);

      if (hasLiveIframe && playerSessionRef.current === sessionKey) {
        syncPlayerRef();
        if (isSpotlightrApiAvailable()) {
          const resolvedId = await waitForSpotlightrPlayer(videoId, {
            container: wrapper,
            timeoutMs: spotlightrApiTimeoutMs,
          });
          if (resolvedId) apiVideoIdRef.current = resolvedId;
          if (!cancelled) {
            bindPlayerApi();
          }
        }
        return;
      }

      const mountWrapper = getContainer();
      if (!mountWrapper) return;

      // Plain watch URL (no ?fallback=true) — matches direct Spotlightr links; fallback uses broken Video.js on some HLS streams.
      mountSpotlightrEmbed(mountWrapper, {
        watchUrl: spotlightrMeta.watchUrl,
        videoId,
        startSeconds: 0,
        useFallback: false,
        title: 'Course video',
      });

      try {
        await loadSpotlightrScript(scriptUrl);
      } catch {
        // iframe still plays without JS API
      }
      if (cancelled || !getContainer()) return;

      const lesson = flatLessonsRef.current.find((l) => l.id === activeLessonId);
      const seedDur =
        lesson && cb().lessonFallbackDurationSeconds
          ? Math.max(
              0,
              Number(cb().lessonFallbackDurationSeconds(lesson, liveSectionProgressMapRef.current)) ||
                0
            )
          : 0;
      if (seedDur > 0) {
        spotlightrProgressRef.current.duration = Math.max(
          Number(spotlightrProgressRef.current.duration || 0),
          seedDur
        );
      }
      syncPlayerRef();

      if (isSpotlightrApiAvailable()) {
        const resolvedId = await waitForSpotlightrPlayer(videoId, {
          container: mountWrapper,
          timeoutMs: spotlightrApiTimeoutMs,
        });
        if (resolvedId) apiVideoIdRef.current = resolvedId;
        if (!cancelled) bindPlayerApi();
      }
    };

    setupPlayer().catch(() => {});

    return () => {
      cancelled = true;
      playerTeardownRef.current = true;
      resumeViaApiRef.current = null;
      document.removeEventListener('vooPlayerReady', onVooPlayerReady);
      document.removeEventListener('visibilitychange', handleSpotlightrVisibility);
      window.removeEventListener('pageshow', handleSpotlightrVisibility);
      clearPoll();
      destroyIframe();
    };
  }, [
    spotlightrVideoId,
    spotlightrMeta?.watchUrl,
    activeLessonId,
    activeLessonGateBlocked,
    resumeSeekAppliedRef,
    videoCoverageRangesRef,
    spotlightrContainerRef,
    spotlightrPlayerRef,
    spotlightrProgressRef,
    nativeVideoProgressRef,
    autoPlayNextRef,
    activeLessonIdRef,
    courseIdRef,
    flushSectionProgressRef,
    updateSectionPlayerSnapshotRef,
    persistVideoBookmarkRef,
    shouldBlockForwardSeekRef,
    sectionPlayerSnapshotRef,
    videoWatchedEnoughRef,
    feedbackLessonId,
  ]);

  useEffect(() => {
    if (activeLessonGateBlocked || !spotlightrMeta?.watchUrl || !activeLessonId) return undefined;
    if (sectionProgressData?.isCompleted || sectionProgressData?.isWatched) return undefined;
    const resumeSeconds = getResumeSecondsFromData(
      sectionProgressData,
      resumeSeekAppliedRef,
      activeLessonId,
      sectionPlayerSnapshotRef?.current?.[activeLessonId]
    );
    if (!(resumeSeconds > 2)) return undefined;

    const resumeMeta = resumeSeekAppliedRef.current;
    if (resumeMeta.sectionId === activeLessonId) {
      resumeMeta.seconds = Math.max(resumeMeta.seconds || 0, resumeSeconds);
    }

    const prog = spotlightrProgressRef.current;
    const livePosition = Math.max(prog.lastTime || 0, prog.maxWatchedTimeline || 0);
    prog.lastTime = Math.max(livePosition, resumeSeconds);
    prog.maxWatchedTimeline = Math.max(prog.maxWatchedTimeline || 0, resumeSeconds);

    // Late-arriving progress only: never reload the iframe after playback has started
    // (e.g. SWR revalidate on tab focus would otherwise restart the video).
    if (resumeMeta.applied || prog.isPlaying || livePosition > resumeSeconds + 1) {
      return undefined;
    }

    if (!isSpotlightrApiAvailable()) return undefined;

    resumeViaApiRef.current?.(resumeSeconds);

    return undefined;
  }, [
    activeLessonId,
    activeLessonGateBlocked,
    sectionProgressData?.lastPositionSeconds,
    spotlightrMeta?.watchUrl,
    resumeSeekAppliedRef,
    sectionProgressData,
    spotlightrContainerRef,
    spotlightrProgressRef,
  ]);
}

function getResumeSecondsFromData(
  sectionProgressData,
  resumeSeekAppliedRef,
  activeLessonId,
  sectionSnapshot = null
) {
  if (sectionProgressData?.isCompleted || sectionProgressData?.isWatched) return 0;
  const resumeMeta = resumeSeekAppliedRef.current;
  const serverSeconds = Math.max(0, Number(sectionProgressData?.lastPositionSeconds || 0));
  const snapSeconds = Math.max(0, Number(sectionSnapshot?.lastPositionSeconds || 0));
  const metaSeconds =
    resumeMeta.sectionId === activeLessonId ? Math.max(0, Number(resumeMeta.seconds || 0)) : 0;
  return Math.max(serverSeconds, snapSeconds, metaSeconds);
}

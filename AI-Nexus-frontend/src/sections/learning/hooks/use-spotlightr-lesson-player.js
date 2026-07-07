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
  shouldBlockForwardSeekRef,
  sectionPlayerSnapshotRef,
  sectionVideoProgressResetRef,
  videoWatchedEnoughRef,
  feedbackLessonId,
  markVideoSeekClampGrace,
  effectiveRequiredSeconds,
  appendCoverageSlicePlayer,
  coverageMeasurePlayer,
  finalizeVideoCoverageOnEnd,
  syncProgressOnFullDuration,
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
  modulesRef.current = modules;
  flatLessonsRef.current = flatLessons;
  liveSectionProgressMapRef.current = liveSectionProgressMap;
  callbacksRef.current = {
    markVideoSeekClampGrace,
    effectiveRequiredSeconds,
    appendCoverageSlicePlayer,
    coverageMeasurePlayer,
    finalizeVideoCoverageOnEnd,
    syncProgressOnFullDuration,
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
      const serverLastPos = Math.max(
        0,
        Number(sp?.lastPositionSeconds || 0),
        Number(snap?.lastPositionSeconds || 0)
      );
      let snapCovMax = 0;
      if (snap && Array.isArray(snap.watchedCoverageRanges)) {
        for (const item of snap.watchedCoverageRanges) {
          if (!Array.isArray(item) || item.length < 2) continue;
          const end = Number(item[1]);
          if (Number.isFinite(end)) snapCovMax = Math.max(snapCovMax, end);
        }
      }
      const maxTimeline = Math.max(
        nativeVideoProgressRef.current.maxWatchedTimeline || 0,
        spotlightrProgressRef.current.maxWatchedTimeline || 0,
        serverLastPos,
        snapCovMax
      );
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
        watchedSeconds: spotlightrProgressRef.current.watchedSeconds || 0,
        pendingDeltaSeconds: 0,
        lastTime: Math.max(spotlightrProgressRef.current.lastTime || 0, serverLastPos),
        duration: Math.max(spotlightrProgressRef.current.duration || 0, adminDurSeed),
        maxWatchedTimeline: maxTimeline,
        isPlaying: false,
        markedComplete: Boolean(sp?.isCompleted || sp?.isWatched),
      };
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

    const shouldBlockForwardSeek = () => {
      if (typeof shouldBlockForwardSeekRef?.current === 'function') {
        return shouldBlockForwardSeekRef.current();
      }
      return !isLessonPlaybackComplete();
    };

    const getResumeSeconds = () => {
      if (isLessonPlaybackComplete()) return 0;
      const resumeMeta = resumeSeekAppliedRef.current;
      const sp = getSectionProgress();
      const snap = sectionPlayerSnapshotRef?.current?.[activeLessonId] || null;
      const serverSeconds = Math.max(0, Number(sp?.lastPositionSeconds || 0));
      const snapSeconds = Math.max(0, Number(snap?.lastPositionSeconds || 0));
      const metaSeconds =
        resumeMeta.sectionId === activeLessonId ? Math.max(0, Number(resumeMeta.seconds || 0)) : 0;
      return Math.max(serverSeconds, snapSeconds, metaSeconds);
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
        return Math.max(adminDuration, trustedPlayer);
      }
      if (trustedPlayer > 0) return trustedPlayer;
      if (adminDuration > 0) return adminDuration;
      return 0;
    };

    const syncPlayerRef = () => {
      const prog = spotlightrProgressRef.current;
      spotlightrPlayerRef.current = {
        getCurrentTime: () => Math.max(0, Number(prog.lastTime) || 0),
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
        spotlightrProgressRef.current.duration = Math.max(
          spotlightrProgressRef.current.duration || 0,
          parsed
        );
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

    const saveProgressOnPause = (currentTime, rawDuration) => {
      if (playerTeardownRef.current) return;
      const cid = courseIdRef.current;
      const sid = activeLessonIdRef.current;
      if (!cid || !sid || !isUuid(sid)) return;
      if (isLessonPlaybackComplete()) return;

      const prog = spotlightrProgressRef.current;
      const d = resolveDurationSeconds(rawDuration ?? prog.duration);
      const current = Math.max(0, Number(currentTime) || 0);
      const durRounded = Math.round(Number(d) || 0);

      cb().appendCoverageSlicePlayer(videoCoverageRangesRef, prog.lastTime, current, durRounded);
      const cov =
        durRounded > 0 ? cb().coverageMeasurePlayer(videoCoverageRangesRef.current, durRounded) : 0;
      if (durRounded > 0 && cov >= durRounded) {
        cb().syncProgressOnFullDuration(sid, current, d, true);
      }
      const payload = cb().buildVideoCoveragePayloadFromRef(videoCoverageRangesRef, current, d);
      persistSectionSnapshot(current, d);
      cb().sendProgressUpdate(cid, sid, payload);
      prog.pendingDeltaSeconds = 0;
      syncPlayerRef();
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
      const last = Math.max(0, Number(prog.lastTime) || 0);

      if (!shouldBlockForwardSeek()) {
        const d = resolveDurationSeconds(prog.duration);
        const requiredSec = cb().effectiveRequiredSeconds(watchtimeSecondsRef.current, d);
        const durRounded = Math.round(Number(d) || 0);
        const previousTime = Math.max(0, Number(prog.lastTime || 0));

        if (!prog.isPlaying && t > previousTime + 0.05 && Math.abs(t - previousTime) <= 2.5) {
          prog.isPlaying = true;
        }

        if (prog.isPlaying) {
          if (Math.abs(t - previousTime) <= 2.5) {
            prog.maxWatchedTimeline = Math.max(prog.maxWatchedTimeline ?? 0, t);
          }
          cb().appendCoverageSlicePlayer(videoCoverageRangesRef, previousTime, t, durRounded);
          const cov =
            durRounded > 0
              ? cb().coverageMeasurePlayer(videoCoverageRangesRef.current, durRounded)
              : 0;
          if (durRounded > 0 && cov >= durRounded) {
            cb().syncProgressOnFullDuration(activeLessonIdRef.current, t, d, true);
          }
          prog.watchedSeconds = cov;
          prog.pendingDeltaSeconds = 0;
          if (requiredSec > 0 && cov >= requiredSec) {
            prog.markedComplete = true;
            videoWatchedEnoughRef.current?.();
          }
        }

        prog.lastTime = t;
        syncPlayerRef();
        if (prog.isPlaying || t > 0) {
          persistSectionSnapshot(t, prog.duration);
        }
        return;
      }

      if (rollbackSpotlightrIfSeekPastAllowed(t)) return;

      const d = resolveDurationSeconds(prog.duration);
      const requiredSec = cb().effectiveRequiredSeconds(watchtimeSecondsRef.current, d);
      const durRounded = Math.round(Number(d) || 0);
      const previousTime = Math.max(0, Number(prog.lastTime || 0));

      if (!prog.isPlaying && t > previousTime + 0.05 && Math.abs(t - previousTime) <= 2.5) {
        prog.isPlaying = true;
      }

      if (prog.isPlaying) {
        if (Math.abs(t - previousTime) <= 2.5) {
          prog.maxWatchedTimeline = Math.max(prog.maxWatchedTimeline ?? 0, t);
        }
        cb().appendCoverageSlicePlayer(videoCoverageRangesRef, previousTime, t, durRounded);
        const cov =
          durRounded > 0 ? cb().coverageMeasurePlayer(videoCoverageRangesRef.current, durRounded) : 0;
        if (durRounded > 0 && (cov >= durRounded - 1 || t >= durRounded - 0.5)) {
          cb().syncProgressOnFullDuration(activeLessonIdRef.current, t, d, true);
        }
        prog.watchedSeconds = cov;
        prog.pendingDeltaSeconds = 0;
        if (requiredSec > 0 && cov >= requiredSec) {
          prog.markedComplete = true;
          releaseForwardSeekLock();
          videoWatchedEnoughRef.current?.();
        }
      }

      prog.lastTime = t;
      syncPlayerRef();
      if (prog.isPlaying || t > 0) {
        persistSectionSnapshot(t, prog.duration);
      }
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
     * Resume via API setTime only — never `?s=` in the embed URL.
     * Some Spotlightr HLS videos infinite-loop in handleStartTime when `?s=` is set.
     */
    const applyApiResumeOnce = (targetSeconds) => {
      if (resumeOnceRef.current || isLessonPlaybackComplete()) return false;
      const resumeMeta = resumeSeekAppliedRef.current;
      const target = Math.max(0, Number(targetSeconds) || 0);
      if (resumeMeta.sectionId !== activeLessonId || !(target > 2)) return false;

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

        readSpotlightrPlayerTime(
          getApiVideoId(),
          (current) => {
            if (cancelled || playerTeardownRef.current) return;
            const pos = Math.max(0, Number(current) || 0);
            if (pos >= target - 2) return;

            if (tryNum < 4 && pos < 0.5) {
              window.setTimeout(() => attemptSeek(tryNum + 1), 350 + tryNum * 150);
              return;
            }

            seekSpotlightrPlayer(getApiVideoId(), target, null, { container: getContainer() });
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
        !isLessonPlaybackComplete() &&
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
        spotlightrProgressRef.current.isPlaying = true;
        if (!pollIntervalIdRef.current) startProgressPoll();
        refreshDurationFromPlayer();
      });

      callPlayerApi('onPause', null, () => {
        const prog = spotlightrProgressRef.current;
        prog.isPlaying = false;
        const current = Math.max(0, Number(prog.lastTime) || 0);
        saveProgressOnPause(current, prog.duration);
      });

      callPlayerApi('onSeeked', null, (rawTime) => {
        const t = normalizeSpotlightrTime(rawTime);
        spotlightrProgressRef.current.lastTime = Math.max(0, t);
        syncPlayerRef();
      });

      callPlayerApi('onEnded', null, () => {
        const prog = spotlightrProgressRef.current;
        prog.isPlaying = false;

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

        if (cid && sid) {
          cb().appendCoverageSlicePlayer(
            videoCoverageRangesRef,
            prog.lastTime,
            t,
            Math.round(Number(d) || 0)
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

import { useEffect, useRef } from 'react';

import {
  buildSpotlightrWatchEmbedUrl,
  callSpotlightrApi,
  isAppleMobileDevice,
  isSpotlightrApiAvailable,
  loadSpotlightrScript,
  mountSpotlightrEmbed,
  normalizeSpotlightrTime,
  readSpotlightrPlayerDuration,
  readSpotlightrPlayerTime,
  resolveSpotlightrApiId,
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

/** True when the Spotlightr iframe URL already requests a start offset (`?s=`). */
const iframeSrcHasStartParam = (iframe) => /[?&]s=\d+/i.test(String(iframe?.src || ''));

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
  spotlightrPlaybackPreparedAt = 0,
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
  videoWatchedEnoughRef,
  feedbackLessonId,
  markVideoSeekClampGrace,
  effectiveRequiredSeconds,
  appendCoverageSlicePlayer,
  coverageMeasurePlayer,
  syncProgressOnFullDuration,
  buildVideoCoveragePayloadFromRef,
  sendProgressUpdate,
  completeSection,
  getNextLessonFromModules,
  startAutoNextCountdown,
  appendViewedSectionId,
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
    syncProgressOnFullDuration,
    buildVideoCoveragePayloadFromRef,
    sendProgressUpdate,
    completeSection,
    getNextLessonFromModules,
    startAutoNextCountdown,
    appendViewedSectionId,
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

    const sessionKey = `${activeLessonId}|${spotlightrVideoId}|${spotlightrPlaybackPreparedAt || 0}`;
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
        const skew = adminDuration - trustedPlayer;
        if (
          trustedPlayer < adminDuration &&
          skew > 0 &&
          skew <= SPOTLIGHTR_METADATA_STREAM_SKEW_SEC &&
          trustedPlayer >= adminDuration * 0.9
        ) {
          return trustedPlayer;
        }
        return Math.max(adminDuration, trustedPlayer);
      }
      if (trustedPlayer > 0) return trustedPlayer;
      if (adminDuration > 0) return adminDuration;
      return 0;
    };

    const syncPlayerRef = () => {
      const prog = spotlightrProgressRef.current;
      const adminDuration = getAdminDurationSeconds();
      spotlightrPlayerRef.current = {
        getCurrentTime: () => Math.max(0, Number(prog.lastTime) || 0),
        getDuration: () => Math.max(resolveDurationSeconds(prog.duration), adminDuration),
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
      if (durRounded > 0 && (cov >= durRounded - 1 || current >= durRounded - 0.5)) {
        cb().syncProgressOnFullDuration(sid, current, d);
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
          if (durRounded > 0 && (cov >= durRounded - 1 || t >= durRounded - 0.5)) {
            cb().syncProgressOnFullDuration(activeLessonIdRef.current, t, d);
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
          cb().syncProgressOnFullDuration(activeLessonIdRef.current, t, d);
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

    /** Reload iframe with `?s=` when resume is needed — never API setTime (Video.js stack overflow). */
    const reloadIframeForResume = (targetSeconds) => {
      const iframe = getContainer()?.querySelector('iframe');
      if (!iframe || iframeSrcHasStartParam(iframe)) return false;

      markResumeHandled({
        resumeOnceRef,
        resumeMeta: resumeSeekAppliedRef.current,
        activeLessonId,
        seconds: targetSeconds,
        spotlightrProgressRef,
      });
      cb().markVideoSeekClampGrace(RESUME_GRACE_MS);

      listenersBoundSessionRef.current = '';
      apiVideoIdRef.current = null;
      clearPoll();

      iframe.src = buildSpotlightrWatchEmbedUrl(spotlightrMeta.watchUrl, targetSeconds, {
        useFallback: !isSpotlightrApiAvailable(),
      });
      syncPlayerRef();
      return true;
    };

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
        const iframe = getContainer()?.querySelector('iframe');
        if (iframe && iframeSrcHasStartParam(iframe)) {
          markResumeHandled({
            resumeOnceRef,
            resumeMeta,
            activeLessonId,
            seconds: resumeTarget,
            spotlightrProgressRef,
          });
          syncPlayerRef();
        } else if (reloadIframeForResume(resumeTarget)) {
          return;
        }
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
        const durationForSync = Math.max(Number(d) || 0, Number(fallbackDur) || 0);
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

        const requiredSec = cb().effectiveRequiredSeconds(watchtimeSecondsRef.current, d);
        const durRounded = Math.round(Number(d) || 0);
        const cov =
          durRounded > 0 ? cb().coverageMeasurePlayer(videoCoverageRangesRef.current, durRounded) : 0;

        cb().syncProgressOnFullDuration(activeLessonIdRef.current, t, durationForSync);

        if (prog.markedComplete) {
          cb().appendViewedSectionId(activeLessonIdRef.current);
          return;
        }

        const shouldComplete = requiredSec > 0 ? cov >= requiredSec - 1 : true;
        if (shouldComplete) {
          prog.markedComplete = true;
          releaseForwardSeekLock();
          if (sid) cb().completeSection(sid);
          if (currentId && currentId !== feedbackLessonId) {
            const next = cb().getNextLessonFromModules(modulesRef.current, currentId);
            if (next?.id) cb().startAutoNextCountdown(next);
          }
        } else if (cid && sid) {
          const payload = cb().buildVideoCoveragePayloadFromRef(videoCoverageRangesRef, t, d);
          cb().sendProgressUpdate(cid, sid, payload);
          prog.pendingDeltaSeconds = 0;
        }
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

      const resumeAt = getResumeSeconds();
      mountSpotlightrEmbed(mountWrapper, {
        watchUrl: spotlightrMeta.watchUrl,
        videoId,
        scriptUrl,
        startSeconds: resumeAt,
        title: 'Course video',
      });

      if (resumeAt > 2) {
        markResumeHandled({
          resumeOnceRef,
          resumeMeta: resumeSeekAppliedRef.current,
          activeLessonId,
          seconds: resumeAt,
          spotlightrProgressRef,
        });
      }

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
      document.removeEventListener('vooPlayerReady', onVooPlayerReady);
      clearPoll();
    };
  }, [
    spotlightrVideoId,
    spotlightrMeta?.watchUrl,
    spotlightrPlaybackPreparedAt,
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

    const iframe = spotlightrContainerRef.current?.querySelector('iframe');
    if (!iframe || iframeSrcHasStartParam(iframe)) {
      return undefined;
    }

    markResumeHandled({
      resumeOnceRef,
      resumeMeta,
      activeLessonId,
      seconds: resumeSeconds,
      spotlightrProgressRef,
    });
    callbacksRef.current.markVideoSeekClampGrace?.(RESUME_GRACE_MS);

    listenersBoundSessionRef.current = '';
    apiVideoIdRef.current = null;
    if (pollIntervalIdRef.current) {
      clearInterval(pollIntervalIdRef.current);
      pollIntervalIdRef.current = null;
    }

    iframe.src = buildSpotlightrWatchEmbedUrl(spotlightrMeta.watchUrl, resumeSeconds, {
      useFallback: !isSpotlightrApiAvailable(),
    });

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

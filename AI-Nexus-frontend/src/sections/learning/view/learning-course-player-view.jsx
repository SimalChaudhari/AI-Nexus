import { useState, useMemo, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Rating from '@mui/material/Rating';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Drawer from '@mui/material/Drawer';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import LoadingButton from '@mui/lab/LoadingButton';
import { alpha, useTheme } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { EmptyContent } from 'src/components/empty-content';
import { LoadingScreen } from 'src/components/loading-screen';
import { LessonDocumentViewer } from 'src/sections/learning/components/lesson-document-viewer';
import { LessonLearningMaterialsPanel } from 'src/sections/learning/components/lesson-learning-materials-panel';
import { LessonVideoPlayer } from 'src/sections/learning/components/lesson-video-player';
import { useSpotlightrLessonPlayer } from 'src/sections/learning/hooks/use-spotlightr-lesson-player';
import { isSpotlightrUrl, parseSpotlightrUrl } from 'src/utils/spotlightr';
import { getYouTubeEmbedUrl, getYouTubeVideoId, isYouTubeUrl } from 'src/utils/youtube';
import { LessonImageViewer } from 'src/sections/learning/components/lesson-image-viewer';
import { LessonTextViewer } from 'src/sections/learning/components/lesson-text-viewer';
import { Iconify } from 'src/components/iconify';
import { courseService } from 'src/services/course.service';
import { speakerService } from 'src/services/speaker.service';
import {
  LearningModulePracticeIntro,
  LearningModulePracticeQuiz,
} from 'src/sections/learning/components/learning-module-practice-panel';
import { LearningModuleAssignmentsPanel } from 'src/sections/learning/components/learning-module-assignments-panel';
import { createCourseReview, createSpeakerReview } from 'src/services/review.service';
import { useAuthContext } from 'src/auth/hooks';
import {
  IMAGE_VIEW_COMPLETE_DELAY_MS,
  TEXT_VIEW_COMPLETE_DELAY_MS,
} from 'src/config/constants';
import { toast } from 'src/components/snackbar';
import { DashboardContent } from 'src/layouts/dashboard';
import { RichTextContent } from 'src/components/html-content';
import { htmlToPlainText } from 'src/utils/html-plain-text';
import { getCourseDefaultImage } from 'src/utils/course-default-image';

import courseLessonNotesIcon from 'src/assets/course/notes.png';
import courseLearningMaterialsIcon from 'src/assets/course/material.png';
import {
  LESSON_MEDIA_FRAME_HEIGHT,
  playerFluidType,
  playerLessonNotesSx,
  playerPracticePanelSx,
  playerScrollPanelSx,
  playerTabIconSx,
} from 'src/sections/learning/utils/player-responsive-type';

const isPaidCourse = (value) => value === true || value === 'true' || value === 1 || value === '1';
const DEFAULT_COURSE_IMAGE = getCourseDefaultImage();

/** Parse watchtime string to seconds. Supports "HH:MM:SS", "MM:SS", or seconds ("330"). */
function parseWatchtimeToSeconds(str) {
  if (!str || typeof str !== 'string') return null;
  const t = str.trim();
  if (/^\d+$/.test(t)) return parseInt(t, 10);
  const hms = t.match(/^(\d+):(\d{2}):(\d{2})$/);
  if (hms) return parseInt(hms[1], 10) * 3600 + parseInt(hms[2], 10) * 60 + parseInt(hms[3], 10);
  const mm = t.match(/^(\d+):(\d{2})$/);
  if (mm) return parseInt(mm[1], 10) * 60 + parseInt(mm[2], 10);
  return null;
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || '')
  );
}

function formatSecondsToClock(totalSeconds) {
  const sec = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const mm = Math.floor(sec / 60);
  const ss = sec % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

function parseCoverageRangePairs(raw) {
  if (!raw || !Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw) {
    if (!Array.isArray(item) || item.length < 2) continue;
    const a = Number(item[0]);
    const b = Number(item[1]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    out.push([a, b]);
  }
  return out;
}

function maxCoverageEndPlayer(ranges) {
  if (!Array.isArray(ranges) || !ranges.length) return 0;
  let m = 0;
  for (const p of ranges) {
    if (!Array.isArray(p) || p.length < 2) continue;
    const e = Number(p[1]);
    if (Number.isFinite(e)) m = Math.max(m, e);
  }
  return m;
}

function mergeCoverageRangesPlayer(ranges) {
  if (!ranges.length) return [];
  const sorted = ranges
    .map(([a, b]) => [Math.min(a, b), Math.max(a, b)])
    .filter(([s, e]) => e > s && Number.isFinite(s) && Number.isFinite(e))
    .sort((x, y) => x[0] - y[0]);
  const out = [];
  for (const [s, e] of sorted) {
    const last = out[out.length - 1];
    if (!last || s > last[1]) out.push([s, e]);
    else last[1] = Math.max(last[1], e);
  }
  return out;
}

function clipCoverageRangesPlayer(ranges, maxDuration) {
  if (!maxDuration || maxDuration <= 0) return mergeCoverageRangesPlayer(ranges);
  const clipped = [];
  for (const [s0, e0] of ranges) {
    const lo = Math.min(s0, e0);
    const hi = Math.max(s0, e0);
    const s = Math.max(0, lo);
    const e = Math.min(maxDuration, hi);
    if (e > s) clipped.push([s, e]);
  }
  return mergeCoverageRangesPlayer(clipped);
}

function coverageMeasurePlayer(ranges, maxDuration) {
  const merged =
    maxDuration > 0 ? clipCoverageRangesPlayer(ranges, maxDuration) : mergeCoverageRangesPlayer(ranges);
  let total = 0;
  for (const [s, e] of merged) total += e - s;
  return Math.floor(Math.max(0, total));
}

/** Add a forward play segment; ignore large jumps (seeks). */
function appendCoverageSlicePlayer(rangesRef, from, to, maxDuration) {
  const lo = Number(from);
  const hi = Number(to);
  const rawDelta = Math.abs(hi - lo);
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || rawDelta <= 0) return;
  if (rawDelta > 2.5) return;
  const a = Math.min(lo, hi);
  const b = Math.max(lo, hi);
  const cap = Number.isFinite(maxDuration) && maxDuration > 0 ? maxDuration : null;
  const start = Math.max(0, a);
  const end = cap != null ? Math.min(cap, b) : b;
  if (end <= start) return;
  const prev = Array.isArray(rangesRef.current) ? rangesRef.current : [];
  const merged = mergeCoverageRangesPlayer([...parseCoverageRangePairs(prev), [start, end]]);
  rangesRef.current = cap != null ? clipCoverageRangesPlayer(merged, cap) : merged;
}

/** iPhone, iPod, and iPad (incl. iPadOS desktop UA). */
function isAppleMobileDevice() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return navigator.platform === 'MacIntel' && Number(navigator.maxTouchPoints) > 1;
}

/** Furthest timeline position the learner may seek to (watched coverage + resume point). */
function computeMaxAllowedTimeline(coverageRangesRef, prog, sectionProgress, durRounded) {
  const merged = mergeCoverageRangesPlayer(
    parseCoverageRangePairs(coverageRangesRef.current)
  );
  let maxAllowed = maxCoverageEndPlayer(merged);
  if (durRounded > 0) maxAllowed = Math.min(maxAllowed, durRounded);
  maxAllowed = Math.max(
    maxAllowed,
    Number(prog?.maxWatchedTimeline || 0),
    Number(sectionProgress?.lastPositionSeconds || 0)
  );
  return maxAllowed;
}

function buildVideoCoveragePayloadFromRef(rangesRef, lastPosition, durationSeconds) {
  const dur = Math.max(0, Math.round(Number(durationSeconds) || 0));
  const covered = dur > 0 ? coverageMeasurePlayer(rangesRef.current, dur) : 0;
  const ranges = mergeCoverageRangesPlayer(parseCoverageRangePairs(rangesRef.current)).map(([s, e]) => [
    Math.round(s * 100) / 100,
    Math.round(e * 100) / 100,
  ]);
  return {
    lastPositionSeconds: Math.max(0, Math.round(Number(lastPosition) || 0)),
    durationSeconds: dur,
    watchedSeconds: covered,
    watchedCoverageRanges: ranges,
  };
}

function mergeServerProgressIntoMap(prev, data) {
  if (!data || typeof data !== 'object') return prev || {};
  const next = { ...(prev || {}) };
  const monotonicKeys = [
    'lastPositionSeconds',
    'watchedSeconds',
    'durationSeconds',
    'completionPercent',
  ];
  monotonicKeys.forEach((k) => {
    if (data[k] === undefined || data[k] === null) return;
    const incoming = Number(data[k]);
    const existing = Number(next[k] || 0);
    if (Number.isFinite(incoming)) {
      next[k] = Math.max(existing, incoming);
    }
  });
  if (data.isCompleted !== undefined && data.isCompleted !== null) {
    next.isCompleted = Boolean(next.isCompleted) || Boolean(data.isCompleted);
  }
  if (data.isWatched !== undefined && data.isWatched !== null) {
    next.isWatched = Boolean(next.isWatched) || Boolean(data.isWatched);
  }
  ['isLocked', 'remainingSeconds'].forEach((k) => {
    if (data[k] !== undefined && data[k] !== null) next[k] = data[k];
  });
  if (data.watchedCoverageRanges !== undefined && data.watchedCoverageRanges !== null) {
    next.watchedCoverageRanges = data.watchedCoverageRanges;
  }
  return next;
}

function mergeProgressForSidebar(lesson, liveById) {
  const live = liveById?.[lesson.id];
  const sp = lesson.sectionProgress || {};
  if (!live) return { ...sp };
  const merged = { ...sp, ...live };
  merged.lastPositionSeconds = Math.max(
    Number(sp.lastPositionSeconds || 0),
    Number(live.lastPositionSeconds || 0)
  );
  merged.watchedSeconds = Math.max(
    Number(sp.watchedSeconds || 0),
    Number(live.watchedSeconds || 0)
  );
  merged.durationSeconds = Math.max(
    Number(sp.durationSeconds || 0),
    Number(live.durationSeconds || 0)
  );
  const pctSp = Number(sp.completionPercent ?? 0);
  const pctLive = Number(live.completionPercent ?? 0);
  if (Number.isFinite(pctSp) || Number.isFinite(pctLive)) {
    merged.completionPercent = Math.max(
      Number.isFinite(pctSp) ? pctSp : 0,
      Number.isFinite(pctLive) ? pctLive : 0
    );
  }
  return merged;
}

/** Sidebar total length — prefer admin duration; reject inflated player duration from lesson-switch bugs. */
function resolveLessonVideoTotalSeconds(lesson, merged, playback) {
  const fromStr =
    parseWatchtimeToSeconds(String(lesson?.durationTime || '').trim()) ??
    parseWatchtimeToSeconds(String(lesson?.duration || '').trim());
  const fromSp = Math.max(
    0,
    Number(merged?.durationSeconds || lesson?.sectionProgress?.durationSeconds || 0)
  );
  const fromPlayback =
    playback && Number.isFinite(playback.durationSec) && playback.durationSec > 0
      ? Math.round(playback.durationSec)
      : 0;

  let total = Math.max(fromSp, fromStr || 0, fromPlayback);

  const lastPos = Math.max(
    0,
    Number(merged?.lastPositionSeconds || 0),
    Number(merged?.watchedSeconds || 0)
  );
  const done =
    merged?.isCompleted === true ||
    merged?.isWatched === true ||
    lesson?.sectionProgress?.isCompleted === true ||
    lesson?.sectionProgress?.isWatched === true;

  if (fromStr > 0 && total > fromStr * 1.25) total = fromStr;
  if (done && lastPos > 0 && total > lastPos + 15) {
    total = Math.max(lastPos, fromStr || lastPos);
  }
  return total;
}

function capProgressDurationForLesson(sectionId, payload, flatLessons, liveById, viewedIds) {
  if (!payload || !sectionId) return payload;
  const lesson = (flatLessons || []).find((l) => l.id === sectionId);
  if (!lesson) return payload;

  const adminDur = lessonFallbackDurationSeconds(lesson, liveById);
  const lastPos = Math.max(0, Number(payload.lastPositionSeconds || 0));
  const watched = Math.max(0, Number(payload.watchedSeconds || 0));
  const pos = Math.max(lastPos, watched);
  let dur = Math.max(0, Number(payload.durationSeconds || 0));

  if (adminDur > 0) {
    dur = Math.min(dur, adminDur);
  } else if (pos > 0 && dur > pos + 15) {
    dur = Math.max(pos, Math.min(dur, pos + 5));
  }

  const merged = mergeProgressForSidebar(lesson, liveById);
  const done =
    viewedIds?.includes(sectionId) ||
    merged.isCompleted === true ||
    merged.isWatched === true;
  if (done && pos > 0 && dur > pos + 10) {
    dur = Math.max(pos, adminDur > 0 ? adminDur : pos);
  }

  return { ...payload, durationSeconds: Math.round(dur) };
}

/**
 * Lesson counts as done for sidebar/module % and unlocks when PUT progress shows full watch
 * even if `isWatched`/`isCompleted` flags lag one frame behind `completionPercent` (common after last save).
 */
function isLessonDoneForUi(lesson, liveById, viewedIds) {
  if (!lesson?.id) return false;
  if (Array.isArray(viewedIds) && viewedIds.includes(lesson.id)) return true;
  const merged = mergeProgressForSidebar(lesson, liveById);
  if (merged.isWatched === true || merged.isCompleted === true) return true;
  const pct = Number(merged.completionPercent ?? 0);
  if (Number.isFinite(pct) && pct >= 99) return true;
  const dur = Math.max(0, Number(merged.durationSeconds || lesson.sectionProgress?.durationSeconds || 0));
  const watched = Math.max(0, Number(merged.watchedSeconds || lesson.sectionProgress?.watchedSeconds || 0));
  const lastPos = Math.max(
    0,
    Number(merged.lastPositionSeconds || lesson.sectionProgress?.lastPositionSeconds || 0)
  );
  const progressed = Math.max(watched, lastPos);
  if (dur > 0 && progressed >= dur - 1) return true;
  return false;
}

function isSectionLessonComplete(sectionId, flatLessons, liveById, viewedIds) {
  if (!sectionId) return false;
  if (Array.isArray(viewedIds) && viewedIds.includes(sectionId)) return true;
  const lesson = (flatLessons || []).find((l) => l.id === sectionId);
  if (!lesson) return false;
  return isLessonDoneForUi(lesson, liveById, viewedIds);
}

function lessonWatchtimeSeconds(lesson) {
  const wtRaw = lesson?.watchtime;
  if (typeof wtRaw === 'number' && Number.isFinite(wtRaw) && wtRaw > 0) {
    return Math.floor(wtRaw);
  }
  return parseWatchtimeToSeconds(String(wtRaw || '').trim());
}

/** Known section length from API / admin (used to clip coverage before the player reports duration, e.g. YouTube). */
function lessonFallbackDurationSeconds(lesson, liveById) {
  const merged = mergeProgressForSidebar(lesson, liveById);
  const totalFromSp = Math.max(
    0,
    Number(merged.durationSeconds || lesson.sectionProgress?.durationSeconds || 0)
  );
  const totalFromStr =
    parseWatchtimeToSeconds(String(lesson?.durationTime || '').trim()) ??
    parseWatchtimeToSeconds(String(lesson?.duration || '').trim());
  if (totalFromSp > 0 || (totalFromStr != null && totalFromStr > 0)) {
    return Math.max(totalFromSp, totalFromStr || 0);
  }
  return 0;
}

/**
 * Live read from native video / YouTube player for sidebar (refs only; pair with a tick state).
 * `fallbackDurationSec` clips coverage when the player has not reported duration yet (YouTube load).
 * Returns null when nothing useful is available yet.
 */
function computeSidebarPlaybackSnapshot(
  videoRef,
  youtubeRef,
  spotlightrRef,
  rangesRef,
  fallbackDurationSec = 0,
  spotlightrProgressRef = null,
  lessonId = null,
  coverageLessonIdRef = null
) {
  const coverageLessonId = coverageLessonIdRef?.current ?? null;
  const playerDataMatchesLesson =
    lessonId && coverageLessonId && String(coverageLessonId) === String(lessonId);
  if (!playerDataMatchesLesson) return null;

  let currentSec = 0;
  let durationSec = 0;
  const nv = videoRef?.current;
  if (nv) {
    const ct = Number(nv.currentTime);
    const dur = Number(nv.duration);
    if (Number.isFinite(ct) && ct >= 0) currentSec = Math.max(currentSec, ct);
    if (Number.isFinite(dur) && dur > 0) durationSec = Math.max(durationSec, dur);
  }
  const yt = youtubeRef?.current;
  if (yt && typeof yt.getCurrentTime === 'function') {
    try {
      const ct = Number(yt.getCurrentTime());
      if (Number.isFinite(ct) && ct >= 0) currentSec = Math.max(currentSec, ct);
      if (typeof yt.getDuration === 'function') {
        const dur = Number(yt.getDuration());
        if (Number.isFinite(dur) && dur > 0) durationSec = Math.max(durationSec, dur);
      }
    } catch {
      // ignore YT API errors during teardown
    }
  }
  const spotlightr = spotlightrRef?.current;
  if (spotlightr && typeof spotlightr.getCurrentTime === 'function') {
    try {
      const ct = Number(spotlightr.getCurrentTime());
      if (Number.isFinite(ct) && ct >= 0) currentSec = Math.max(currentSec, ct);
      if (typeof spotlightr.getDuration === 'function') {
        const dur = Number(spotlightr.getDuration());
        if (Number.isFinite(dur) && dur > 0) durationSec = Math.max(durationSec, dur);
      }
    } catch {
      // ignore Spotlightr API errors during teardown
    }
  }
  const spProg = spotlightrProgressRef?.current;
  if (spProg) {
    const ct = Math.max(0, Number(spProg.lastTime) || 0);
    if (ct > 0) currentSec = Math.max(currentSec, ct);
    const rawDur = Math.max(0, Number(spProg.duration) || 0);
    if (rawDur > 0) durationSec = Math.max(durationSec, rawDur);
  }
  const fallback = Math.max(0, Math.round(Number(fallbackDurationSec) || 0));
  const effectiveDuration = Math.max(Math.round(durationSec), fallback);
  const clipForCoverage = effectiveDuration > 0 ? effectiveDuration : 0;
  const watchedCoverageSec =
    clipForCoverage > 0
      ? coverageMeasurePlayer(rangesRef?.current, clipForCoverage)
      : coverageMeasurePlayer(rangesRef?.current, 0);
  if (effectiveDuration <= 0 && currentSec <= 0) return null;
  return { currentSec, durationSec: effectiveDuration, watchedCoverageSec };
}

/** Sidebar progress — saved server state wins over stale player bleed after lesson navigation. */
function resolveSidebarVideoProgress(lesson, liveById, playback, viewedIds) {
  const merged = mergeProgressForSidebar(lesson, liveById);
  const totalSec = resolveLessonVideoTotalSeconds(lesson, merged, playback);
  const watched = Math.max(0, Number(merged.watchedSeconds || 0));
  const lastPos = Math.max(0, Number(merged.lastPositionSeconds || 0));
  const savedProgress = Math.max(watched, lastPos);
  const doneForUi = isLessonDoneForUi(lesson, liveById, viewedIds);

  let liveCurrent =
    playback && Number.isFinite(playback.currentSec) ? Math.max(0, playback.currentSec) : null;
  let watchedLive =
    playback && Number.isFinite(playback.watchedCoverageSec)
      ? Math.max(watched, playback.watchedCoverageSec)
      : watched;

  if (
    !doneForUi &&
    totalSec > 0 &&
    savedProgress < totalSec - 2 &&
    ((liveCurrent != null && liveCurrent >= totalSec - 1) || watchedLive >= totalSec - 1)
  ) {
    if (liveCurrent != null) liveCurrent = Math.min(liveCurrent, savedProgress);
    watchedLive = Math.min(watchedLive, savedProgress);
  }

  const positionishRaw =
    liveCurrent != null
      ? Math.max(watchedLive, lastPos, liveCurrent)
      : Math.max(watched, lastPos);
  const positionish = totalSec > 0 ? Math.min(totalSec, positionishRaw) : positionishRaw;

  return { merged, totalSec, savedProgress, doneForUi, liveCurrent, positionish };
}

/**
 * Sidebar video row: `MM:SS / MM:SS • N%` (no "Duration" label).
 * Progress % is always vs full video length (duration). Watchtime only affects when the backend marks complete.
 */
function getLessonVideoSidebarCaption(lesson, liveById, playback, viewedIds) {
  const { merged, totalSec, doneForUi, liveCurrent, positionish } = resolveSidebarVideoProgress(
    lesson,
    liveById,
    playback,
    viewedIds
  );

  let pct;
  if (doneForUi) {
    pct = 100;
  } else if (totalSec > 0) {
    pct = Math.min(99, Math.round((100 * positionish) / totalSec));
  } else {
    const pctRaw = Number(merged.completionPercent ?? 0);
    pct =
      doneForUi && Number.isFinite(pctRaw) && pctRaw > 0
        ? Math.min(100, Math.round(pctRaw))
        : 0;
  }

  if (totalSec <= 0) {
    if (liveCurrent != null && liveCurrent > 0) {
      return `${formatSecondsToClock(liveCurrent)}`;
    }
    const dt = String(lesson?.durationTime || '').trim();
    if (dt) return dt;
    const durField = String(lesson?.duration || '').trim();
    if (durField && durField !== '—') return durField;
    return null;
  }

  const left = doneForUi
    ? totalSec
    : Math.min(totalSec, liveCurrent != null ? liveCurrent : positionish);
  return `${formatSecondsToClock(left)} / ${formatSecondsToClock(totalSec)} • ${pct}%`;
}

function getLessonVideoSidebarPercent(lesson, liveById, playback, viewedIds) {
  const { totalSec, doneForUi, liveCurrent, positionish } = resolveSidebarVideoProgress(
    lesson,
    liveById,
    playback,
    viewedIds
  );

  if (doneForUi) return 100;
  if (totalSec <= 0) {
    if (liveCurrent != null && liveCurrent > 0) return 1;
    return 0;
  }
  return Math.min(99, Math.round((100 * positionish) / totalSec));
}

function getNextLessonFromModules(modules, currentLessonId) {
  const orderedLessons = (modules || []).flatMap((section) =>
    (section.lessons || []).map((lesson) => ({ ...lesson, sectionId: section.id }))
  );
  const currentIndex = orderedLessons.findIndex((lesson) => lesson.id === currentLessonId);
  if (currentIndex < 0 || currentIndex >= orderedLessons.length - 1) return null;
  return orderedLessons[currentIndex + 1];
}

/** Required seconds for progress: no watchtime => video length; watchtime set => min(watchtime, video length) so we never require more than the video. */
function effectiveRequiredSeconds(watchtimeSec, videoDurationSec) {
  const duration =
    Number.isFinite(videoDurationSec) && videoDurationSec > 0 ? videoDurationSec : null;
  if (watchtimeSec != null && watchtimeSec > 0) {
    return duration != null ? Math.min(watchtimeSec, duration) : watchtimeSec;
  }
  return duration != null ? duration : 0;
}

// Build course content from API modules (with nested sections) when available; fallback to description/mock
const getCourseModulesFromApi = (apiModules) => {
  if (!apiModules || apiModules.length === 0) return null;
  return apiModules.map((m) => ({
    id: m.id,
    title: m.title || 'Module',
    lessons: (m.sections || []).map((s, i) => ({
      id: s.id,
      title: s.title || `Section ${i + 1}`,
      subtitle: s.subtitle || null,
      duration: s.durationTime || '—',
      videoUrl: s.videoUrl || null,
      description: s.description || null,
      content: s.content || null,
      watchtime: s.watchtime || null,
      durationTime: s.durationTime || null,
      images: Array.isArray(s.images) ? s.images : [],
      attachments: Array.isArray(s.attachments) ? s.attachments : [],
      learningMaterials: Array.isArray(s.learningMaterials) ? s.learningMaterials : [],
      sectionProgress: s.sectionProgress || null,
      isLocked: s.sectionProgress?.isLocked === true,
      isWatched: s.sectionProgress?.isWatched === true,
      isCompleted: s.sectionProgress?.isCompleted === true,
      lastPositionSeconds: Number(s.sectionProgress?.lastPositionSeconds || 0),
      isActive: i === 0,
    })),
  }));
};

const getFallbackModules = (course) => {
  if (!course) return getMockModules(null);
  const title = course.title || 'Course';
  const desc = htmlToPlainText(course.description || '');
  if (desc.trim()) {
    const paragraphs = desc.split(/\n\n+/).filter(Boolean);
    const lessons = paragraphs.slice(0, 5).map((p, i) => ({
      id: `lesson-${i + 1}`,
      title: i === 0 ? 'Introduction' : `Section ${i + 1}`,
      duration: '—',
      videoUrl: null,
      isActive: i === 0,
    }));
    if (lessons.length === 0)
      lessons.push({
        id: 'intro',
        title: 'Introduction',
        duration: '—',
        videoUrl: null,
        isActive: true,
      });
    return [
      { id: 'sec-overview', title: title.split(' ').slice(0, 3).join(' ') || 'Overview', lessons },
    ];
  }
  return getMockModules(title);
};

// Mock course content when no description (can later come from API content)
const getMockModules = (courseTitle) => [
  {
    id: 'sec-1',
    title: courseTitle ? courseTitle.split(' ').slice(0, 3).join(' ') : 'Course content',
    lessons: [
      {
        id: 'l1',
        title: 'Occupational Fraud and Common Fraud Schemes',
        duration: '15 min',
        videoUrl: null,
        isActive: true,
      },
      {
        id: 'l2',
        title: 'Preventing Occupational Fraud',
        duration: '20 min',
        videoUrl: null,
        isActive: false,
      },
    ],
  },
  { id: 'sec-2', title: 'Learning Resources', lessons: [] },
  { id: 'sec-3', title: 'Feedback', lessons: [] },
];

function hasDisplayableHtml(value) {
  const html = String(value || '').trim();
  if (!html || html === '<p></p>' || html === '<p><br></p>') return false;
  const plain = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim();
  return plain.length > 0;
}

const FEEDBACK_LESSON_ID = '__feedback__';
const FEEDBACK_SECTION_ID = 'section-feedback';
/** Pseudo lesson id: `${MODULE_PRACTICE_PREFIX}${courseModuleUuid}` — main area shows module assessment flow. */
const MODULE_PRACTICE_PREFIX = '__mp__';
/** Pseudo lesson id: `${MODULE_ASSIGNMENT_PREFIX}${courseModuleUuid}` — main area shows module assignments. */
const MODULE_ASSIGNMENT_PREFIX = '__ma__';

function getModuleIdFromPracticeLessonId(lessonId) {
  if (!lessonId || typeof lessonId !== 'string' || !lessonId.startsWith(MODULE_PRACTICE_PREFIX)) {
    return null;
  }
  const rest = lessonId.slice(MODULE_PRACTICE_PREFIX.length);
  return isUuid(rest) ? rest : null;
}

function getModuleIdFromAssignmentLessonId(lessonId) {
  if (!lessonId || typeof lessonId !== 'string' || !lessonId.startsWith(MODULE_ASSIGNMENT_PREFIX)) {
    return null;
  }
  const rest = lessonId.slice(MODULE_ASSIGNMENT_PREFIX.length);
  return isUuid(rest) ? rest : null;
}

function getModuleIdFromPseudoLessonId(lessonId) {
  return getModuleIdFromPracticeLessonId(lessonId) || getModuleIdFromAssignmentLessonId(lessonId);
}
const swrOptions = {
  revalidateIfStale: true,
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
};

const AUTO_NEXT_SECONDS = 5;

export function LearningCoursePlayerView({ course, loading, error }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const { authenticated, user } = useAuthContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const practiceQuizOn = searchParams.get('practiceQuiz') === '1';
  const [enrollmentChecked, setEnrollmentChecked] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [expandedSection, setExpandedSection] = useState('');
  const [courseContentExpanded, setCourseContentExpanded] = useState(true);
  const [activeLessonId, setActiveLessonId] = useState('');
  const [viewedSectionIds, setViewedSectionIds] = useState([]);
  const [sectionImageIndex, setSectionImageIndex] = useState(0);
  const [lessonDetailTab, setLessonDetailTab] = useState(0);
  const [courseRating, setCourseRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [autoNextCountdown, setAutoNextCountdown] = useState(0);
  const [nextLoading, setNextLoading] = useState(false);
  /** Merges PUT /progress responses so the sidebar stays in sync without refetching player-context. */
  const [liveSectionProgressMap, setLiveSectionProgressMap] = useState({});
  /** Bumped ~300ms while the active lesson is a video so sidebar time/% track playback in real time. */
  const [sidebarPlaybackTick, setSidebarPlaybackTick] = useState(0);
  const [courseSpeakers, setCourseSpeakers] = useState([]); // { id, name }[] for course.speakerIds
  const [speakerReviews, setSpeakerReviews] = useState({}); // { [speakerId]: { rating: number, feedback: string } }
  const initialSectionAutoOpenDoneRef = useRef(false);
  const saveProgressTimeoutRef = useRef(null);
  const activeLessonIdRef = useRef(activeLessonId);
  /** Section id tied to the mounted player — used when flushing on lesson switch. */
  const playerFlushSectionIdRef = useRef(null);
  /** Section id that owns `videoCoverageRangesRef` — prevents sidebar % bleed on lesson switch. */
  const videoCoverageLessonIdRef = useRef(null);
  /** Per-section playback snapshot — survives lesson switch before refs are reset. */
  const sectionPlayerSnapshotRef = useRef({});
  const updateSectionPlayerSnapshotRef = useRef(() => {});
  const captureActiveLessonProgressRef = useRef(() => {});
  /** True while lesson is incomplete — Spotlightr must keep disableForwardSeeking on. */
  const shouldBlockForwardSeekRef = useRef(() => true);
  const flatLessonsRef = useRef([]);
  const liveSectionProgressMapRef = useRef(liveSectionProgressMap);
  const urlSectionProcessedRef = useRef(null);
  const videoRef = useRef(null);
  const videoWatchedEnoughRef = useRef(null);
  const youtubePlayerRef = useRef(null);
  const youtubeContainerRef = useRef(null);
  const spotlightrPlayerRef = useRef(null);
  const spotlightrContainerRef = useRef(null);
  const spotlightrProgressRef = useRef({
    watchedSeconds: 0,
    pendingDeltaSeconds: 0,
    lastTime: 0,
    duration: 0,
    maxWatchedTimeline: 0,
    isPlaying: false,
    markedComplete: false,
  });
  const viewedSectionIdsRef = useRef(viewedSectionIds);
  const courseIdRef = useRef(course?.id || null);
  const flushSectionProgressRef = useRef(() => {});
  /** Real section UUIDs from API — reject stale URL/mock ids before progress PUT. */
  const apiSectionIdsRef = useRef([]);
  const lastProgressPayloadRef = useRef({ key: '', at: 0 });
  const lastFlushPayloadRef = useRef({ key: '', at: 0 });
  const completedSectionIdsRef = useRef(new Set());
  const autoPlayNextRef = useRef(false);
  const autoNextTimerRef = useRef(null);
  // Progress only counts while video is playing
  const youtubeProgressRef = useRef({
    watchedSeconds: 0,
    pendingDeltaSeconds: 0,
    lastTime: 0,
    isPlaying: false,
    markedComplete: false,
  });
  const nativeVideoProgressRef = useRef({
    watchedSeconds: 0,
    pendingDeltaSeconds: 0,
    lastTime: 0,
    maxWatchedTimeline: 0,
    isPlaying: false,
    markedComplete: false,
  });
  /** Timeline coverage [[start,end],...] — unique seconds watched; repeats don't add length. */
  const videoCoverageRangesRef = useRef([]);
  const fullDurationSyncRef = useRef({ sectionId: null, sent: false });
  const imageSectionMarkedRef = useRef(false);
  const resumeSeekAppliedRef = useRef({ sectionId: null, seconds: 0, applied: false });
  /** Briefly skip seek rollback while resume / server hydration seeks apply (mobile). */
  const videoSeekClampGraceUntilRef = useRef(0);
  const markVideoSeekClampGrace = useCallback((ms) => {
    const duration = ms ?? (isAppleMobileDevice() ? 5000 : 3500);
    videoSeekClampGraceUntilRef.current = Date.now() + duration;
  }, []);
  const nativeVideoSeekClampRef = useRef({ inFlight: false, clearTimer: null });
  const isVideoSeekClampGraceActive = useCallback(
    () => Date.now() < videoSeekClampGraceUntilRef.current,
    []
  );
  const rightScrollRef = useRef(null);
  const lessonDetailSectionRef = useRef(null);
  viewedSectionIdsRef.current = viewedSectionIds;
  completedSectionIdsRef.current = new Set([
    ...viewedSectionIds,
    ...Object.entries(liveSectionProgressMap || {})
      .filter(([, p]) => p?.isCompleted === true || p?.isWatched === true)
      .map(([id]) => id),
  ]);
  activeLessonIdRef.current = activeLessonId;
  courseIdRef.current = course?.id || null;
  liveSectionProgressMapRef.current = liveSectionProgressMap;

  /** Keeps sidebar locks + module % in sync when the player marks a lesson done before SWR refetch. */
  const appendViewedSectionId = useCallback((sectionId) => {
    if (!sectionId || sectionId === FEEDBACK_LESSON_ID || !isUuid(sectionId)) return;
    setViewedSectionIds((prev) => {
      if (prev.includes(sectionId)) return prev;
      const next = [...prev, sectionId];
      viewedSectionIdsRef.current = next;
      return next;
    });
  }, []);

  const sendProgressUpdate = useCallback((courseId, sectionId, payload, useKeepalive = false, force = false) => {
    if (!courseId || !sectionId || !payload) return Promise.resolve(null);
    if (!isUuid(sectionId) || sectionId === FEEDBACK_LESSON_ID) return Promise.resolve(null);
    const knownSectionIds = apiSectionIdsRef.current;
    if (knownSectionIds.length > 0 && !knownSectionIds.includes(sectionId)) {
      return Promise.resolve(null);
    }
    const cappedPayload = capProgressDurationForLesson(
      sectionId,
      payload,
      flatLessonsRef.current,
      liveSectionProgressMapRef.current,
      viewedSectionIdsRef.current
    );
    // markCompleted / minimal payloads are not video timeline updates — do not apply video "full watched" short-circuit.
    const isMarkCompletedOnly =
      Boolean(payload.markCompleted) &&
      !Array.isArray(payload.watchedCoverageRanges) &&
      !(Number(payload.watchedSeconds) > 0) &&
      !(Number(payload.lastPositionSeconds) > 0);
    if (
      !isMarkCompletedOnly &&
      isSectionLessonComplete(
        sectionId,
        flatLessonsRef.current,
        liveSectionProgressMapRef.current,
        viewedSectionIdsRef.current
      )
    ) {
      return Promise.resolve(null);
    }
    if (!force && !isMarkCompletedOnly) {
      const live = liveSectionProgressMap?.[sectionId] || {};
      const knownDuration = Math.max(0, Number(live.durationSeconds || 0));
      const knownProgress = Math.max(
        0,
        Number(live.watchedSeconds || 0),
        Number(live.lastPositionSeconds || 0)
      );
      const payloadDuration = Math.max(0, Number(cappedPayload.durationSeconds || 0));
      const payloadProgress = Math.max(
        0,
        Number(cappedPayload.watchedSeconds || 0),
        Number(cappedPayload.lastPositionSeconds || 0)
      );
      const fullDuration = Math.max(knownDuration, payloadDuration);
      const progressed = Math.max(knownProgress, payloadProgress);
      // Stop normal progress calls only after full video duration has been reached.
      if (fullDuration > 0 && progressed >= fullDuration - 1) {
        return Promise.resolve(null);
      }
    }
    const rangeLen = Array.isArray(payload.watchedCoverageRanges)
      ? payload.watchedCoverageRanges.length
      : -1;
    const key = [
      courseId,
      sectionId,
      Number(cappedPayload.watchedDeltaSeconds || 0),
      Number(cappedPayload.watchedSeconds ?? -1),
      Number(cappedPayload.lastPositionSeconds || 0),
      Number(cappedPayload.durationSeconds || 0),
      Boolean(cappedPayload.markCompleted),
      rangeLen,
    ].join('|');
    const now = Date.now();
    if (
      !force &&
      lastProgressPayloadRef.current.key === key &&
      now - lastProgressPayloadRef.current.at < 1200
    ) {
      return Promise.resolve(null);
    }
    lastProgressPayloadRef.current = { key, at: now };
    if (useKeepalive) {
      courseService.updateSectionProgressOnUnload(courseId, sectionId, cappedPayload);
      return Promise.resolve(null);
    }
    return courseService
      .updateSectionProgress(courseId, sectionId, cappedPayload)
      .then((data) => {
        if (data && typeof data === 'object' && sectionId) {
          setLiveSectionProgressMap((prev) => ({
            ...prev,
            [sectionId]: mergeServerProgressIntoMap(prev[sectionId], data),
          }));
          if (
            Array.isArray(data.watchedCoverageRanges) &&
            sectionId === activeLessonIdRef.current
          ) {
            const dur = Math.round(Number(data.durationSeconds || 0));
            const pairs = parseCoverageRangePairs(data.watchedCoverageRanges);
            videoCoverageRangesRef.current =
              dur > 0 ? clipCoverageRangesPlayer(mergeCoverageRangesPlayer(pairs), dur) : mergeCoverageRangesPlayer(pairs);
          }
        }
        return data;
      })
      .catch(() => null);
  }, [liveSectionProgressMap]);

  const syncProgressOnFullDuration = useCallback((sectionId, lastPosition, durationSeconds) => {
    const courseId = courseIdRef.current;
    if (!courseId || !sectionId || sectionId === FEEDBACK_LESSON_ID) return;
    if (!isUuid(sectionId)) return;
    const state = fullDurationSyncRef.current;
    if (state.sectionId !== sectionId) {
      fullDurationSyncRef.current = { sectionId, sent: false };
    }
    if (fullDurationSyncRef.current.sent) return;
    const payload = buildVideoCoveragePayloadFromRef(
      videoCoverageRangesRef,
      lastPosition,
      durationSeconds
    );
    fullDurationSyncRef.current.sent = true;
    sendProgressUpdate(courseId, sectionId, payload, false, true)
      .then((data) => {
        if (!data || typeof data !== 'object') return;
        setLiveSectionProgressMap((prev) => ({
          ...prev,
          [sectionId]: mergeServerProgressIntoMap(prev[sectionId], data),
        }));
        if (data.isCompleted === true || data.isWatched === true) {
          appendViewedSectionId(sectionId);
        }
      })
      .catch(() => {
        fullDurationSyncRef.current.sent = false;
      });
  }, [sendProgressUpdate, appendViewedSectionId]);

  const startAutoNextCountdown = useCallback((nextLessonMeta) => {
    if (!nextLessonMeta?.id) return;
    if (autoNextTimerRef.current) {
      clearInterval(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }
    setAutoNextCountdown(AUTO_NEXT_SECONDS);
    autoNextTimerRef.current = setInterval(() => {
      setAutoNextCountdown((prev) => {
        if (prev <= 1) {
          if (autoNextTimerRef.current) {
            clearInterval(autoNextTimerRef.current);
            autoNextTimerRef.current = null;
          }
          const nextIsPractice = Boolean(getModuleIdFromPracticeLessonId(nextLessonMeta.id));
          autoPlayNextRef.current = !nextIsPractice && Boolean(nextLessonMeta.videoUrl);
          setActiveLessonId(nextLessonMeta.id);
          setExpandedSection(nextLessonMeta.sectionId);
          if (nextIsPractice) {
            setSearchParams({ section: nextLessonMeta.id, practiceQuiz: '1' }, { replace: true });
          } else {
            setSearchParams({ section: nextLessonMeta.id }, { replace: true });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [setSearchParams]);

  useEffect(() => {
    shouldBlockForwardSeekRef.current = () => {
      const sid = activeLessonIdRef.current;
      if (!sid || !isUuid(sid)) return false;
      if (spotlightrProgressRef.current?.markedComplete) return false;
      if (viewedSectionIdsRef.current.includes(sid)) return false;
      const lesson = flatLessonsRef.current.find((l) => l.id === sid);
      if (!lesson) return true;
      const merged = mergeProgressForSidebar(lesson, liveSectionProgressMapRef.current);
      if (merged.isWatched === true || merged.isCompleted === true) return false;
      return true;
    };

    updateSectionPlayerSnapshotRef.current = (sectionId, data) => {
      if (!sectionId || !isUuid(sectionId)) return;
      const prev = sectionPlayerSnapshotRef.current[sectionId] || {};
      sectionPlayerSnapshotRef.current[sectionId] = {
        ...prev,
        ...data,
        lastPositionSeconds: Math.max(
          Number(prev.lastPositionSeconds || 0),
          Number(data?.lastPositionSeconds || 0)
        ),
        watchedSeconds: Math.max(
          Number(prev.watchedSeconds || 0),
          Number(data?.watchedSeconds || 0)
        ),
        durationSeconds: Math.max(
          Number(prev.durationSeconds || 0),
          Number(data?.durationSeconds || 0)
        ),
      };
    };

    const captureLessonProgressToLiveMap = (sectionId) => {
      if (!sectionId || !isUuid(sectionId) || sectionId === FEEDBACK_LESSON_ID) return;
      if (videoCoverageLessonIdRef.current !== sectionId) return;

      const spotlightrProg = spotlightrProgressRef.current;
      const nativeVideo = videoRef.current;
      const ytPlayer = youtubePlayerRef.current;
      let lastPosition = Math.max(
        Number(spotlightrProg?.lastTime || 0),
        Number(spotlightrProg?.maxWatchedTimeline || 0),
        Number(nativeVideo?.currentTime || 0),
        Number(youtubeProgressRef.current?.lastTime || 0)
      );
      if (ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
        try {
          lastPosition = Math.max(lastPosition, Number(ytPlayer.getCurrentTime() || 0));
        } catch {
          // ignore
        }
      }
      const priorLive = liveSectionProgressMapRef.current[sectionId];
      lastPosition = Math.max(
        lastPosition,
        Number(priorLive?.lastPositionSeconds || 0),
        Number(priorLive?.watchedSeconds || 0),
        maxCoverageEndPlayer(videoCoverageRangesRef.current)
      );
      if (!(lastPosition > 0)) return;

      let duration = Math.max(
        Number(spotlightrProg?.duration || 0),
        Number(nativeVideo?.duration || 0),
        Number(priorLive?.durationSeconds || 0)
      );
      if (ytPlayer && typeof ytPlayer.getDuration === 'function') {
        try {
          duration = Math.max(duration, Number(ytPlayer.getDuration() || 0));
        } catch {
          // ignore
        }
      }
      const durRounded = Math.round(duration || 0);
      const watchedSeconds =
        durRounded > 0
          ? coverageMeasurePlayer(videoCoverageRangesRef.current, durRounded)
          : 0;
      const watchedCoverageRanges = mergeCoverageRangesPlayer(
        parseCoverageRangePairs(videoCoverageRangesRef.current)
      ).map(([s, e]) => [Math.round(s * 100) / 100, Math.round(e * 100) / 100]);
      const payload = {
        lastPositionSeconds: Math.round(lastPosition),
        durationSeconds: durRounded,
        watchedSeconds: Math.max(watchedSeconds, Math.round(lastPosition)),
        watchedCoverageRanges,
      };
      updateSectionPlayerSnapshotRef.current(sectionId, payload);
      setLiveSectionProgressMap((prev) => ({
        ...prev,
        [sectionId]: mergeServerProgressIntoMap(prev[sectionId], payload),
      }));
    };

    captureActiveLessonProgressRef.current = () => {
      captureLessonProgressToLiveMap(activeLessonIdRef.current);
    };

    const flushSectionProgress = (useKeepalive = false, force = false, sectionIdOverride = null) => {
      if (sectionIdOverride) {
        captureLessonProgressToLiveMap(sectionIdOverride);
      }
      const courseId = courseIdRef.current;
      const sectionId =
        sectionIdOverride || playerFlushSectionIdRef.current || activeLessonIdRef.current;
      if (!courseId || !sectionId || sectionId === FEEDBACK_LESSON_ID) return;
      if (!isUuid(sectionId)) return;
      if (getModuleIdFromPseudoLessonId(sectionId)) return;
      const knownSectionIds = apiSectionIdsRef.current;
      if (knownSectionIds.length > 0 && !knownSectionIds.includes(sectionId)) return;
      if (
        isSectionLessonComplete(
          sectionId,
          flatLessonsRef.current,
          liveSectionProgressMapRef.current,
          viewedSectionIdsRef.current
        )
      ) {
        return undefined;
      }

      const snapshot = sectionPlayerSnapshotRef.current[sectionId] || null;
      const mountedSectionId = playerFlushSectionIdRef.current || activeLessonIdRef.current;
      const snapshotRangesRef = { current: parseCoverageRangePairs(snapshot?.watchedCoverageRanges) };
      const coverageRef =
        sectionId !== mountedSectionId && snapshotRangesRef.current.length > 0
          ? snapshotRangesRef
          : videoCoverageRangesRef;

      let lastPosition = Math.max(0, Number(snapshot?.lastPositionSeconds || 0));
      let duration = Math.max(0, Number(snapshot?.durationSeconds || 0));

      const nativeVideo = videoRef.current;
      if (nativeVideo) {
        lastPosition = Math.max(lastPosition, Number(nativeVideo.currentTime || 0));
        duration = Math.max(duration, Number(nativeVideo.duration || 0));
      }

      const ytPlayer = youtubePlayerRef.current;
      if (ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
        try {
          lastPosition = Math.max(lastPosition, Number(ytPlayer.getCurrentTime() || 0));
          if (typeof ytPlayer.getDuration === 'function') {
            duration = Math.max(duration, Number(ytPlayer.getDuration() || 0));
          }
        } catch {
          // ignore YT runtime errors during unload
        }
      }

      const spotlightrPlayer = spotlightrPlayerRef.current;
      const spotlightrProg = spotlightrProgressRef.current;
      if (spotlightrPlayer && typeof spotlightrPlayer.getCurrentTime === 'function') {
        try {
          lastPosition = Math.max(lastPosition, Number(spotlightrPlayer.getCurrentTime() || 0));
          if (typeof spotlightrPlayer.getDuration === 'function') {
            duration = Math.max(duration, Number(spotlightrPlayer.getDuration() || 0));
          }
        } catch {
          // ignore Spotlightr runtime errors during unload
        }
      }

      const nativeProg = nativeVideoProgressRef.current;
      const ytProg = youtubeProgressRef.current;
      const priorLive = liveSectionProgressMapRef.current[sectionId];
      lastPosition = Math.max(
        lastPosition,
        Number(nativeProg?.lastTime || 0),
        Number(nativeProg?.maxWatchedTimeline || 0),
        Number(ytProg?.lastTime || 0),
        Number(ytProg?.maxWatchedTimeline || 0),
        Number(spotlightrProg?.lastTime || 0),
        Number(spotlightrProg?.maxWatchedTimeline || 0),
        maxCoverageEndPlayer(coverageRef.current),
        Number(priorLive?.lastPositionSeconds || 0),
        Number(priorLive?.watchedSeconds || 0)
      );

      if (nativeProg?.isPlaying && nativeVideo) {
        appendCoverageSlicePlayer(
          coverageRef,
          nativeProg.lastTime,
          nativeVideo.currentTime,
          Math.round(duration || 0)
        );
      }
      if (ytProg?.isPlaying && ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
        try {
          appendCoverageSlicePlayer(
            coverageRef,
            ytProg.lastTime,
            ytPlayer.getCurrentTime(),
            Math.round(duration || 0)
          );
        } catch {
          // ignore
        }
      }
      if (spotlightrPlayer && spotlightrProg) {
        try {
          const durRoundedForSlice = Math.round(duration || 0);
          const currentSpotlightr = Math.max(
            0,
            Number(spotlightrPlayer.getCurrentTime?.() || spotlightrProg.lastTime || 0)
          );
          if (spotlightrProg.isPlaying) {
            appendCoverageSlicePlayer(
              coverageRef,
              spotlightrProg.lastTime,
              currentSpotlightr,
              durRoundedForSlice
            );
          } else if (currentSpotlightr > 0) {
            const covEnd = maxCoverageEndPlayer(coverageRef.current);
            if (currentSpotlightr > covEnd + 0.25) {
              appendCoverageSlicePlayer(
                coverageRef,
                Math.max(0, covEnd),
                currentSpotlightr,
                durRoundedForSlice
              );
            }
          }
        } catch {
          // ignore
        }
      }

      const durRounded = Math.round(duration || 0);
      let payload = buildVideoCoveragePayloadFromRef(coverageRef, lastPosition, durRounded);
      payload = capProgressDurationForLesson(
        sectionId,
        payload,
        flatLessonsRef.current,
        liveSectionProgressMapRef.current,
        viewedSectionIdsRef.current
      );
      if (payload.watchedSeconds <= 0 && payload.lastPositionSeconds <= 0) return;

      const flushKey = [
        sectionId,
        payload.lastPositionSeconds,
        payload.watchedSeconds,
        payload.durationSeconds,
        Array.isArray(payload.watchedCoverageRanges) ? payload.watchedCoverageRanges.length : 0,
      ].join('|');
      const flushNow = Date.now();
      if (
        flushNow - lastFlushPayloadRef.current.at < 1500 &&
        lastFlushPayloadRef.current.key === flushKey
      ) {
        return undefined;
      }
      lastFlushPayloadRef.current = { key: flushKey, at: flushNow };

      sectionPlayerSnapshotRef.current[sectionId] = {
        lastPositionSeconds: payload.lastPositionSeconds,
        durationSeconds: payload.durationSeconds,
        watchedSeconds: payload.watchedSeconds,
        watchedCoverageRanges: payload.watchedCoverageRanges,
      };

      if (!useKeepalive) {
        setLiveSectionProgressMap((prev) => ({
          ...prev,
          [sectionId]: mergeServerProgressIntoMap(prev[sectionId], payload),
        }));
      }

      const req = sendProgressUpdate(courseId, sectionId, payload, useKeepalive, useKeepalive);

      nativeVideoProgressRef.current.pendingDeltaSeconds = 0;
      youtubeProgressRef.current.pendingDeltaSeconds = 0;
      spotlightrProgressRef.current.pendingDeltaSeconds = 0;
      return req;
    };
    flushSectionProgressRef.current = flushSectionProgress;

    const handlePageHide = () => flushSectionProgress(true, true);
    const handleBeforeUnload = () => flushSectionProgress(true, true);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushSectionProgress(true, true);
      }
    };

    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      flushSectionProgress(true, true);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [sendProgressUpdate]);

  const playerKey = course?.id ? `/courses/${course.id}/player-context` : '';
  const { data: playerContext, isLoading: playerLoading } = useSWR(
    playerKey,
    () => courseService.getCoursePlayerContext(course.id),
    swrOptions
  );

  const questionBankSwrKey = course?.id ? ['course-question-bank', course.id] : null;
  const { data: questionBankList = [] } = useSWR(
    questionBankSwrKey,
    () => courseService.getCourseQuestionBank(course.id),
    swrOptions
  );

  const quizCountByModuleId = useMemo(() => {
    const m = {};
    (questionBankList || []).forEach((q) => {
      if (!q?.moduleId || q.questionType === 'assignment') return;
      m[q.moduleId] = (m[q.moduleId] || 0) + 1;
    });
    return m;
  }, [questionBankList]);

  const assignmentCountByModuleId = useMemo(() => {
    const m = {};
    (questionBankList || []).forEach((q) => {
      if (!q?.moduleId || q.questionType !== 'assignment') return;
      m[q.moduleId] = (m[q.moduleId] || 0) + 1;
    });
    return m;
  }, [questionBankList]);

  const modulePracticeModuleId = useMemo(
    () => getModuleIdFromPracticeLessonId(activeLessonId),
    [activeLessonId]
  );

  const moduleAssignmentModuleId = useMemo(
    () => getModuleIdFromAssignmentLessonId(activeLessonId),
    [activeLessonId]
  );

  const modulePracticeQuestions = useMemo(() => {
    if (!modulePracticeModuleId) return [];
    return (questionBankList || []).filter(
      (q) => q?.moduleId === modulePracticeModuleId && q?.questionType !== 'assignment'
    );
  }, [questionBankList, modulePracticeModuleId]);

  const moduleAssignmentQuestions = useMemo(() => {
    if (!moduleAssignmentModuleId) return [];
    return (questionBankList || []).filter(
      (q) => q?.moduleId === moduleAssignmentModuleId && q?.questionType === 'assignment'
    );
  }, [questionBankList, moduleAssignmentModuleId]);

  useEffect(() => {
    if (!practiceQuizOn) return;
    if (!getModuleIdFromPracticeLessonId(activeLessonId)) {
      const sec = searchParams.get('section');
      if (sec) setSearchParams({ section: sec }, { replace: true });
    }
  }, [practiceQuizOn, activeLessonId, searchParams, setSearchParams]);

  useEffect(() => {
    setLiveSectionProgressMap({});
    sectionPlayerSnapshotRef.current = {};
  }, [course?.id]);

  const apiModules = playerContext?.modules || [];

  const modules = useMemo(() => {
    const fromApi = getCourseModulesFromApi(apiModules);
    if (fromApi && fromApi.length > 0) return fromApi;
    return getFallbackModules(playerContext?.course || course);
  }, [apiModules, playerContext?.course, course]);

  const modulePracticeModuleMeta = useMemo(() => {
    if (!modulePracticeModuleId) return null;
    return modules.find((m) => m.id === modulePracticeModuleId) || null;
  }, [modules, modulePracticeModuleId]);

  const moduleAssignmentModuleMeta = useMemo(() => {
    if (!moduleAssignmentModuleId) return null;
    return modules.find((m) => m.id === moduleAssignmentModuleId) || null;
  }, [modules, moduleAssignmentModuleId]);

  const flatLessons = useMemo(
    () =>
      modules.flatMap((sec) =>
        (sec.lessons || []).map((lesson) => ({ ...lesson, sectionId: sec.id }))
      ),
    [modules]
  );
  flatLessonsRef.current = flatLessons;

  const markLessonCompletedOnly = useCallback(
    (lessonId) => {
      if (
        !authenticated ||
        !course?.id ||
        !lessonId ||
        lessonId === FEEDBACK_LESSON_ID ||
        !isUuid(lessonId)
      ) {
        return;
      }
      const lessonRow = flatLessons.find((l) => l.id === lessonId);
      if (lessonRow && isLessonDoneForUi(lessonRow, liveSectionProgressMap, viewedSectionIds)) {
        appendViewedSectionId(lessonId);
        return;
      }

      sendProgressUpdate(course.id, lessonId, {
        watchedDeltaSeconds: 1,
        durationSeconds: 1,
        markCompleted: true,
      });

      appendViewedSectionId(lessonId);
    },
    [
      appendViewedSectionId,
      authenticated,
      course?.id,
      flatLessons,
      liveSectionProgressMap,
      sendProgressUpdate,
      viewedSectionIds,
    ]
  );

  const completeSection = useCallback(
    (lessonId) => {
      if (!lessonId || lessonId === FEEDBACK_LESSON_ID) return;
      markLessonCompletedOnly(lessonId);
    },
    [markLessonCompletedOnly]
  );

  useEffect(() => {
    if (!activeLessonId || activeLessonId === FEEDBACK_LESSON_ID) return undefined;
    if (getModuleIdFromPseudoLessonId(activeLessonId)) return undefined;
    const hasVideo = flatLessons.some((l) => l.id === activeLessonId && l.videoUrl);
    if (!hasVideo) return undefined;
    const id = window.setInterval(() => {
      setSidebarPlaybackTick((n) => n + 1);
    }, 250);
    return () => window.clearInterval(id);
  }, [activeLessonId, flatLessons]);

  /** Real section UUIDs from API only — used once to hydrate completed lessons (no N calls for mock/fallback content). */
  const apiSectionIdsForProgress = useMemo(() => {
    const list = apiModules || [];
    return list
      .flatMap((m) => m.sections || [])
      .map((s) => s.id)
      .filter((id) => isUuid(id));
  }, [apiModules]);
  apiSectionIdsRef.current = apiSectionIdsForProgress;

  // Guard: require membership login before taking any course.
  useEffect(() => {
    if (!course?.id || loading || playerLoading) return undefined;
    if (!authenticated) {
      const returnTo = encodeURIComponent(paths.learningCourse.details(course.id));
      navigate(`${paths.auth.simple.signIn}?returnTo=${returnTo}`, { replace: true });
      return undefined;
    }
    const paidCourse = isPaidCourse(course.freeOrPaid);
    if (!paidCourse) {
      setEnrollmentChecked(true);
      setEnrolled(true);
      return undefined;
    }
    // When player context is loaded, it already tells us whether user is enrolled.
    if (playerContext) {
      setEnrollmentChecked(true);
      if (!playerContext.enrolled) {
        toast.error('Purchase this course to access content');
        navigate(paths.learningCourse.details(course.id), { replace: true });
      } else {
        setEnrolled(true);
      }
    }
    return undefined;
  }, [course?.id, course?.freeOrPaid, loading, playerLoading, playerContext, authenticated, navigate]);

  const sectionProgressData = useMemo(() => {
    if (
      !authenticated ||
      !activeLessonId ||
      activeLessonId === FEEDBACK_LESSON_ID ||
      !isUuid(activeLessonId) ||
      flatLessons.length === 0
    ) {
      return null;
    }
    const base = flatLessons.find((l) => l.id === activeLessonId)?.sectionProgress || null;
    const live = liveSectionProgressMap[activeLessonId];
    if (!base && !live) return null;
    if (!live) return base;
    return mergeServerProgressIntoMap(base, live);
  }, [authenticated, activeLessonId, flatLessons, liveSectionProgressMap]);

  const sectionProgressCoverageSig = useMemo(() => {
    if (!sectionProgressData) return '';
    return JSON.stringify([
      sectionProgressData.watchedSeconds,
      sectionProgressData.durationSeconds,
      sectionProgressData.watchedCoverageRanges,
    ]);
  }, [sectionProgressData]);

  const isFirstLessonInCourse =
    flatLessons.length > 0 && activeLessonId && flatLessons[0]?.id === activeLessonId;

  // Lock state: primarily from backend, but also consider locally viewed sections so next lesson unlocks instantly.
  const activeLessonIndex = useMemo(
    () => flatLessons.findIndex((l) => l.id === activeLessonId),
    [flatLessons, activeLessonId]
  );
  let activeLessonContentLocked =
    authenticated &&
    activeLessonId &&
    isUuid(activeLessonId) &&
    activeLessonId !== FEEDBACK_LESSON_ID &&
    sectionProgressData?.isLocked === true;
  // Completed sections stay accessible (sticky unlock); never block content for them.
  if (
    activeLessonContentLocked &&
    (sectionProgressData?.isCompleted === true || sectionProgressData?.isWatched === true)
  ) {
    activeLessonContentLocked = false;
  }
  const activeLessonRowForGate =
    activeLessonId && flatLessons.length > 0 ? flatLessons.find((l) => l.id === activeLessonId) : null;
  if (
    activeLessonContentLocked &&
    activeLessonRowForGate &&
    isLessonDoneForUi(activeLessonRowForGate, liveSectionProgressMap, viewedSectionIds)
  ) {
    activeLessonContentLocked = false;
  }
  // If previous lesson is already viewed/completed locally, do not treat this one as locked in UI.
  const activePrevRow = activeLessonIndex > 0 ? flatLessons[activeLessonIndex - 1] : null;
  if (
    activeLessonContentLocked &&
    activePrevRow &&
    isLessonDoneForUi(activePrevRow, liveSectionProgressMap, viewedSectionIds)
  ) {
    activeLessonContentLocked = false;
  }
  let activeLessonProgressPending = false;
  let activeLessonGateBlocked = activeLessonContentLocked;

  // Sync current section watched state from backend.
  useEffect(() => {
    if (!activeLessonId || activeLessonId === FEEDBACK_LESSON_ID) return;
    if (!sectionProgressData?.isWatched && !sectionProgressData?.isCompleted) return;
    setViewedSectionIds((prev) => {
      if (prev.includes(activeLessonId)) return prev;
      const next = [...prev, activeLessonId];
      viewedSectionIdsRef.current = next;
      return next;
    });
  }, [sectionProgressData, activeLessonId]);

  // Hydrate watched state from module payload progress so no per-section progress GET is needed.
  useEffect(() => {
    if (!authenticated || apiSectionIdsForProgress.length === 0) return undefined;
    const watchedIds = flatLessons
      .filter(
        (lesson) =>
          isUuid(lesson.id) &&
          (lesson.sectionProgress?.isWatched === true || lesson.sectionProgress?.isCompleted === true)
      )
      .map((lesson) => lesson.id);
    if (watchedIds.length === 0) return undefined;
    const validIds = new Set(apiSectionIdsForProgress);
    setViewedSectionIds((prev) => {
      const merged = [...new Set([...prev, ...watchedIds])].filter((id) => validIds.has(id));
      viewedSectionIdsRef.current = merged;
      return merged;
    });
  }, [authenticated, apiSectionIdsForProgress, flatLessons]);

  // Reset per-lesson UI and native video tracking before hydrating progress for the new lesson (effect order matters).
  useEffect(() => {
    if (autoNextTimerRef.current) {
      clearInterval(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }
    setAutoNextCountdown(0);
    setSectionImageIndex(0);
    setLessonDetailTab(0);
    fullDurationSyncRef.current = { sectionId: activeLessonId || null, sent: false };
    imageSectionMarkedRef.current = false;
  }, [activeLessonId]);

  // Save progress only when switching lessons — not when live/server progress updates (avoids flush loops).
  useLayoutEffect(() => {
    const lessonId = activeLessonId;
    if (!lessonId || lessonId === FEEDBACK_LESSON_ID || !isUuid(lessonId)) {
      return undefined;
    }
    return () => {
      flushSectionProgressRef.current?.(false, false, lessonId);
    };
  }, [activeLessonId]);

  // Hydrate before paint so mobile playback is not clamped to 0 before server progress applies.
  useLayoutEffect(() => {
    if (!activeLessonId || activeLessonId === FEEDBACK_LESSON_ID || !isUuid(activeLessonId)) {
      playerFlushSectionIdRef.current = null;
      videoCoverageLessonIdRef.current = null;
      return undefined;
    }
    const lesson = flatLessons.find((l) => l.id === activeLessonId);
    if (!lesson) return undefined;
    videoCoverageLessonIdRef.current = activeLessonId;
    playerFlushSectionIdRef.current = activeLessonId;
    spotlightrPlayerRef.current = null;
    const sp = sectionProgressData;
    const snap = sectionPlayerSnapshotRef.current[activeLessonId] || null;
    const watchtimeSec = parseWatchtimeToSeconds(lesson.watchtime || '');
    const d = Math.max(
      Number(sp?.durationSeconds || 0),
      Number(snap?.durationSeconds || 0),
      watchtimeSec || 0
    );
    let ranges = [];
    if (sp && Array.isArray(sp.watchedCoverageRanges) && sp.watchedCoverageRanges.length > 0) {
      ranges = parseCoverageRangePairs(sp.watchedCoverageRanges);
    } else if (snap && Array.isArray(snap.watchedCoverageRanges) && snap.watchedCoverageRanges.length > 0) {
      ranges = parseCoverageRangePairs(snap.watchedCoverageRanges);
    } else if (sp && (sp.watchedSeconds || 0) > 0 && d > 0) {
      ranges = [[0, Math.min(sp.watchedSeconds, d)]];
    } else if (snap && (snap.watchedSeconds || 0) > 0 && d > 0) {
      ranges = [[0, Math.min(snap.watchedSeconds, d)]];
    }
    videoCoverageRangesRef.current =
      d > 0 ? clipCoverageRangesPlayer(mergeCoverageRangesPlayer(ranges), d) : mergeCoverageRangesPlayer(ranges);
    const covMax = maxCoverageEndPlayer(videoCoverageRangesRef.current);
    const lastPos = Math.max(
      Number(sp?.lastPositionSeconds || 0),
      Number(snap?.lastPositionSeconds || 0)
    );
    const maxTimeline = Math.max(covMax, lastPos);
    nativeVideoProgressRef.current.maxWatchedTimeline = maxTimeline;
    nativeVideoProgressRef.current.markedComplete = Boolean(sp?.isCompleted);
    nativeVideoProgressRef.current.lastTime = lastPos;
    youtubeProgressRef.current.maxWatchedTimeline = maxTimeline;
    youtubeProgressRef.current.markedComplete = Boolean(sp?.isCompleted || sp?.isWatched);
    youtubeProgressRef.current.lastTime = lastPos;
    youtubeProgressRef.current.isPlaying = false;
    spotlightrProgressRef.current.maxWatchedTimeline = maxTimeline;
    spotlightrProgressRef.current.markedComplete = Boolean(
      sp?.isCompleted || sp?.isWatched
    );
    spotlightrProgressRef.current.lastTime = lastPos;
    spotlightrProgressRef.current.isPlaying = false;
    spotlightrProgressRef.current.watchedSeconds = 0;
    spotlightrProgressRef.current.pendingDeltaSeconds = 0;
    const lessonVideoDur = lessonFallbackDurationSeconds(lesson, liveSectionProgressMap);
    spotlightrProgressRef.current.duration = Math.max(
      Number(sp?.durationSeconds || 0),
      Number(snap?.durationSeconds || 0),
      lessonVideoDur || 0
    );
    setSidebarPlaybackTick((n) => n + 1);
    return undefined;
  }, [activeLessonId, sectionProgressCoverageSig, flatLessons, markVideoSeekClampGrace, liveSectionProgressMap]);

  // Speakers from player-context course payload (`speakers`); legacy fallback if ids exist but list empty
  useEffect(() => {
    const ids = Array.isArray(course?.speakerIds) ? course.speakerIds : [];
    if (ids.length === 0) {
      setCourseSpeakers([]);
      setSpeakerReviews({});
      return undefined;
    }

    const embedded = Array.isArray(course?.speakers) ? course.speakers : [];
    if (embedded.length > 0) {
      const byId = Object.fromEntries(embedded.map((s) => [s.id, s]));
      const list = ids.map((id) => byId[id]).filter(Boolean);
      setCourseSpeakers(list);
      setSpeakerReviews((prev) => {
        const next = { ...prev };
        list.forEach((s) => {
          if (next[s.id] == null) next[s.id] = { rating: 0, feedback: '' };
        });
        return next;
      });
      return undefined;
    }

    let cancelled = false;
    speakerService
      .getAll()
      .then((all) => {
        if (cancelled) return;
        const list = ids.map((id) => all.find((s) => s.id === id)).filter(Boolean);
        setCourseSpeakers(list);
        setSpeakerReviews((prev) => {
          const next = { ...prev };
          list.forEach((s) => {
            if (next[s.id] == null) next[s.id] = { rating: 0, feedback: '' };
          });
          return next;
        });
      })
      .catch(() => {
        if (!cancelled) setCourseSpeakers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [course?.speakerIds, course?.speakers]);

  // Track lesson view state in local UI only
  useEffect(() => {
    const isUUID = (id) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    if (activeLessonGateBlocked) return undefined;
    if (!authenticated || !course?.id || !activeLessonId || !isUUID(activeLessonId))
      return undefined;
    const lesson = modules.flatMap((sec) => sec.lessons || []).find((l) => l.id === activeLessonId);
    const hasVideo = !!lesson?.videoUrl;
    const hasImages = Array.isArray(lesson?.images) && lesson.images.length > 0;
    if (hasVideo) return undefined; // progress set when user watches video / video ends
    if (hasImages) return undefined; // progress set when user views all images
    if (saveProgressTimeoutRef.current) clearTimeout(saveProgressTimeoutRef.current);
    const lessonIdToSave = activeLessonId;
    const delayMs = TEXT_VIEW_COMPLETE_DELAY_MS;
    saveProgressTimeoutRef.current = setTimeout(() => {
      if (activeLessonIdRef.current !== lessonIdToSave) return;
      completeSection(lessonIdToSave);
      saveProgressTimeoutRef.current = null;
    }, delayMs);
    return () => {
      if (saveProgressTimeoutRef.current) clearTimeout(saveProgressTimeoutRef.current);
    };
  }, [authenticated, course?.id, activeLessonId, modules, activeLessonGateBlocked, completeSection]);

  // Reset URL section processed ref when course changes
  useEffect(() => {
    urlSectionProcessedRef.current = null;
    initialSectionAutoOpenDoneRef.current = false;
  }, [course?.id]);

  // Handle URL section parameter - only once when modules are loaded
  useEffect(() => {
    // Wait for modules to be fully loaded (not loading)
    if (modules.length === 0 || !course?.id || playerLoading) return;

    // Check if section ID is in URL query params
    const sectionIdFromUrl = searchParams.get('section');
    if (!sectionIdFromUrl) {
      // No URL parameter, mark as processed only if not already set
      if (urlSectionProcessedRef.current !== course.id) {
        urlSectionProcessedRef.current = course.id;
      }
      return;
    }

    // Only process URL parameter if not already processed for this course
    // Use a more specific key to track processing: courseId-sectionId
    const processedKey = `${course.id}-${sectionIdFromUrl}`;
    if (urlSectionProcessedRef.current === processedKey) {
      // Already processed this specific URL parameter
      return;
    }

    const lessonIds = modules.flatMap((s) => (s.lessons || []).map((l) => l.id));
    const orderedLessons = modules.flatMap((s) =>
      (s.lessons || []).map((l) => ({ ...l, sectionId: s.id }))
    );

    // console.log('URL Parameter Handler:', {
    //   sectionIdFromUrl,
    //   lessonIds,
    //   found: lessonIds.includes(sectionIdFromUrl),
    //   modules: modules.map(m => ({ id: m.id, title: m.title, lessonIds: m.lessons?.map(l => l.id) }))
    // });

    if (sectionIdFromUrl === FEEDBACK_LESSON_ID) {
      setActiveLessonId(FEEDBACK_LESSON_ID);
      setExpandedSection(FEEDBACK_SECTION_ID);
      urlSectionProcessedRef.current = processedKey;
      return;
    }

    if (
      typeof sectionIdFromUrl === 'string' &&
      sectionIdFromUrl.startsWith(MODULE_PRACTICE_PREFIX)
    ) {
      const mid = sectionIdFromUrl.slice(MODULE_PRACTICE_PREFIX.length);
      if (isUuid(mid) && modules.some((m) => m.id === mid)) {
        setActiveLessonId(sectionIdFromUrl);
        setExpandedSection(mid);
        urlSectionProcessedRef.current = processedKey;
        return;
      }
    }

    if (
      typeof sectionIdFromUrl === 'string' &&
      sectionIdFromUrl.startsWith(MODULE_ASSIGNMENT_PREFIX)
    ) {
      const mid = sectionIdFromUrl.slice(MODULE_ASSIGNMENT_PREFIX.length);
      if (isUuid(mid) && modules.some((m) => m.id === mid)) {
        setActiveLessonId(sectionIdFromUrl);
        setExpandedSection(mid);
        urlSectionProcessedRef.current = processedKey;
        return;
      }
    }

    if (lessonIds.includes(sectionIdFromUrl)) {
      // Find which section (module) contains this lesson
      const sectionWithLesson = modules.find((s) =>
        (s.lessons || []).some((l) => l.id === sectionIdFromUrl)
      );
      if (sectionWithLesson) {
        // console.log('Setting active lesson:', {
        //   lessonId: sectionIdFromUrl,
        //   sectionId: sectionWithLesson.id,
        //   sectionTitle: sectionWithLesson.title
        // });
        // Set active lesson and expand section
        setActiveLessonId(sectionIdFromUrl);
        setExpandedSection(sectionWithLesson.id);
        // Mark as processed with specific key
        urlSectionProcessedRef.current = processedKey;
        // Don't clear URL parameter - keep it for bookmarking/sharing
        return;
      }
      console.warn('Section with lesson not found:', sectionIdFromUrl);
      // Mark as processed even if section not found
      urlSectionProcessedRef.current = processedKey;
      return;
    }
    console.warn('Lesson ID not found in modules:', {
      sectionIdFromUrl,
      availableLessonIds: lessonIds,
    });
    // Mark as processed even if URL parameter not found or invalid
    urlSectionProcessedRef.current = course.id;
  }, [modules, course?.id, playerLoading, searchParams, setSearchParams, activeLessonId]);

  // Handle default section/lesson selection.
  // If URL section exists, respect it. Otherwise auto-open first available lesson.
  useEffect(() => {
    if (modules.length === 0) return;
    if (activeLessonId === FEEDBACK_LESSON_ID) return;
    // Don't override when user has opened the Feedback accordion
    if (expandedSection === FEEDBACK_SECTION_ID) return;

    const sectionIdFromUrl = searchParams.get('section');
    if (!sectionIdFromUrl) {
      const lessonExistsInCurrentModules = activeLessonId
        ? modules.some((s) => (s.lessons || []).some((l) => l.id === activeLessonId)) ||
          Boolean(getModuleIdFromPseudoLessonId(activeLessonId))
        : false;
      if (initialSectionAutoOpenDoneRef.current && lessonExistsInCurrentModules) return;
      const firstModuleWithLesson = modules.find((s) => (s.lessons || []).length > 0);
      const firstLesson = firstModuleWithLesson?.lessons?.[0];
      if (firstModuleWithLesson && firstLesson) {
        setActiveLessonId(firstLesson.id);
        setExpandedSection(firstModuleWithLesson.id);
        initialSectionAutoOpenDoneRef.current = true;
      }
      return;
    }

    // URL has section — only auto-open once on initial load.
    // After that, keep accordion fully user-controlled.
    if (initialSectionAutoOpenDoneRef.current) return;
    if (expandedSection) {
      initialSectionAutoOpenDoneRef.current = true;
      return;
    }
    const sectionWithActiveLesson = modules.find(
      (s) =>
        (s.lessons || []).some((l) => l.id === activeLessonId) ||
        activeLessonId === `${MODULE_PRACTICE_PREFIX}${s.id}` ||
        activeLessonId === `${MODULE_ASSIGNMENT_PREFIX}${s.id}`
    );
    if (sectionWithActiveLesson) {
      setExpandedSection(sectionWithActiveLesson.id);
      initialSectionAutoOpenDoneRef.current = true;
    }
  }, [modules, expandedSection, activeLessonId, searchParams]);

  const activeLesson = useMemo(() => {
    if (activeLessonId === FEEDBACK_LESSON_ID) return null;
    if (!activeLessonId) return null; // No section selected — show course image
    const found = modules.flatMap((sec) => sec.lessons || []).find((l) => l.id === activeLessonId);
    return found || null;
  }, [modules, activeLessonId]);

  // Derived once from activeLesson so useEffects can use them (must be before YouTube useEffect)
  const sectionVideoUrlForEmbed = activeLesson?.videoUrl?.trim() || null;
  const embedVideoId = sectionVideoUrlForEmbed ? getYouTubeVideoId(sectionVideoUrlForEmbed) : null;
  const spotlightrMeta = useMemo(
    () =>
      sectionVideoUrlForEmbed && !embedVideoId
        ? parseSpotlightrUrl(sectionVideoUrlForEmbed)
        : null,
    [sectionVideoUrlForEmbed, embedVideoId]
  );
  const watchtimeSeconds = activeLesson ? parseWatchtimeToSeconds(activeLesson.watchtime) : null;

  useEffect(() => {
    if (!activeLessonId) return;
    const lessonDone =
      sectionProgressData?.isCompleted === true || sectionProgressData?.isWatched === true;
    const resumeSeconds = lessonDone
      ? 0
      : sectionProgressData
        ? Number(sectionProgressData.lastPositionSeconds || 0)
        : 0;
    const prev = resumeSeekAppliedRef.current;
    if (prev.sectionId !== activeLessonId) {
      resumeSeekAppliedRef.current = {
        sectionId: activeLessonId,
        seconds: resumeSeconds > 2 ? resumeSeconds : 0,
        applied: false,
      };
      return;
    }
    if (!lessonDone && resumeSeconds > prev.seconds) {
      resumeSeekAppliedRef.current.seconds = resumeSeconds;
    }
  }, [sectionProgressData, activeLessonId]);

  // If section progress arrives after player mounted, seek immediately.
  useEffect(() => {
    if (!sectionProgressData || !activeLessonId) return;
    if (sectionProgressData.isCompleted === true || sectionProgressData.isWatched === true) return;
    const resumeSeconds = Number(sectionProgressData.lastPositionSeconds || 0);
    if (!(resumeSeconds > 2)) return;

    const resumeMeta = resumeSeekAppliedRef.current;
    if (resumeMeta.sectionId !== activeLessonId || resumeMeta.applied) return;

    const nativeVideo = videoRef.current;
    if (nativeVideo && Number.isFinite(nativeVideo.duration) && nativeVideo.duration > 0) {
      try {
        markVideoSeekClampGrace();
        nativeVideo.currentTime = Math.min(resumeSeconds, nativeVideo.duration);
        nativeVideoProgressRef.current.lastTime = Math.min(resumeSeconds, nativeVideo.duration);
        resumeMeta.applied = true;
        return;
      } catch {
        // ignore seek errors
      }
    }

    const ytPlayer = youtubePlayerRef.current;
    if (ytPlayer && typeof ytPlayer.seekTo === 'function') {
      try {
        markVideoSeekClampGrace();
        ytPlayer.seekTo(resumeSeconds, true);
        youtubeProgressRef.current.lastTime = resumeSeconds;
        resumeMeta.applied = true;
        return;
      } catch {
        // ignore seek errors
      }
    }

    // Spotlightr resume is applied in useSpotlightrLessonPlayer (incomplete lessons only).
  }, [sectionProgressData, activeLessonId, markVideoSeekClampGrace, spotlightrMeta]);

  /** Roll back native video to the furthest watched point (iOS-safe, debounced). */
  const clampNativeVideoSeek = useCallback(
    (video) => {
      if (!video || embedVideoId || spotlightrMeta) return false;
      const prog = nativeVideoProgressRef.current;
      if (sectionProgressData?.isCompleted || prog.markedComplete) return false;
      if (isVideoSeekClampGraceActive()) return false;

      const current = Math.max(0, Number(video.currentTime || 0));
      const durRounded = Math.round(Number(video.duration) || 0);
      const maxAllowed = computeMaxAllowedTimeline(
        videoCoverageRangesRef,
        prog,
        sectionProgressData,
        durRounded
      );
      const drift = isAppleMobileDevice() ? 0.25 : 0.35;
      if (current <= maxAllowed + drift) return false;

      const clampState = nativeVideoSeekClampRef.current;
      if (clampState.inFlight) return false;
      const target = Math.max(0, maxAllowed);

      const applyClamp = () => {
        try {
          if (Math.abs(Number(video.currentTime || 0) - target) > 0.1) {
            video.currentTime = target;
          }
        } catch {
          // ignore seek reset errors
        }
        prog.lastTime = target;
        clampState.inFlight = false;
      };

      clampState.inFlight = true;
      if (clampState.clearTimer) clearTimeout(clampState.clearTimer);
      clampState.clearTimer = setTimeout(() => {
        clampState.inFlight = false;
      }, 250);

      if (isAppleMobileDevice()) {
        requestAnimationFrame(applyClamp);
      } else {
        applyClamp();
      }
      return true;
    },
    [embedVideoId, spotlightrMeta, sectionProgressData, isVideoSeekClampGraceActive]
  );

  // Images section: set progress only when user has viewed all images (reached last image and stayed briefly)
  const activeLessonHasImages =
    Array.isArray(activeLesson?.images) && activeLesson.images.length > 0;
  const isOnLastImage =
    activeLessonHasImages && sectionImageIndex >= activeLesson.images.length - 1;
  useEffect(() => {
    if (activeLessonGateBlocked) return undefined;
    if (!activeLessonHasImages || !isOnLastImage || !course?.id || !activeLessonId)
      return undefined;
    if (viewedSectionIdsRef.current.includes(activeLessonId)) return undefined;
    if (imageSectionMarkedRef.current) return undefined;
    const delayMs = IMAGE_VIEW_COMPLETE_DELAY_MS;
    const timer = setTimeout(() => {
      if (imageSectionMarkedRef.current) return;
      imageSectionMarkedRef.current = true;
      completeSection(activeLessonId);
    }, delayMs);
    return () => clearTimeout(timer);
  }, [
    activeLessonHasImages,
    isOnLastImage,
    course?.id,
    activeLessonId,
    activeLesson?.images?.length,
    modules,
    setSearchParams,
    activeLessonGateBlocked,
    completeSection,
  ]);

  // When unique timeline coverage reaches required duration, persist and mark complete from server response.
  useEffect(() => {
    if (!course?.id || !activeLessonId) {
      videoWatchedEnoughRef.current = null;
      return undefined;
    }
    const sectionId = activeLessonId;
    videoWatchedEnoughRef.current = () => {
      const courseId = courseIdRef.current;
      if (!courseId || viewedSectionIdsRef.current.includes(sectionId)) return;
      let last = 0;
      let dur = 0;
      const native = videoRef.current;
      if (native) {
        last = Math.max(last, Number(native.currentTime || 0));
        if (Number.isFinite(native.duration) && native.duration > 0) dur = Math.max(dur, native.duration);
      }
      const yt = youtubePlayerRef.current;
      if (yt && typeof yt.getCurrentTime === 'function') {
        try {
          last = Math.max(last, Number(yt.getCurrentTime() || 0));
          const d = typeof yt.getDuration === 'function' ? yt.getDuration() : 0;
          if (d > 0) dur = Math.max(dur, d);
        } catch {
          // ignore
        }
      }
      const spotlightr = spotlightrPlayerRef.current;
      if (spotlightr && typeof spotlightr.getCurrentTime === 'function') {
        try {
          last = Math.max(last, Number(spotlightr.getCurrentTime() || 0));
          const d = typeof spotlightr.getDuration === 'function' ? spotlightr.getDuration() : 0;
          if (d > 0) dur = Math.max(dur, d);
        } catch {
          // ignore
        }
      }
      const payload = buildVideoCoveragePayloadFromRef(videoCoverageRangesRef, last, dur);
      sendProgressUpdate(courseId, sectionId, { ...payload, markCompleted: true }).then((data) => {
        if (data?.isCompleted || data?.isWatched) {
          nativeVideoProgressRef.current.markedComplete = true;
          youtubeProgressRef.current.markedComplete = true;
          spotlightrProgressRef.current.markedComplete = true;
        }
        // Client already met watch rules; unlock next lesson even if the API body omits isWatched/isCompleted.
        if (data && typeof data === 'object') {
          appendViewedSectionId(sectionId);
        }
      });
    };
    return () => {
      videoWatchedEnoughRef.current = null;
    };
  }, [course?.id, activeLessonId, sendProgressUpdate, appendViewedSectionId]);

  // YouTube: load IFrame API; track progress when watchtime set, or mark complete when video ends (all sections)
  useEffect(() => {
    if (activeLessonGateBlocked) {
      const wrapper = youtubeContainerRef.current;
      if (wrapper) {
        const p = youtubePlayerRef.current;
        if (p && typeof p.destroy === 'function') p.destroy();
        youtubePlayerRef.current = null;
        while (wrapper.firstChild) wrapper.removeChild(wrapper.firstChild);
      }
      return undefined;
    }
    if (!embedVideoId) {
      // Switched to non-YouTube (e.g. images/text): clean up so no youtube-player-learn stays in DOM
      const wrapper = youtubeContainerRef.current;
      if (wrapper) {
        const p = youtubePlayerRef.current;
        if (p && typeof p.destroy === 'function') p.destroy();
        youtubePlayerRef.current = null;
        while (wrapper.firstChild) wrapper.removeChild(wrapper.firstChild);
      }
      return undefined;
    }
    youtubeProgressRef.current = {
      watchedSeconds: 0,
      pendingDeltaSeconds: 0,
      lastTime: 0,
      maxWatchedTimeline: nativeVideoProgressRef.current.maxWatchedTimeline || 0,
      isPlaying: false,
      markedComplete: nativeVideoProgressRef.current.markedComplete || false,
    };
    let player = null;
    let intervalId = null;

    const createPlayer = () => {
      const wrapper = youtubeContainerRef.current;
      if (!wrapper) return;
      // Clear any existing player container so we never have duplicate youtube-player-learn nodes
      while (wrapper.firstChild) wrapper.removeChild(wrapper.firstChild);
      // Use a div we create ourselves so YouTube can replace it with an iframe without breaking React's DOM tree
      const container = document.createElement('div');
      container.setAttribute('id', 'youtube-player-learn');
      container.style.cssText =
        'position:absolute;inset:0;width:100%;height:100%;max-width:100%;overflow:hidden';
      wrapper.appendChild(container);

      const isCoarsePointer =
        typeof window !== 'undefined' &&
        window.matchMedia('(hover: none) and (pointer: coarse)').matches;
      const youtubePollMs = isCoarsePointer ? 100 : 300;

      const rollbackYoutubeIfSeekPastAllowed = () => {
        if (!player || !player.getCurrentTime) return false;
        const t = player.getCurrentTime();
        const d = typeof player.getDuration === 'function' ? player.getDuration() : 0;
        const prog = youtubeProgressRef.current;
        if (prog.markedComplete || sectionProgressData?.isCompleted) return false;
        const previousTime = Math.max(0, Number(prog.lastTime || 0));
        const durRounded = Math.round(Number(d) || 0);
        const maxAllowed = computeMaxAllowedTimeline(
          videoCoverageRangesRef,
          prog,
          sectionProgressData,
          durRounded
        );
        const jumpDelta = Math.abs(Number(t || 0) - previousTime);
        const isLikelySeekJump = jumpDelta > 2.5;
        if (isVideoSeekClampGraceActive()) return false;
        const pastAllowed = Number(t || 0) > maxAllowed + 0.35;
        if (!pastAllowed) return false;
        const isApple = isAppleMobileDevice();
        const forwardPastMax =
          isApple && Number(t || 0) > previousTime + 0.25 && Number(t || 0) > maxAllowed + 0.35;
        if (!isLikelySeekJump && !forwardPastMax) return false;
        if (typeof player.seekTo === 'function') {
          try {
            player.seekTo(Math.max(0, maxAllowed), true);
          } catch {
            // ignore seek rollback errors
          }
        }
        prog.lastTime = Math.max(0, maxAllowed);
        return true;
      };

      if (window.YT && window.YT.Player) {
        player = new window.YT.Player(container, {
          videoId: embedVideoId,
          playerVars: {
            controls: 1,
            fs: 1,
            rel: 0,
            playsinline: 1,
            disablekb: 1,
          },
          events: {
            onReady: () => {
              fitYoutubeToFrame();
              const resumeMeta = resumeSeekAppliedRef.current;
              if (
                resumeMeta.sectionId === activeLessonId &&
                !resumeMeta.applied &&
                resumeMeta.seconds > 2 &&
                player &&
                typeof player.seekTo === 'function'
              ) {
                try {
                  markVideoSeekClampGrace();
                  player.seekTo(resumeMeta.seconds, true);
                  youtubeProgressRef.current.lastTime = resumeMeta.seconds;
                  resumeMeta.applied = true;
                } catch {
                  // ignore seek errors
                }
              }
              if (autoPlayNextRef.current && player && typeof player.playVideo === 'function') {
                try {
                  if (typeof player.mute === 'function') player.mute();
                  player.playVideo();
                } catch {
                  // ignore autoplay rejection
                } finally {
                  autoPlayNextRef.current = false;
                }
              }
              // Track progress: when no watchtime use video length; when watchtime set use min(watchtime, video length)
              intervalId = setInterval(() => {
                try {
                  if (!player || !player.getCurrentTime) return;
                  const t = player.getCurrentTime();
                  const d = typeof player.getDuration === 'function' ? player.getDuration() : 0;
                  const requiredSec = effectiveRequiredSeconds(watchtimeSeconds, d);
                  const prog = youtubeProgressRef.current;
                  if (prog.markedComplete) return;
                  if (rollbackYoutubeIfSeekPastAllowed()) return;
                  const durRounded = Math.round(Number(d) || 0);
                  if (prog.isPlaying) {
                    const previousTime = Math.max(0, Number(prog.lastTime || 0));
                    if (Math.abs(t - previousTime) <= 2.5) {
                      prog.maxWatchedTimeline = Math.max(prog.maxWatchedTimeline ?? 0, t);
                    }
                    appendCoverageSlicePlayer(videoCoverageRangesRef, prog.lastTime, t, durRounded);
                    const cov =
                      durRounded > 0
                        ? coverageMeasurePlayer(videoCoverageRangesRef.current, durRounded)
                        : 0;
                    if (durRounded > 0 && (cov >= durRounded - 1 || t >= durRounded - 0.5)) {
                      syncProgressOnFullDuration(activeLessonIdRef.current, t, d);
                    }
                    prog.watchedSeconds = cov;
                    prog.pendingDeltaSeconds = 0;
                    if (requiredSec > 0 && cov >= requiredSec) {
                      prog.markedComplete = true;
                      if (intervalId) clearInterval(intervalId);
                      intervalId = null;
                      console.log(
                        '[Video progress] Section marked complete (coverage',
                        cov,
                        's / required',
                        requiredSec,
                        's)'
                      );
                      videoWatchedEnoughRef.current?.();
                    }
                  }
                  prog.lastTime = t;
                } catch (e) {
                  // ignore
                }
              }, youtubePollMs);
            },
            onStateChange: (e) => {
              const prog = youtubeProgressRef.current;
              if (e.data === 3) {
                rollbackYoutubeIfSeekPastAllowed();
              } else if (e.data === 1) {
                prog.isPlaying = true;
                try {
                  const current = player ? player.getCurrentTime() : 0;
                  prog.lastTime = Math.max(0, Number(current || 0));
                } catch {
                  // ignore player not ready
                }
                console.log('[Video] Play');
              } else if (e.data === 2) {
                prog.isPlaying = false;
                const pauseLessonId = activeLessonIdRef.current;
                if (
                  prog.markedComplete ||
                  isSectionLessonComplete(
                    pauseLessonId,
                    flatLessonsRef.current,
                    liveSectionProgressMapRef.current,
                    viewedSectionIdsRef.current
                  )
                ) {
                  console.log('[Video] Pause');
                  return;
                }
                if (course?.id && activeLessonId && player && typeof player.getCurrentTime === 'function') {
                  try {
                    const current = player.getCurrentTime();
                    const d = typeof player.getDuration === 'function' ? player.getDuration() : 0;
                    appendCoverageSlicePlayer(
                      videoCoverageRangesRef,
                      prog.lastTime,
                      current,
                      Math.round(d || 0)
                    );
                    const durRounded = Math.round(Number(d) || 0);
                    const cov =
                      durRounded > 0
                        ? coverageMeasurePlayer(videoCoverageRangesRef.current, durRounded)
                        : 0;
                    if (durRounded > 0 && (cov >= durRounded - 1 || current >= durRounded - 0.5)) {
                      syncProgressOnFullDuration(activeLessonIdRef.current, current, d);
                    }
                    const payload = buildVideoCoveragePayloadFromRef(
                      videoCoverageRangesRef,
                      current,
                      d
                    );
                    sendProgressUpdate(course.id, activeLessonId, payload);
                    prog.pendingDeltaSeconds = 0;
                  } catch {
                    // ignore
                  }
                }
                console.log('[Video] Pause');
              } else if (e.data === 0) {
                prog.isPlaying = false;
                console.log('[Video] Ended');
                if (player && player.getCurrentTime) {
                  try {
                    const t = player.getCurrentTime();
                    const d = typeof player.getDuration === 'function' ? player.getDuration() : 0;
                    const currentId = activeLessonIdRef.current;
                    const currentLesson = flatLessons.find((l) => l.id === currentId);
                    const fallbackDur = currentLesson
                      ? lessonFallbackDurationSeconds(currentLesson, liveSectionProgressMap)
                      : 0;
                    const durationForSync = Math.max(Number(d) || 0, Number(fallbackDur) || 0);
                    if (course?.id && activeLessonId) {
                      appendCoverageSlicePlayer(
                        videoCoverageRangesRef,
                        prog.lastTime,
                        t,
                        Math.round(d || 0)
                      );
                    }
                    const requiredSec = effectiveRequiredSeconds(watchtimeSeconds, d);
                    const durRounded = Math.round(Number(d) || 0);
                    const cov =
                      durRounded > 0
                        ? coverageMeasurePlayer(videoCoverageRangesRef.current, durRounded)
                        : 0;
                    // Always sync once on YT ended so backend gets final state even if coverage math lags.
                    syncProgressOnFullDuration(activeLessonIdRef.current, t, durationForSync);
                    // If already marked complete mid-playback, we still must record the lesson locally so the next row unlocks.
                    if (prog.markedComplete) {
                      appendViewedSectionId(activeLessonIdRef.current);
                      return;
                    }
                    const shouldComplete = requiredSec > 0 ? cov >= requiredSec - 1 : true;
                    if (shouldComplete) {
                      prog.markedComplete = true;
                      if (intervalId) clearInterval(intervalId);
                      intervalId = null;
                      if (activeLessonId) {
                        completeSection(activeLessonId);
                      }
                      console.log('[Video progress] Section marked complete (video ended)', {
                        currentTime: Math.round(t),
                        required: requiredSec,
                        duration: d ? Math.round(d) : null,
                      });
                      if (currentId && currentId !== FEEDBACK_LESSON_ID) {
                        const next = getNextLessonFromModules(modules, currentId);
                        if (next?.id) startAutoNextCountdown(next);
                      }
                    } else if (course?.id && activeLessonId) {
                      const payload = buildVideoCoveragePayloadFromRef(videoCoverageRangesRef, t, d);
                      sendProgressUpdate(course.id, activeLessonId, payload);
                      prog.pendingDeltaSeconds = 0;
                    }
                  } catch {
                    // ignore
                  }
                }
              }
            },
          },
        });
        youtubePlayerRef.current = player;
      }
    };

    const fitYoutubeToFrame = () => {
      const wrapper = youtubeContainerRef.current;
      if (!wrapper) return;
      const w = Math.max(1, Math.round(wrapper.clientWidth));
      const h = Math.max(1, Math.round(wrapper.clientHeight));
      if (player && typeof player.setSize === 'function') {
        try {
          player.setSize(w, h);
        } catch {
          // ignore resize errors
        }
      }
      const iframe = wrapper.querySelector('iframe');
      if (iframe) {
        iframe.style.width = '100%';
        iframe.style.height = '100%';
      }
    };

    if (window.YT && window.YT.Player) {
      createPlayer();
    } else {
      window.onYouTubeIframeAPIReady = createPlayer;
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const first = document.getElementsByTagName('script')[0];
      if (first?.parentNode && !document.getElementById('youtube-iframe-api')) {
        tag.id = 'youtube-iframe-api';
        first.parentNode.insertBefore(tag, first);
      }
    }

    window.addEventListener('resize', fitYoutubeToFrame);
    window.addEventListener('orientationchange', fitYoutubeToFrame);

    return () => {
      window.removeEventListener('resize', fitYoutubeToFrame);
      window.removeEventListener('orientationchange', fitYoutubeToFrame);
      if (intervalId) clearInterval(intervalId);
      if (player && typeof player.destroy === 'function') player.destroy();
      youtubePlayerRef.current = null;
      const wrapper = youtubeContainerRef.current;
      if (wrapper) while (wrapper.firstChild) wrapper.removeChild(wrapper.firstChild);
    };
  }, [
    embedVideoId,
    watchtimeSeconds,
    course?.id,
    activeLessonId,
    activeLessonGateBlocked,
    modules,
    sendProgressUpdate,
    setSearchParams,
    startAutoNextCountdown,
    appendViewedSectionId,
    markVideoSeekClampGrace,
    isVideoSeekClampGraceActive,
  ]);

  useSpotlightrLessonPlayer({
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
    videoWatchedEnoughRef,
    feedbackLessonId: FEEDBACK_LESSON_ID,
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
  });

  const navigationSteps = useMemo(() => {
    const steps = [];
    (modules || []).forEach((module) => {
      (module.lessons || []).forEach((lesson) => {
        steps.push({
          id: lesson.id,
          sectionId: module.id,
          videoUrl: lesson.videoUrl || null,
          kind: 'lesson',
        });
      });
      if ((quizCountByModuleId[module.id] || 0) > 0) {
        steps.push({
          id: `${MODULE_PRACTICE_PREFIX}${module.id}`,
          sectionId: module.id,
          videoUrl: null,
          kind: 'practice',
        });
      }
      if ((assignmentCountByModuleId[module.id] || 0) > 0) {
        steps.push({
          id: `${MODULE_ASSIGNMENT_PREFIX}${module.id}`,
          sectionId: module.id,
          videoUrl: null,
          kind: 'assignment',
        });
      }
    });
    return steps;
  }, [modules, quizCountByModuleId, assignmentCountByModuleId]);

  const currentIndex = activeLessonIndex;
  const currentStepIndex = useMemo(
    () => navigationSteps.findIndex((s) => s.id === activeLessonId),
    [navigationSteps, activeLessonId]
  );
  const prevLesson = currentStepIndex > 0 ? navigationSteps[currentStepIndex - 1] : null;
  const nextLesson =
    currentStepIndex >= 0 && currentStepIndex < navigationSteps.length - 1
      ? navigationSteps[currentStepIndex + 1]
      : null;

  // Lock state is driven only by backend `sectionProgressData.isLocked`.
  activeLessonProgressPending = false;
  activeLessonGateBlocked = activeLessonContentLocked;

  const goToPrevLesson = () => {
    if (prevLesson) {
      captureActiveLessonProgressRef.current?.();
      const prevIsPractice = Boolean(getModuleIdFromPracticeLessonId(prevLesson.id));
      setActiveLessonId(prevLesson.id);
      setExpandedSection(prevLesson.sectionId);
      if (prevIsPractice) {
        setSearchParams({ section: prevLesson.id, practiceQuiz: '1' }, { replace: true });
      } else {
        setSearchParams({ section: prevLesson.id }, { replace: true });
      }
    }
  };
  const goToNextLesson = async () => {
    if (!nextLesson || !canGoNextLesson) return;
    // Next lesson button should respect locking: only navigate when next is unlocked.
    const idx = flatLessons.findIndex((l) => l.id === nextLesson.id);
    if (idx > 0) {
      const prevRow = flatLessons[idx - 1];
      if (!prevRow || !isLessonDoneForUi(prevRow, liveSectionProgressMap, viewedSectionIds)) return;
    }
    try {
      setNextLoading(true);
      // Ensure current lesson progress is synced before moving on (do not force-complete).
      const currentId = activeLessonIdRef.current;
      const courseId = courseIdRef.current;
      const currentFlatLesson = flatLessons.find((l) => l.id === currentId);
      const currentLive = currentId ? liveSectionProgressMap[currentId] : null;
      if (authenticated && courseId && isUuid(currentId)) {
        const currentPercent = Number(
          currentLive?.completionPercent ??
            currentFlatLesson?.sectionProgress?.completionPercent ??
            0
        );
        if (!Number.isFinite(currentPercent) || currentPercent < 100) {
          if (!currentFlatLesson?.videoUrl) {
            // Text/images/files lesson: send a normal progress heartbeat on Next click.
            const lastPos = Math.max(
              0,
              Number(currentLive?.lastPositionSeconds ?? currentFlatLesson?.sectionProgress?.lastPositionSeconds ?? 0)
            );
            const watched = Math.max(
              0,
              Number(currentLive?.watchedSeconds ?? currentFlatLesson?.sectionProgress?.watchedSeconds ?? 0)
            );
            const durFromProgress = Math.max(
              0,
              Number(currentLive?.durationSeconds ?? currentFlatLesson?.sectionProgress?.durationSeconds ?? 0)
            );
            const durFromLesson =
              parseWatchtimeToSeconds(String(currentFlatLesson?.durationTime || '').trim()) ??
              parseWatchtimeToSeconds(String(currentFlatLesson?.duration || '').trim()) ??
              0;
            const duration = Math.max(durFromProgress, durFromLesson, lastPos, watched);
            await sendProgressUpdate(
              courseId,
              currentId,
              {
                lastPositionSeconds: lastPos,
                watchedSeconds: watched,
                durationSeconds: duration,
              },
              false
            );
          }
        }
      }

      captureActiveLessonProgressRef.current?.();
      const nextIsPractice = Boolean(getModuleIdFromPracticeLessonId(nextLesson.id));
      autoPlayNextRef.current = !nextIsPractice && Boolean(nextLesson.videoUrl);
      setActiveLessonId(nextLesson.id);
      setExpandedSection(nextLesson.sectionId);
      if (nextIsPractice) {
        setSearchParams({ section: nextLesson.id, practiceQuiz: '1' }, { replace: true });
      } else {
        setSearchParams({ section: nextLesson.id }, { replace: true });
      }
    } finally {
      setNextLoading(false);
    }
  };
  // Whether "Next" button should be enabled (respects locking/completion)
  let canGoNextLesson = Boolean(nextLesson);
  const activeModuleForNav = modules.find((m) => (m.lessons || []).some((l) => l.id === activeLessonId));
  const activeModuleLessons = activeModuleForNav?.lessons || [];
  const isOnLastLessonOfActiveModule =
    Boolean(activeLesson) &&
    !getModuleIdFromPseudoLessonId(activeLessonId) &&
    activeModuleLessons.length > 0 &&
    activeModuleLessons[activeModuleLessons.length - 1]?.id === activeLessonId;
  if (isOnLastLessonOfActiveModule) {
    // Keep bottom Next disabled at module boundary; user should use "Next Module" CTA.
    canGoNextLesson = false;
  }
  if (nextLesson && flatLessons.length > 0) {
    const nextPseudoModuleId = getModuleIdFromPseudoLessonId(nextLesson.id);
    if (nextPseudoModuleId) {
      const targetModule = modules.find((m) => m.id === nextPseudoModuleId);
      const targetLessons = targetModule?.lessons || [];
      const allDone =
        targetLessons.length > 0 &&
        targetLessons.every((l) => isLessonDoneForUi(l, liveSectionProgressMap, viewedSectionIds));
      if (!allDone) {
        canGoNextLesson = false;
      }
    }
    const idx = flatLessons.findIndex((l) => l.id === nextLesson.id);
    if (idx > 0) {
      const prevRow = flatLessons[idx - 1];
      if (!prevRow || !isLessonDoneForUi(prevRow, liveSectionProgressMap, viewedSectionIds)) {
        canGoNextLesson = false;
      }
    }
  }
  const goToNextModuleStart = () => {
    const activeModuleIndex = modules.findIndex((m) => (m.lessons || []).some((l) => l.id === activeLessonId));
    if (activeModuleIndex < 0 || activeModuleIndex >= modules.length - 1) return;
    const nextModule = modules[activeModuleIndex + 1];
    const firstLesson = nextModule?.lessons?.[0];
    if (!firstLesson) return;
    autoPlayNextRef.current = Boolean(firstLesson.videoUrl);
    setActiveLessonId(firstLesson.id);
    setExpandedSection(nextModule.id);
    setSearchParams({ section: firstLesson.id }, { replace: true });
  };

  const totalLessons = useMemo(
    () => modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0),
    [modules]
  );
  const completedCount = useMemo(() => {
    if (totalLessons === 0) return 0;
    const completed = flatLessons.filter((lesson) =>
      isLessonDoneForUi(lesson, liveSectionProgressMap, viewedSectionIds)
    );
    return Math.min(completed.length, totalLessons);
  }, [flatLessons, totalLessons, viewedSectionIds, liveSectionProgressMap]);
  const progressPercent = totalLessons
    ? Math.min(100, Math.round((completedCount / totalLessons) * 100))
    : 0;
  const currentLessonNumber =
    currentIndex >= 0 && totalLessons > 0 ? Math.min(totalLessons, currentIndex + 1) : 0;
  const moduleProgressById = useMemo(() => {
    const result = {};
    modules.forEach((module) => {
      const lessons = module.lessons || [];
      const total = lessons.length;
      const completed = lessons.filter((lesson) =>
        isLessonDoneForUi(lesson, liveSectionProgressMap, viewedSectionIds)
      ).length;
      const percent = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
      result[module.id] = { total, completed, percent };
    });
    return result;
  }, [modules, viewedSectionIds, liveSectionProgressMap]);

  const activeModuleIndex = useMemo(
    () => modules.findIndex((m) => (m.lessons || []).some((l) => l.id === activeLessonId)),
    [modules, activeLessonId]
  );
  const activeModule = activeModuleIndex >= 0 ? modules[activeModuleIndex] : null;
  const activeModuleStats = activeModule ? moduleProgressById[activeModule.id] : null;
  const isActiveModuleCompleted = Boolean(
    activeModuleStats &&
      activeModuleStats.total > 0 &&
      activeModuleStats.completed >= activeModuleStats.total
  );
  const hasNextModule = activeModuleIndex >= 0 && activeModuleIndex < modules.length - 1;

  if (loading || playerLoading) return <LoadingScreen />;

  const paidCourse = isPaidCourse(course?.freeOrPaid);

  // Unauthenticated users are blocked only for paid courses.
  if (course?.id && paidCourse && !authenticated) return <LoadingScreen />;

  // While checking enrollment for paid courses (or redirect in progress), show loading
  if (course?.id && paidCourse && authenticated && (!enrollmentChecked || !enrolled))
    return <LoadingScreen />;

  if (error || !course) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 3,
        }}
      >
        <EmptyContent
          filled
          title="Course not found"
          action={
            <Button
              component={RouterLink}
              to={paths.learning}
              startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
            >
              Back to Courses
            </Button>
          }
        />
      </Box>
    );
  }

  // No modules added in this course — show empty state with full page layout
  if (apiModules.length === 0) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
       

        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 'calc(100vh - 64px)',
            p: 3,
          }}
        >
          <Box sx={{ maxWidth: 420, width: 1 }}>
            <EmptyContent
              filled
              title="No modules added in this course"
              description="This course has no modules or lessons yet. Content will appear here once modules are added."
              action={
                <Button
                  component={RouterLink}
                  to={paths.learning}
                  variant="contained"
                  size="large"
                  startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
                  sx={{ mt: 2 }}
                >
                  Back to Courses
                </Button>
              }
            />
          </Box>
        </Box>
      </Box>
    );
  }

  const videoPoster = course.image;
  // Only show video when this section has a video URL — do not use course.video/course.image for sections without video
  const sectionVideoUrl = activeLesson?.videoUrl?.trim() || null;
  const videoSrc = sectionVideoUrl || null;
  const embedUrl = videoSrc ? getYouTubeEmbedUrl(videoSrc) : null;
  const isSpotlightr = Boolean(spotlightrMeta);
  const hasVideo = !!(embedUrl || isSpotlightr || (videoSrc && !embedUrl && !isSpotlightr));
  const hasTextContent = !!(
    activeLesson?.content &&
    activeLesson.content.trim() &&
    activeLesson.content !== '<p></p>'
  );
  const hasImages = Array.isArray(activeLesson?.images) && activeLesson.images.length > 0;
  const currentImageIndex = hasImages
    ? Math.min(sectionImageIndex, activeLesson.images.length - 1)
    : 0;
  const hasAttachments =
    Array.isArray(activeLesson?.attachments) && activeLesson.attachments.length > 0;
  const hasLearningMaterials =
    Array.isArray(activeLesson?.learningMaterials) && activeLesson.learningMaterials.length > 0;
  const activeLessonSubtitle = String(activeLesson?.subtitle || '').trim();

  const lessonLockOverlay =
    activeLesson && activeLessonGateBlocked ? (
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1.5,
          px: 2,
          bgcolor: alpha(theme.palette.common.black, 0.72),
        }}
      >
        {activeLessonProgressPending ? (
          <CircularProgress sx={{ color: 'common.white' }} />
        ) : (
          <>
            <Iconify icon="solar:lock-keyhole-bold" width={40} sx={{ color: 'common.white' }} />
            <Typography
              variant="subtitle1"
              sx={{ color: 'common.white', fontWeight: 600, textAlign: 'center' }}
            >
              Complete the previous lesson to unlock this content
            </Typography>
          </>
        )}
      </Box>
    ) : null;

  const activeVideoLessonForSidebar =
    activeLessonId &&
    activeLessonId !== FEEDBACK_LESSON_ID &&
    !getModuleIdFromPseudoLessonId(activeLessonId)
      ? flatLessons.find((l) => l.id === activeLessonId && l.videoUrl)
      : null;
  void sidebarPlaybackTick;
  const activeLessonSidebarPlayback = activeVideoLessonForSidebar
    ? computeSidebarPlaybackSnapshot(
        videoRef,
        youtubePlayerRef,
        spotlightrPlayerRef,
        videoCoverageRangesRef,
        lessonFallbackDurationSeconds(activeVideoLessonForSidebar, liveSectionProgressMap),
        spotlightrProgressRef,
        activeVideoLessonForSidebar.id,
        videoCoverageLessonIdRef
      )
    : null;

  const sidebarAccent = theme.palette.primary.main;
  const sidebarMutedBorder = alpha(theme.palette.grey[500], 0.16);
  const playerElevatedShadow = `0 8px 32px ${alpha(theme.palette.common.black, 0.07)}`;
  const playerCardBorder = `1px solid ${alpha(theme.palette.grey[500], 0.14)}`;
  const playerCardSx = {
    bgcolor: 'background.paper',
    border: playerCardBorder,
    borderRadius: 2.5,
    boxShadow: playerElevatedShadow,
    overflow: 'hidden',
  };

  const playerLeftScrollPanelSx = playerScrollPanelSx;

  /** Right column — one scroll for video + notes + materials together. */
  const playerRightScrollPanelSx = playerScrollPanelSx;

  const playerPracticeFillSx = {
    flex: '1 1 0%',
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
  };

  const courseSidebar = (
    <Box
      sx={{
        width: 1,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          width: 1,
        }}
      >
        {/* Progress — structured summary panel */}
        {totalLessons > 0 && (
          <Box sx={{ px: 2.5, pt: 2, pb: 1.5 }}>
            <Box
              sx={{
                p: 2.25,
                borderRadius: 2.5,
                bgcolor: 'background.paper',
                border: playerCardBorder,
                boxShadow: playerElevatedShadow,
              }}
            >
              <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1.5} sx={{ mb: 1.5 }}>
                <Box>
                  <Typography
                    variant="overline"
                    sx={{
                      color: 'text.secondary',
                      fontWeight: 700,
                      letterSpacing: 0.08,
                      fontSize: theme.typography.pxToRem(10),
                      lineHeight: 1.4,
                    }}
                  >
                    Course progress
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.2, mt: 0.25 }}>
                    {Math.min(100, Math.round(progressPercent))}%
                  </Typography>
                </Box>
                <Box
                  sx={{
                    px: 1.25,
                    py: 0.5,
                    borderRadius: 1,
                    bgcolor: alpha(sidebarAccent, 0.08),
                    border: `1px solid ${alpha(sidebarAccent, 0.2)}`,
                  }}
                >
                  <Typography variant="caption" sx={{ color: 'primary.dark', fontWeight: 700, display: 'block' }}>
                    {completedCount}/{totalLessons}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: theme.typography.pxToRem(10) }}>
                    lessons done
                  </Typography>
                </Box>
              </Stack>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.25, fontWeight: 500 }}>
                {currentLessonNumber > 0
                  ? `Current: lesson ${currentLessonNumber} of ${totalLessons}`
                  : `Select a lesson to begin (${totalLessons} total)`}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, progressPercent)}
                sx={{
                  height: 8,
                  borderRadius: 10,
                  bgcolor: alpha(theme.palette.grey[500], 0.16),
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 10,
                    bgcolor: sidebarAccent,
                  },
                }}
              />
            </Box>
          </Box>
        )}

        <Box
          onClick={() => setCourseContentExpanded((prev) => !prev)}
          sx={{
            mx: 2.5,
            mb: courseContentExpanded ? 1.25 : 0,
            px: 2,
            py: 1.75,
            borderRadius: 2.5,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5,
            bgcolor: 'background.paper',
            border: playerCardBorder,
            boxShadow: playerElevatedShadow,
            transition: theme.transitions.create(['background-color', 'box-shadow'], {
              duration: theme.transitions.duration.shorter,
            }),
            '&:hover': {
              bgcolor: alpha(theme.palette.primary.main, 0.04),
              boxShadow: `0 2px 8px ${alpha(theme.palette.common.black, 0.06)}`,
            },
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1.25,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                bgcolor: alpha(sidebarAccent, 0.1),
                color: 'primary.dark',
                border: `1px solid ${alpha(sidebarAccent, 0.22)}`,
              }}
            >
              <Iconify icon="solar:book-bookmark-bold" width={22} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: -0.01 }}>
                Course outline
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block', mt: 0.25 }}>
                {totalLessons} lesson{totalLessons !== 1 ? 's' : ''} · modules & assessments
              </Typography>
            </Box>
          </Stack>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              bgcolor: alpha(theme.palette.grey[500], 0.1),
              border: `1px solid ${sidebarMutedBorder}`,
            }}
          >
            <Iconify
              icon={courseContentExpanded ? 'eva:chevron-up-fill' : 'eva:chevron-down-fill'}
              width={20}
              sx={{ color: 'text.secondary' }}
            />
          </Box>
        </Box>

        {courseContentExpanded && (
        <>
          {modules.map((section, sectionIndex) => {
            const modulePracticeRowId = `${MODULE_PRACTICE_PREFIX}${section.id}`;
            const moduleAssignmentRowId = `${MODULE_ASSIGNMENT_PREFIX}${section.id}`;
            const sectionHasActiveLesson =
              (section.lessons || []).some((l) => l.id === activeLessonId) ||
              activeLessonId === modulePracticeRowId ||
              activeLessonId === moduleAssignmentRowId;
            const sectionStats = moduleProgressById[section.id] || {
              total: (section.lessons || []).length,
              completed: 0,
              percent: 0,
            };
            return (
              <Accordion
                key={section.id}
                expanded={expandedSection === section.id}
                onChange={() => setExpandedSection(expandedSection === section.id ? '' : section.id)}
                disableGutters
                elevation={0}
                sx={{
                  mx: 2.5,
                  mb: 1.5,
                  borderRadius: 2.5,
                  overflow: 'hidden',
                  bgcolor: 'background.paper',
                  border: playerCardBorder,
                  boxShadow: playerElevatedShadow,
                  '&:before': { display: 'none' },
                  ...(sectionHasActiveLesson && {
                    borderColor: alpha(sidebarAccent, 0.35),
                    boxShadow: `0 0 0 1px ${alpha(sidebarAccent, 0.12)}, 0 4px 12px ${alpha(theme.palette.common.black, 0.06)}`,
                  }),
                }}
              >
                <AccordionSummary
                  expandIcon={
                    <Iconify icon="eva:chevron-down-fill" width={20} sx={{ color: 'text.secondary' }} />
                  }
                  sx={{
                    minHeight: 56,
                    px: 0.5,
                    borderLeft: `4px solid ${
                      sectionHasActiveLesson ? sidebarAccent : alpha(theme.palette.grey[500], 0.25)
                    }`,
                    '& .MuiAccordionSummary-content': { my: 1.25, alignItems: 'center' },
                    '&:hover': { bgcolor: alpha(theme.palette.grey[500], 0.04) },
                    ...(sectionHasActiveLesson && {
                      bgcolor: alpha(sidebarAccent, 0.06),
                      '& .MuiAccordionSummary-expandIconWrapper': { color: 'primary.main' },
                    }),
                  }}
                >
                  <Box sx={{ width: 1, pr: 0.5 }}>
                    <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 0.5 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 800,
                          color: sectionHasActiveLesson ? 'primary.dark' : 'text.disabled',
                          letterSpacing: 0.04,
                          minWidth: 28,
                        }}
                      >
                        {String(sectionIndex + 1).padStart(2, '0')}
                      </Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, flex: 1, minWidth: 0 }} noWrap>
                        {section.title}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'text.secondary',
                          flexShrink: 0,
                          fontWeight: 700,
                          px: 1,
                          py: 0.25,
                          borderRadius: 10,
                          bgcolor: alpha(theme.palette.grey[500], 0.12),
                        }}
                      >
                        {sectionStats.completed}/{sectionStats.total}
                      </Typography>
                    </Stack>
                    {sectionStats.total > 0 && (
                      <LinearProgress
                        variant="determinate"
                        value={sectionStats.percent}
                        sx={{
                          mt: 0.5,
                          height: 5,
                          borderRadius: 10,
                          bgcolor: alpha(theme.palette.grey[500], 0.14),
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 10,
                            bgcolor: sectionHasActiveLesson ? sidebarAccent : alpha(sidebarAccent, 0.75),
                          },
                        }}
                      />
                    )}
                  </Box>
                </AccordionSummary>
                <AccordionDetails
                  sx={{
                    pt: 0,
                    pb: 1.5,
                    px: 1.5,
                    bgcolor: alpha(theme.palette.grey[500], 0.04),
                    borderTop: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
                  }}
                >
                  <Stack spacing={1}>
                    {(section.lessons || []).map((lesson) => {
                      const isActive = activeLessonId === lesson.id;
                      const isViewed = isLessonDoneForUi(lesson, liveSectionProgressMap, viewedSectionIds);
                      // Lock state: backend flag + local viewed list so next lesson unlocks immediately.
                      let isLocked = lesson.sectionProgress?.isLocked === true;
                      // If this is the first lesson, never lock.
                      const lessonFlatIndex = flatLessons.findIndex((l) => l.id === lesson.id);
                      const prevLessonRow =
                        lessonFlatIndex > 0 ? flatLessons[lessonFlatIndex - 1] : null;
                      const prevLessonDone =
                        Boolean(prevLessonRow) &&
                        isLessonDoneForUi(prevLessonRow, liveSectionProgressMap, viewedSectionIds);
                      if (lessonFlatIndex === 0) {
                        isLocked = false;
                      } else if (isLocked && prevLessonDone) {
                        isLocked = false;
                      }

                      const lessonHasVideo = Boolean(lesson.videoUrl);
                      const lessonHasImages = Array.isArray(lesson.images) && lesson.images.length > 0;
                      const isYouTubeLesson = lessonHasVideo && isYouTubeUrl(lesson.videoUrl);
                      const isSpotlightrLesson =
                        lessonHasVideo && isSpotlightrUrl(lesson.videoUrl);
                      const lessonPreviewImage = lessonHasImages
                        ? lesson.images[0]
                        : course?.image || DEFAULT_COURSE_IMAGE;
                      return (
                        <Stack
                          key={lesson.id}
                          direction="row"
                          alignItems="center"
                          justifyContent="flex-start"
                          onClick={() => {
                            if (isLocked) {
                              toast.info('Complete previous lesson to unlock this lesson');
                              return;
                            }
                            if (
                              activeLessonIdRef.current &&
                              activeLessonIdRef.current !== lesson.id
                            ) {
                              captureActiveLessonProgressRef.current?.();
                            }
                            setActiveLessonId(lesson.id);
                            setExpandedSection(section.id);
                            setSearchParams({ section: lesson.id }, { replace: true });
                            setSidebarOpen(false);
                          }}
                          sx={{
                            width: 1,
                            py: 1.35,
                            px: 1.5,
                            borderRadius: 1.5,
                            cursor: isLocked ? 'not-allowed' : 'pointer',
                            opacity: isLocked ? 0.55 : 1,
                            bgcolor: isActive
                              ? alpha(sidebarAccent, 0.1)
                              : isViewed
                                ? 'background.paper'
                                : alpha(theme.palette.common.white, 0.65),
                            border: `1px solid ${
                              isActive
                                ? alpha(sidebarAccent, 0.45)
                                : isViewed
                                  ? alpha(theme.palette.success.main, 0.35)
                                  : sidebarMutedBorder
                            }`,
                            boxShadow: isActive
                              ? `0 2px 8px ${alpha(sidebarAccent, 0.12)}`
                              : `0 1px 2px ${alpha(theme.palette.common.black, 0.04)}`,
                            color: isActive ? 'primary.dark' : isViewed ? 'text.primary' : 'text.primary',
                            transition: theme.transitions.create(
                              ['background-color', 'border-color', 'box-shadow'],
                              { duration: theme.transitions.duration.shorter }
                            ),
                            '&:hover': {
                              bgcolor: isActive
                                ? alpha(sidebarAccent, 0.14)
                                : isViewed
                                  ? alpha(theme.palette.success.main, 0.04)
                                  : alpha(theme.palette.grey[500], 0.06),
                              borderColor: isLocked
                                ? sidebarMutedBorder
                                : alpha(sidebarAccent, 0.28),
                            },
                          }}
                        >
                          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0, flex: 1 }}>
                            <Box
                              sx={{
                                width: 64,
                                height: 40,
                                borderRadius: 1,
                                overflow: 'hidden',
                                border: `1px solid ${
                                  isActive
                                    ? sidebarAccent
                                    : isViewed
                                      ? alpha(theme.palette.success.main, 0.55)
                                      : sidebarMutedBorder
                                }`,
                                bgcolor: 'grey.900',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              {lessonHasVideo && !isYouTubeLesson && !isSpotlightrLesson ? (
                                <Box
                                  component="video"
                                  src={lesson.videoUrl}
                                  muted
                                  preload="metadata"
                                  sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              ) : lessonHasVideo && (isYouTubeLesson || isSpotlightrLesson) ? (
                                <Stack direction="row" alignItems="center" spacing={0.5}>
                                  <Iconify icon="solar:video-frame-bold" width={16} sx={{ color: 'common.white' }} />
                                  <Iconify icon="solar:play-bold" width={14} sx={{ color: 'common.white' }} />
                                </Stack>
                              ) : lessonHasImages ? (
                                <Box
                                  component="img"
                                  src={lessonPreviewImage}
                                  alt=""
                                  sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              ) : (
                                <Iconify icon="solar:document-text-bold" width={16} sx={{ color: 'common.white' }} />
                              )}
                            </Box>
                            <Stack spacing={0.25} sx={{ minWidth: 0, flex: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 0, pr: 0.5 }} noWrap>
                                {lesson.title}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{ color: 'text.secondary', fontWeight: 500 }}
                                noWrap
                              >
                                {(() => {
                                  if (lessonHasVideo) {
                                    return (
                                      getLessonVideoSidebarCaption(
                                        lesson,
                                        liveSectionProgressMap,
                                        lesson.id === activeLessonId
                                          ? activeLessonSidebarPlayback
                                          : null,
                                        viewedSectionIds
                                      ) || 'Video lesson'
                                    );
                                  }
                                  return lessonHasImages
                                      ? `Images · ${lesson.images.length}`
                                      : Array.isArray(lesson.attachments) && lesson.attachments.length > 0
                                        ? `Files · ${lesson.attachments.length}`
                                        : lesson.content
                                        ? 'Text lesson'
                                        : 'Lesson';
                                })()}
                              </Typography>
                              {lessonHasVideo && (
                                <Stack direction="row" alignItems="center" spacing={0.75}>
                                  <LinearProgress
                                    variant="determinate"
                                    value={getLessonVideoSidebarPercent(
                                      lesson,
                                      liveSectionProgressMap,
                                      lesson.id === activeLessonId ? activeLessonSidebarPlayback : null,
                                      viewedSectionIds
                                    )}
                                    sx={{
                                      flex: 1,
                                      height: 5,
                                      borderRadius: 999,
                                      bgcolor: alpha(theme.palette.grey[500], 0.16),
                                      '& .MuiLinearProgress-bar': {
                                        borderRadius: 999,
                                        bgcolor:
                                          isActive || isViewed ? sidebarAccent : alpha(sidebarAccent, 0.55),
                                      },
                                    }}
                                  />
                                </Stack>
                              )}
                            </Stack>
                            {isViewed && (
                              <Chip
                                size="small"
                                label="Completed"
                                color="success"
                                variant="outlined"
                                icon={<Iconify icon="solar:check-circle-bold" width={14} />}
                                sx={{
                                  height: 22,
                                  flexShrink: 0,
                                  alignSelf: 'center',
                                  borderWidth: 1.5,
                                  '& .MuiChip-label': {
                                    px: 0.5,
                                    fontSize: theme.typography.pxToRem(10),
                                    fontWeight: 800,
                                    letterSpacing: 0.02,
                                  },
                                  '& .MuiChip-icon': { ml: '6px', color: 'success.main' },
                                }}
                              />
                            )}
                            {isLocked && (
                              <Iconify
                                icon="solar:lock-keyhole-bold"
                                width={14}
                                sx={{ color: 'text.disabled', flexShrink: 0, alignSelf: 'center' }}
                              />
                            )}
                          </Stack>
                        </Stack>
                      );
                    })}

                    {(() => {
                      const modPracticeCount = quizCountByModuleId[section.id] || 0;
                      if (modPracticeCount === 0) return null;
                      const stats = moduleProgressById[section.id];
                      const moduleDone =
                        stats && stats.total > 0 && stats.completed >= stats.total;
                      const practiceUnlockedStyle = moduleDone;
                      return (
                        <Tooltip
                          title={
                            moduleDone
                              ? `Open quiz (${modPracticeCount} question${modPracticeCount !== 1 ? 's' : ''})`
                              : 'Complete every lesson in this module to unlock quiz'
                          }
                          placement="left"
                          arrow
                        >
                          <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="flex-start"
                            onClick={() => {
                              if (!moduleDone) {
                                toast.info(
                                  'Complete every lesson in this module to unlock quiz'
                                );
                                return;
                              }
                              setActiveLessonId(modulePracticeRowId);
                              setExpandedSection(section.id);
                              setSearchParams({ section: modulePracticeRowId }, { replace: true });
                              setSidebarOpen(false);
                            }}
                            sx={{
                              width: 1,
                              py: 1.35,
                              px: 1.5,
                              borderRadius: 1.5,
                              cursor: moduleDone ? 'pointer' : 'not-allowed',
                              opacity: moduleDone ? 1 : 0.55,
                              bgcolor:
                                moduleDone && activeLessonId === modulePracticeRowId
                                  ? alpha(sidebarAccent, 0.1)
                                  : practiceUnlockedStyle
                                    ? alpha(theme.palette.info.main, 0.06)
                                    : alpha(theme.palette.grey[500], 0.04),
                              border: `1px solid ${
                                moduleDone && activeLessonId === modulePracticeRowId
                                  ? alpha(sidebarAccent, 0.4)
                                  : practiceUnlockedStyle
                                    ? alpha(theme.palette.info.main, 0.25)
                                    : sidebarMutedBorder
                              }`,
                              boxShadow: `0 1px 2px ${alpha(theme.palette.common.black, 0.04)}`,
                              color:
                                moduleDone && activeLessonId === modulePracticeRowId
                                  ? 'primary.dark'
                                  : practiceUnlockedStyle
                                    ? 'info.dark'
                                    : 'text.primary',
                              '&:hover': {
                                bgcolor: moduleDone
                                  ? activeLessonId === modulePracticeRowId
                                    ? alpha(sidebarAccent, 0.14)
                                    : alpha(theme.palette.info.main, 0.1)
                                  : alpha(theme.palette.grey[500], 0.06),
                              },
                            }}
                          >
                            <Stack
                              direction="row"
                              alignItems="center"
                              spacing={1.5}
                              sx={{ minWidth: 0, flex: 1 }}
                            >
                              <Box
                                sx={{
                                  width: 64,
                                  height: 40,
                                  borderRadius: 1,
                                  overflow: 'hidden',
                                  border: `1px solid ${
                                    moduleDone && activeLessonId === modulePracticeRowId
                                      ? sidebarAccent
                                      : practiceUnlockedStyle
                                        ? alpha(theme.palette.info.main, 0.5)
                                        : sidebarMutedBorder
                                  }`,
                                  bgcolor: alpha(theme.palette.info.dark, 0.85),
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                <Iconify
                                  icon="solar:clipboard-list-bold"
                                  width={22}
                                  sx={{ color: 'common.white' }}
                                />
                              </Box>
                              <Stack spacing={0.25} sx={{ minWidth: 0, flex: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                                  Quiz
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{ color: 'info.dark', fontWeight: 700 }}
                                  noWrap
                                >
                                  {modPracticeCount} question{modPracticeCount !== 1 ? 's' : ''}
                                </Typography>
                              </Stack>
                              {!moduleDone && (
                                <Iconify
                                  icon="solar:lock-keyhole-bold"
                                  width={14}
                                  sx={{ color: 'text.disabled', flexShrink: 0 }}
                                />
                              )}
                            </Stack>
                          </Stack>
                        </Tooltip>
                      );
                    })()}

                    {(() => {
                      const modAssignmentCount = assignmentCountByModuleId[section.id] || 0;
                      if (modAssignmentCount === 0) return null;
                      const stats = moduleProgressById[section.id];
                      const moduleDone =
                        stats && stats.total > 0 && stats.completed >= stats.total;
                      const assignmentUnlockedStyle = moduleDone;
                      return (
                        <Tooltip
                          title={
                            moduleDone
                              ? `Open assignment (${modAssignmentCount} item${modAssignmentCount !== 1 ? 's' : ''})`
                              : 'Complete every lesson in this module to unlock assignment'
                          }
                          placement="left"
                          arrow
                        >
                          <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="flex-start"
                            onClick={() => {
                              if (!moduleDone) {
                                toast.info(
                                  'Complete every lesson in this module to unlock assignment'
                                );
                                return;
                              }
                              setActiveLessonId(moduleAssignmentRowId);
                              setExpandedSection(section.id);
                              setSearchParams({ section: moduleAssignmentRowId }, { replace: true });
                              setSidebarOpen(false);
                            }}
                            sx={{
                              width: 1,
                              py: 1.35,
                              px: 1.5,
                              borderRadius: 1.5,
                              cursor: moduleDone ? 'pointer' : 'not-allowed',
                              opacity: moduleDone ? 1 : 0.55,
                              bgcolor:
                                moduleDone && activeLessonId === moduleAssignmentRowId
                                  ? alpha(sidebarAccent, 0.1)
                                  : assignmentUnlockedStyle
                                    ? alpha(theme.palette.warning.main, 0.06)
                                    : alpha(theme.palette.grey[500], 0.04),
                              border: `1px solid ${
                                moduleDone && activeLessonId === moduleAssignmentRowId
                                  ? alpha(sidebarAccent, 0.4)
                                  : assignmentUnlockedStyle
                                    ? alpha(theme.palette.warning.main, 0.25)
                                    : sidebarMutedBorder
                              }`,
                              boxShadow: `0 1px 2px ${alpha(theme.palette.common.black, 0.04)}`,
                              color:
                                moduleDone && activeLessonId === moduleAssignmentRowId
                                  ? 'primary.dark'
                                  : assignmentUnlockedStyle
                                    ? 'warning.dark'
                                    : 'text.primary',
                              '&:hover': {
                                bgcolor: moduleDone
                                  ? activeLessonId === moduleAssignmentRowId
                                    ? alpha(sidebarAccent, 0.14)
                                    : alpha(theme.palette.warning.main, 0.1)
                                  : alpha(theme.palette.grey[500], 0.06),
                              },
                            }}
                          >
                            <Stack
                              direction="row"
                              alignItems="center"
                              spacing={1.5}
                              sx={{ minWidth: 0, flex: 1 }}
                            >
                              <Box
                                sx={{
                                  width: 64,
                                  height: 40,
                                  borderRadius: 1,
                                  overflow: 'hidden',
                                  border: `1px solid ${
                                    moduleDone && activeLessonId === moduleAssignmentRowId
                                      ? sidebarAccent
                                      : assignmentUnlockedStyle
                                        ? alpha(theme.palette.warning.main, 0.5)
                                        : sidebarMutedBorder
                                  }`,
                                  bgcolor: alpha(theme.palette.warning.dark, 0.85),
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                <Iconify
                                  icon="solar:document-add-bold"
                                  width={22}
                                  sx={{ color: 'common.white' }}
                                />
                              </Box>
                              <Stack spacing={0.25} sx={{ minWidth: 0, flex: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                                  Assignment
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{ color: 'warning.dark', fontWeight: 700 }}
                                  noWrap
                                >
                                  {modAssignmentCount} item{modAssignmentCount !== 1 ? 's' : ''}
                                </Typography>
                              </Stack>
                              {!moduleDone && (
                                <Iconify
                                  icon="solar:lock-keyhole-bold"
                                  width={14}
                                  sx={{ color: 'text.disabled', flexShrink: 0 }}
                                />
                              )}
                            </Stack>
                          </Stack>
                        </Tooltip>
                      );
                    })()}
                  </Stack>
                  {(!section.lessons || section.lessons.length === 0) && (
                    <Box
                      sx={{
                        mx: 0.5,
                        my: 0.5,
                        py: 1.5,
                        px: 2,
                        borderRadius: 1.5,
                        bgcolor: alpha(theme.palette.grey[500], 0.08),
                        border: `1px dashed ${sidebarMutedBorder}`,
                      }}
                    >
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                        No lessons published in this module yet.
                      </Typography>
                    </Box>
                  )}
                </AccordionDetails>
              </Accordion>
            );
          })}

        </>
      )}

      {/* Feedback — same visual language as modules */}
      <Accordion
        expanded={expandedSection === FEEDBACK_SECTION_ID}
        onChange={() => {
          setExpandedSection(expandedSection === FEEDBACK_SECTION_ID ? '' : FEEDBACK_SECTION_ID);
        }}
        disableGutters
        elevation={0}
        sx={{
          mx: 2.5,
          mb: 2.5,
          mt: 0.5,
          borderRadius: 2.5,
          overflow: 'hidden',
          bgcolor: 'background.paper',
          border: playerCardBorder,
          boxShadow: playerElevatedShadow,
          '&:before': { display: 'none' },
          ...(progressPercent < 100 && { opacity: 0.92 }),
        }}
      >
        <AccordionSummary
          expandIcon={<Iconify icon="eva:chevron-down-fill" width={20} sx={{ color: 'text.secondary' }} />}
          sx={{
            minHeight: 52,
            px: 0.5,
            borderLeft: `4px solid ${alpha(theme.palette.warning.main, progressPercent >= 100 ? 0.9 : 0.35)}`,
            '& .MuiAccordionSummary-content': { my: 1.25 },
            '&:hover': { bgcolor: alpha(theme.palette.grey[500], 0.04) },
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.25}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: alpha(theme.palette.warning.main, 0.12),
                color: 'warning.dark',
                border: `1px solid ${alpha(theme.palette.warning.main, 0.25)}`,
              }}
            >
              <Iconify icon="solar:chat-round-dots-bold" width={20} />
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, letterSpacing: -0.01 }}>
                Course feedback
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                {progressPercent >= 100 ? 'Available now' : 'Unlocks when all lessons are complete'}
              </Typography>
            </Box>
          </Stack>
        </AccordionSummary>
        <AccordionDetails
          sx={{
            pt: 0,
            pb: 2,
            px: 2,
            bgcolor: alpha(theme.palette.grey[500], 0.04),
            borderTop: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
          }}
        >
          {progressPercent < 100 ? (
            <Box
              sx={{
                py: 2.5,
                px: 2,
                borderRadius: 1.5,
                bgcolor: 'background.paper',
                border: `1px dashed ${sidebarMutedBorder}`,
                textAlign: 'center',
              }}
            >
              <Iconify icon="solar:lock-keyhole-bold" width={36} sx={{ color: 'text.disabled', mb: 1.25 }} />
              <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 700 }}>
                Feedback is locked
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.75, fontWeight: 500 }}>
                Finish every lesson in the outline to submit official course feedback.
              </Typography>
              <Typography variant="caption" sx={{ color: 'primary.dark', display: 'block', mt: 1.25, fontWeight: 800 }}>
                Progress: {completedCount} / {totalLessons}
              </Typography>
            </Box>
          ) : (
            <>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{
                  py: 1.25,
                  px: 1.5,
                  borderRadius: 1.5,
                  bgcolor:
                    expandedSection === FEEDBACK_SECTION_ID
                      ? alpha(sidebarAccent, 0.08)
                      : 'background.paper',
                  border: `1px solid ${sidebarMutedBorder}`,
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
                  <Box
                    sx={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      border: `2px solid ${sidebarAccent}`,
                      bgcolor:
                        expandedSection === FEEDBACK_SECTION_ID ? sidebarAccent : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {expandedSection === FEEDBACK_SECTION_ID && (
                      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'common.white' }} />
                    )}
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                    Give feedback
                  </Typography>
                </Stack>
              </Stack>

              <Box
                sx={{
                  mt: 2,
                  bgcolor: 'background.paper',
                  boxShadow: `0 2px 8px ${alpha(theme.palette.common.black, 0.06)}`,
                  p: 2,
                  border: `1px solid ${sidebarMutedBorder}`,
                  borderRadius: 1.5,
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, color: 'text.primary' }}>
                  Evaluation form
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                  Please rate the course and share your feedback. Your input helps us improve.
                </Typography>
                <Stack spacing={2.5}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Overall, how would you rate the course?
                    </Typography>
                    <Rating
                      value={courseRating}
                      onChange={(_, v) => setCourseRating(v ?? 0)}
                      size="large"
                      max={5}
                      sx={{ '& .MuiRating-iconFilled': { color: 'warning.main' } }}
                    />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Do you have any other feedback or suggestions for the course?
                    </Typography>
                    <TextField
                      multiline
                      rows={3}
                      placeholder="Please input your feedback and suggestions for the course (if any)"
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      fullWidth
                      variant="outlined"
                    />
                  </Box>
                  {courseSpeakers.length > 0 && (
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, pt: 1 }}>
                      Rate the speaker(s)
                    </Typography>
                  )}
                  {courseSpeakers.map((speaker) => (
                    <Box
                      key={speaker.id}
                      sx={{
                        p: 2,
                        borderRadius: 1,
                        bgcolor: alpha(theme.palette.grey[500], 0.08),
                        border: `1px solid ${theme.palette.divider}`,
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                        {speaker.name}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                        Overall, how would you rate this speaker?
                      </Typography>
                      <Rating
                        value={speakerReviews[speaker.id]?.rating ?? 0}
                        onChange={(_, v) =>
                          setSpeakerReviews((prev) => ({
                            ...prev,
                            [speaker.id]: { ...prev[speaker.id], rating: v ?? 0 },
                          }))
                        }
                        size="large"
                        max={5}
                        sx={{ '& .MuiRating-iconFilled': { color: 'warning.main' }, mb: 1.5 }}
                      />
                      <TextField
                        multiline
                        rows={2}
                        placeholder={`Feedback for ${speaker.name} (optional)`}
                        value={speakerReviews[speaker.id]?.feedback ?? ''}
                        onChange={(e) =>
                          setSpeakerReviews((prev) => ({
                            ...prev,
                            [speaker.id]: { ...prev[speaker.id], feedback: e.target.value },
                          }))
                        }
                        fullWidth
                        variant="outlined"
                        size="small"
                      />
                    </Box>
                  ))}
                  <Button
                    variant="contained"
                    color="secondary"
                    size="large"
                    disabled={
                      feedbackSubmitting ||
                      courseRating === 0 ||
                      courseSpeakers.some((s) => (speakerReviews[s.id]?.rating ?? 0) === 0)
                    }
                    onClick={async () => {
                      const userId = user?.id;
                      if (!userId || !course?.id) {
                        toast.error('Please sign in to submit feedback');
                        return;
                      }
                      setFeedbackSubmitting(true);
                      try {
                        await createCourseReview({
                          userId,
                          courseId: course.id,
                          rating: courseRating,
                          feedback: feedbackText.trim() || undefined,
                        });
                        await Promise.all(
                          courseSpeakers.map((speaker) =>
                            createSpeakerReview({
                              userId,
                              speakerId: speaker.id,
                              rating: speakerReviews[speaker.id]?.rating ?? 0,
                              feedback: (speakerReviews[speaker.id]?.feedback || '').trim() || undefined,
                              courseId: course.id,
                            })
                          )
                        );
                        toast.success('Thank you! Your feedback has been submitted.');
                        setCourseRating(0);
                        setFeedbackText('');
                        setSpeakerReviews((prev) => {
                          const next = { ...prev };
                          Object.keys(next).forEach((id) => {
                            next[id] = { rating: 0, feedback: '' };
                          });
                          return next;
                        });
                      } catch (err) {
                        toast.error(err?.response?.data?.message || 'Failed to submit feedback');
                      } finally {
                        setFeedbackSubmitting(false);
                      }
                    }}
                    sx={{ alignSelf: 'flex-start', fontWeight: 600 }}
                  >
                    Submit
                  </Button>
                </Stack>
              </Box>
            </>
          )}
        </AccordionDetails>
      </Accordion>
      </Box>
    </Box>
  );

  const isModulePracticePanelView = Boolean(
    activeLessonId !== FEEDBACK_LESSON_ID && modulePracticeModuleId && course?.id
  );
  const isModuleAssignmentView = Boolean(
    activeLessonId !== FEEDBACK_LESSON_ID && moduleAssignmentModuleId && course?.id
  );
  const isModulePanelView = isModulePracticePanelView || isModuleAssignmentView;
  const isModulePracticeQuiz = isModulePracticePanelView && practiceQuizOn;
  /** Quiz + assignment fill panel; lessons scroll separately. */
  const isScrollableLessonPanel = !isModulePanelView;
  const showLessonDetailPanel = Boolean(
    activeLesson &&
      activeLessonId !== FEEDBACK_LESSON_ID &&
      !modulePracticeModuleId &&
      !moduleAssignmentModuleId
  );

  const handleLessonDetailTabChange = (_, value) => {
    setLessonDetailTab(value);
  };

  return (
    <DashboardContent
      disablePadding
      sx={{
        flex: '1 1 0%',
        minHeight: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'grey.50',
        backgroundImage: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.04)} 0%, ${theme.palette.grey[50]} 280px)`,
      }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        alignItems="stretch"
        sx={{
          flex: '1 1 0%',
          minHeight: 0,
          width: '100%',
        }}
      >
        {/* Left: course outline — own scroll, scrollbar on left edge */}
        <Box
          sx={{
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            width: { md: 384, lg: 420 },
            flex: { md: '0 0 auto' },
            flexShrink: 0,
            minHeight: 0,
            alignSelf: 'stretch',
            bgcolor: 'background.paper',
            backgroundImage: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.grey[500], 0.04)} 100%)`,
            borderRight: playerCardBorder,
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{ flex: 1, minHeight: 0, width: 1, ...playerLeftScrollPanelSx }}
            tabIndex={0}
            aria-label="Course outline"
          >
            {courseSidebar}
          </Box>
        </Box>

        {/* Mobile drawer sidebar */}
        <Drawer
          anchor="left"
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          ModalProps={{ keepMounted: true }}
          PaperProps={{
            sx: {
              width: { xs: 'min(100vw - 16px, 800px)', sm: 400 },
              maxHeight: '100%',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              bgcolor: alpha(theme.palette.grey[500], 0.06),
              backgroundImage: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.04)} 0%, transparent 48%)`,
              borderRight: `1px solid ${sidebarMutedBorder}`,
            },
          }}
        >
          <Box sx={{ flex: 1, minHeight: 0, ...playerLeftScrollPanelSx }}>{courseSidebar}</Box>
        </Drawer>

        {/* Right: own scroll when cursor is here — independent from left sidebar */}
        <Box
          sx={{
            flex: '1 1 0%',
            minWidth: 0,
            minHeight: 0,
            width: { xs: '100%', md: 0 },
            order: { xs: 1, md: 2 },
            display: 'flex',
            flexDirection: 'column',
            p: isModulePanelView ? 0 : { xs: 2, sm: 3, md: 4 },
            pt: isModulePanelView ? 0 : { xs: 2, sm: 3, md: 4 },
            pb: isModulePanelView ? 0 : { xs: 3, md: 5 },
          }}
        >
          <Box
            ref={rightScrollRef}
            tabIndex={0}
            aria-label="Lesson content"
            sx={{
              flex: '1 1 0%',
              minHeight: 0,
              width: 1,
              ...(isModulePanelView
                ? playerPracticePanelSx
                : isScrollableLessonPanel
                  ? playerRightScrollPanelSx
                  : {}),
            }}
          >
          {!isModulePanelView ? (
            <Box sx={{ display: { xs: 'flex', md: 'none' }, mb: 2, flexShrink: 0 }}>
            <Button
              size="medium"
              variant="contained"
              color="inherit"
              startIcon={<Iconify icon="solar:sidebar-minimalistic-bold" width={18} />}
              onClick={() => setSidebarOpen(true)}
              sx={{
                fontWeight: 700,
                borderRadius: 2,
                bgcolor: 'background.paper',
                color: 'text.primary',
                border: playerCardBorder,
                boxShadow: playerElevatedShadow,
                '&:hover': { bgcolor: 'grey.100' },
              }}
            >
              Course content
            </Button>
          </Box>
          ) : null}

          {activeLessonId === FEEDBACK_LESSON_ID ? null : moduleAssignmentModuleId && course?.id ? (
            playerLoading || modules.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <Typography color="text.secondary">Loading module…</Typography>
              </Box>
            ) : !moduleAssignmentModuleMeta ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <Typography color="text.secondary">This module could not be found.</Typography>
              </Box>
            ) : (
              <Box
                sx={{
                  width: '100%',
                  ...playerPracticeFillSx,
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 0,
                  bgcolor: 'background.paper',
                  borderRadius: 0,
                  boxShadow: 'none',
                  border: 'none',
                }}
              >
                <LearningModuleAssignmentsPanel
                  courseId={course.id}
                  moduleTitle={moduleAssignmentModuleMeta.title || 'Module'}
                  assignments={moduleAssignmentQuestions}
                  fillContainer
                />
              </Box>
            )
          ) : modulePracticeModuleId && course?.id ? (
            playerLoading || modules.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <Typography color="text.secondary">Loading module…</Typography>
              </Box>
            ) : !modulePracticeModuleMeta ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <Typography color="text.secondary">This module could not be found.</Typography>
              </Box>
            ) : (
              <Box
                sx={{
                  width: '100%',
                  ...playerPracticeFillSx,
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 0,
                  bgcolor: practiceQuizOn ? 'background.paper' : 'transparent',
                  borderRadius: 0,
                  boxShadow: 'none',
                  border: 'none',
                }}
              >
                {practiceQuizOn && modulePracticeQuestions.length > 0 ? (
                  <LearningModulePracticeQuiz
                    key={modulePracticeModuleId}
                    courseId={course.id}
                    moduleId={modulePracticeModuleId}
                    moduleTitle={modulePracticeModuleMeta.title || 'Module'}
                    questions={modulePracticeQuestions}
                    fillContainer
                    onBackToIntro={() => {
                      setSearchParams({ section: activeLessonId }, { replace: true });
                    }}
                  />
                ) : modulePracticeQuestions.length > 0 ? (
                  <LearningModulePracticeIntro
                    fillContainer
                    moduleTitle={modulePracticeModuleMeta.title || 'Module'}
                    questionCount={modulePracticeQuestions.length}
                    onStartTest={() =>
                      setSearchParams({ section: activeLessonId, practiceQuiz: '1' }, { replace: true })
                    }
                  />
                ) : (
                  <Box sx={{ py: 6, textAlign: 'center' }}>
                    <Typography color="text.secondary">No practice questions for this module.</Typography>
                  </Box>
                )}
              </Box>
            )
          ) : !activeLesson ? (
            <Box sx={{ ...playerCardSx, width: '100%' }}>
              <Box sx={{ position: 'relative', aspectRatio: '16/9', bgcolor: 'grey.900' }}>
                <Box
                  component="img"
                  src={course.image || DEFAULT_COURSE_IMAGE}
                  alt={course.title}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: alpha(theme.palette.common.black, 0.25),
                  }}
                />
              </Box>
              <Stack spacing={2.5} sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  Welcome to this course
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                  Select a lesson from the sidebar to start watching, or click below to begin with
                  the first lesson.
                </Typography>
                {modules[0]?.lessons?.[0] && (
                  <Button
                    variant="contained"
                    color="secondary"
                    size="large"
                    startIcon={<Iconify icon="solar:play-bold" width={22} />}
                    onClick={() => {
                      const first = modules[0].lessons[0];
                      setActiveLessonId(first.id);
                      setExpandedSection(modules[0].id);
                      setSearchParams({ section: first.id });
                    }}
                    sx={{ alignSelf: 'flex-start', fontWeight: 600, px: 3 }}
                  >
                    Start first lesson
                  </Button>
                )}
              </Stack>
            </Box>
          ) : hasVideo ? (
            <LessonVideoPlayer
              key={`video-${activeLessonId || ''}-${embedUrl || ''}-${spotlightrMeta?.videoId || ''}-${videoSrc || ''}`}
              embedUrl={!activeLessonGateBlocked ? embedUrl : null}
              spotlightrMeta={!activeLessonGateBlocked && !embedUrl ? spotlightrMeta : null}
              videoSrc={!embedUrl && !spotlightrMeta && !activeLessonGateBlocked ? videoSrc : null}
              videoPoster={videoPoster}
              videoRef={videoRef}
              youtubeContainerRef={youtubeContainerRef}
              spotlightrContainerRef={spotlightrContainerRef}
              lockedOverlay={lessonLockOverlay}
              frameHeight={LESSON_MEDIA_FRAME_HEIGHT}
              floatingOverlay={
                autoNextCountdown > 0 && nextLesson ? (
                  <Stack
                    spacing={0.75}
                    alignItems="center"
                    sx={{
                      position: 'absolute',
                      right: 16,
                      bottom: 16,
                      zIndex: 3,
                      px: 1.25,
                      py: 1,
                      borderRadius: 1.25,
                      bgcolor: alpha(theme.palette.common.black, 0.55),
                      color: 'common.white',
                    }}
                  >
                    <CircularProgress
                      variant="determinate"
                      size={40}
                      thickness={4}
                      value={((AUTO_NEXT_SECONDS - autoNextCountdown) / AUTO_NEXT_SECONDS) * 100}
                      sx={{ color: 'common.white' }}
                    />
                    <Typography variant="caption" sx={{ color: 'common.white', fontWeight: 600 }}>
                      Next in {autoNextCountdown}s
                    </Typography>
                  </Stack>
                ) : null
              }
              onLoadedMetadata={() => {
                const v = videoRef.current;
                if (!v) return;
                const resumeMeta = resumeSeekAppliedRef.current;
                if (
                  resumeMeta.sectionId === activeLessonId &&
                  !resumeMeta.applied &&
                  resumeMeta.seconds > 2
                ) {
                  try {
                    markVideoSeekClampGrace();
                    const resumeAt = Math.min(
                      resumeMeta.seconds,
                      Number.isFinite(v.duration) ? v.duration : resumeMeta.seconds
                    );
                    v.currentTime = resumeAt;
                    nativeVideoProgressRef.current.lastTime = resumeAt;
                    resumeMeta.applied = true;
                  } catch {
                    // ignore
                  }
                }
                if (autoPlayNextRef.current && !activeLessonGateBlocked) {
                  try {
                    v.muted = true;
                    const promise = v.play();
                    if (promise && typeof promise.then === 'function') {
                      promise.catch(() => {});
                    }
                  } catch {
                    // ignore autoplay rejection
                  } finally {
                    autoPlayNextRef.current = false;
                  }
                }
              }}
              onPlay={() => {
                const v = videoRef.current;
                if (!v) return;
                const prog = nativeVideoProgressRef.current;
                prog.isPlaying = true;
                prog.lastTime = v.currentTime;
                console.log('[Video] Play');
              }}
              onPause={() => {
                const v = videoRef.current;
                const prog = nativeVideoProgressRef.current;
                prog.isPlaying = false;
                // Avoid duplicate pause save after ended; onEnded handles final persist.
                if (v?.ended) return;
                if (
                  prog.markedComplete ||
                  isSectionLessonComplete(
                    activeLessonId,
                    flatLessons,
                    liveSectionProgressMap,
                    viewedSectionIds
                  )
                ) {
                  return;
                }
                if (v && course?.id && activeLessonId) {
                  appendCoverageSlicePlayer(
                    videoCoverageRangesRef,
                    prog.lastTime,
                    v.currentTime,
                    Math.round(v.duration || 0)
                  );
                  const durRounded = Math.round(Number(v.duration) || 0);
                  const cov =
                    durRounded > 0 ? coverageMeasurePlayer(videoCoverageRangesRef.current, durRounded) : 0;
                  if (
                    durRounded > 0 &&
                    (cov >= durRounded - 1 || v.currentTime >= durRounded - 0.5)
                  ) {
                    syncProgressOnFullDuration(activeLessonIdRef.current, v.currentTime, v.duration);
                  }
                  const payload = buildVideoCoveragePayloadFromRef(
                    videoCoverageRangesRef,
                    v.currentTime,
                    v.duration
                  );
                  sendProgressUpdate(course.id, activeLessonId, payload);
                  prog.pendingDeltaSeconds = 0;
                }
                console.log('[Video] Pause');
              }}
              onEnded={() => {
                const v = videoRef.current;
                if (!v) return;
                const prog = nativeVideoProgressRef.current;
                const required = effectiveRequiredSeconds(watchtimeSeconds, v.duration);
                const t = v.currentTime;
                const d = v.duration;
                if (course?.id && activeLessonId) {
                  appendCoverageSlicePlayer(
                    videoCoverageRangesRef,
                    prog.lastTime,
                    t,
                    Math.round(d || 0)
                  );
                }
                const durRounded = Math.round(Number(d) || 0);
                const cov =
                  durRounded > 0 ? coverageMeasurePlayer(videoCoverageRangesRef.current, durRounded) : 0;
                if (durRounded > 0 && (cov >= durRounded - 1 || t >= durRounded - 0.5)) {
                  syncProgressOnFullDuration(activeLessonIdRef.current, t, d);
                }
                // If already marked complete mid-playback, still allow full-duration sync above; then sync local unlock state.
                if (prog.markedComplete) {
                  appendViewedSectionId(activeLessonIdRef.current);
                  return;
                }
                const shouldComplete = required > 0 ? cov >= required - 1 : true;
                if (shouldComplete) {
                  prog.markedComplete = true;
                  if (activeLessonId) {
                    completeSection(activeLessonId);
                  }
                  console.log('[Video progress] Section marked complete (video ended)', {
                    currentTime: Math.round(t),
                    required,
                  });
                  if (nextLesson?.id) {
                    startAutoNextCountdown(nextLesson);
                  }
                } else if (course?.id && activeLessonId) {
                  const payload = buildVideoCoveragePayloadFromRef(videoCoverageRangesRef, t, d);
                  sendProgressUpdate(course.id, activeLessonId, payload);
                  prog.pendingDeltaSeconds = 0;
                }
              }}
              onSeeking={(e) => {
                const v = e.target;
                if (!v || embedUrl) return;
                if (sectionProgressData?.isCompleted || nativeVideoProgressRef.current.markedComplete) return;
                if (isVideoSeekClampGraceActive()) return;
                // iOS: clamp in onSeeked / timeupdate while `seeking` — setting time here causes flicker.
                if (isAppleMobileDevice()) return;
                const prog = nativeVideoProgressRef.current;
                const current = Math.max(0, Number(v.currentTime || 0));
                const last = Math.max(0, Number(prog.lastTime || 0));
                const durRounded = Math.round(Number(v.duration) || 0);
                const maxAllowed = computeMaxAllowedTimeline(
                  videoCoverageRangesRef,
                  prog,
                  sectionProgressData,
                  durRounded
                );
                if (current <= maxAllowed + 0.35) return;
                if (Math.abs(current - last) <= 2.5) return;
                clampNativeVideoSeek(v);
              }}
              onSeeked={(e) => {
                const v = e.target;
                if (!v || embedUrl) return;
                if (sectionProgressData?.isCompleted || nativeVideoProgressRef.current.markedComplete) return;
                if (isVideoSeekClampGraceActive()) {
                  nativeVideoProgressRef.current.lastTime = Math.max(
                    0,
                    Number(v.currentTime || 0)
                  );
                  return;
                }
                const prog = nativeVideoProgressRef.current;
                const clamped = clampNativeVideoSeek(v);
                if (clamped) return;
                const current = Math.max(0, Number(v.currentTime || 0));
                const durRounded = Math.round(Number(v.duration) || 0);
                const maxAllowed = computeMaxAllowedTimeline(
                  videoCoverageRangesRef,
                  prog,
                  sectionProgressData,
                  durRounded
                );
                if (current <= maxAllowed + 0.35) {
                  prog.lastTime = current;
                }
              }}
              onTimeUpdate={() => {
                const v = videoRef.current;
                if (!v) return;
                const prog = nativeVideoProgressRef.current;
                if (prog.markedComplete) return;
                const currentTime = Number(v.currentTime || 0);
                const durRounded = Math.round(Number(v.duration) || 0);
                const maxAllowed = computeMaxAllowedTimeline(
                  videoCoverageRangesRef,
                  prog,
                  sectionProgressData,
                  durRounded
                );
                const isIos = isAppleMobileDevice();
                const allowedForwardDrift = isIos ? 0.25 : 0.35;
                const previousTime = Math.max(0, Number(prog.lastTime || 0));
                const jumpDelta = Math.abs(currentTime - previousTime);
                const jumpThreshold = isIos ? 1.5 : 2.5;
                const isLikelySeekJump = jumpDelta > jumpThreshold;

                if (!isVideoSeekClampGraceActive()) {
                  if (isIos && v.seeking && currentTime > maxAllowed + allowedForwardDrift) {
                    clampNativeVideoSeek(v);
                    return;
                  }
                  if (
                    isLikelySeekJump &&
                    currentTime > maxAllowed + allowedForwardDrift &&
                    currentTime > previousTime + 0.2
                  ) {
                    clampNativeVideoSeek(v);
                    return;
                  }
                }
                const required = effectiveRequiredSeconds(watchtimeSeconds, v.duration);
                if (prog.isPlaying) {
                  const delta = Math.abs(v.currentTime - prog.lastTime);
                  const maxDelta = isIos ? 1.5 : 2.5;
                  if (delta <= maxDelta) {
                    prog.maxWatchedTimeline = Math.max(prog.maxWatchedTimeline ?? 0, v.currentTime);
                  }
                  appendCoverageSlicePlayer(
                    videoCoverageRangesRef,
                    prog.lastTime,
                    v.currentTime,
                    durRounded
                  );
                  const cov =
                    durRounded > 0
                      ? coverageMeasurePlayer(videoCoverageRangesRef.current, durRounded)
                      : 0;
                  if (
                    durRounded > 0 &&
                    (cov >= durRounded - 1 || v.currentTime >= durRounded - 0.5)
                  ) {
                    syncProgressOnFullDuration(activeLessonIdRef.current, v.currentTime, v.duration);
                  }
                  prog.watchedSeconds = cov;
                  prog.pendingDeltaSeconds = 0;
                  prog.lastTime = v.currentTime;
                  if (required > 0 && cov >= required) {
                    prog.markedComplete = true;
                    console.log(
                      '[Video progress] Section marked complete (coverage',
                      cov,
                      's / required',
                      required,
                      's)'
                    );
                    videoWatchedEnoughRef.current?.();
                  }
                } else if (
                  !isVideoSeekClampGraceActive() &&
                  currentTime > maxAllowed + allowedForwardDrift
                ) {
                  clampNativeVideoSeek(v);
                } else {
                  prog.lastTime = v.currentTime;
                }
              }}
            />
          ) : hasImages ? (
            <LessonImageViewer
              images={activeLesson.images}
              currentIndex={sectionImageIndex}
              onPrev={() => setSectionImageIndex((i) => Math.max(0, i - 1))}
              onNext={() =>
                setSectionImageIndex((i) =>
                  Math.min(activeLesson.images.length - 1, i + 1)
                )
              }
              canPrev={!activeLessonGateBlocked && sectionImageIndex > 0}
              canNext={
                !activeLessonGateBlocked &&
                sectionImageIndex < activeLesson.images.length - 1
              }
              lockedOverlay={lessonLockOverlay}
              frameHeight={LESSON_MEDIA_FRAME_HEIGHT}
            />
          ) : hasAttachments ? (
            <LessonDocumentViewer
              lesson={activeLesson}
              lessonId={activeLessonId}
              lockedOverlay={lessonLockOverlay}
              viewedSectionIds={viewedSectionIds}
              setViewedSectionIds={setViewedSectionIds}
              frameHeight={LESSON_MEDIA_FRAME_HEIGHT}
            />
          ) : hasTextContent ? (
            <LessonTextViewer
              html={activeLesson?.content || ''}
              lockedOverlay={lessonLockOverlay}
              frameHeight={LESSON_MEDIA_FRAME_HEIGHT}
            />
          ) : (
            <Box
              sx={{
                ...playerCardSx,
                px: 3,
                textAlign: 'center',
                borderStyle: 'dashed',
                height: LESSON_MEDIA_FRAME_HEIGHT,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Box>
                <Iconify
                  icon="solar:document-text-bold"
                  width={48}
                  sx={{ color: 'grey.400', mb: 1.5 }}
                />
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  No content for this lesson yet
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: 'text.disabled', display: 'block', mt: 0.5 }}
                >
                  Select another lesson or check back later
                </Typography>
              </Box>
            </Box>
          )}

          {activeLesson &&
          activeLessonId !== FEEDBACK_LESSON_ID &&
          !modulePracticeModuleId &&
          !moduleAssignmentModuleId &&
          activeLessonSubtitle ? (
            <Box sx={{ mt: 2 }}>
              <Typography
                variant="body1"
                sx={{
                  fontWeight: 700,
                  color: 'text.primary',
                  lineHeight: 1.5,
                  maxWidth: 900,
                  fontSize: playerFluidType.subtitle,
                }}
              >
                {activeLessonSubtitle}
              </Typography>
            </Box>
          ) : null}

          {activeLesson && isActiveModuleCompleted && hasNextModule && (
            <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
              <Button
                variant="contained"
                color="secondary"
                endIcon={<Iconify icon="eva:arrow-ios-forward-fill" />}
                onClick={goToNextModuleStart}
              >
                Next Module
              </Button>
            </Stack>
          )}

          {/* Lesson notes & learning materials */}
          {showLessonDetailPanel ? (
            <Box
              ref={lessonDetailSectionRef}
              sx={{
                mt: 2,
                width: '100%',
                bgcolor: 'background.paper',
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2.5,
                boxShadow: playerElevatedShadow,
              }}
            >
              <Tabs
                value={hasLearningMaterials && lessonDetailTab === 1 ? 1 : 0}
                onChange={handleLessonDetailTabChange}
                sx={{
                  px: { xs: 2, md: 2.5 },
                  minHeight: 48,
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  '& .MuiTabs-flexContainer': { gap: { xs: 2, sm: 3 } },
                  '& .MuiTab-root': {
                    minHeight: 48,
                    minWidth: { xs: 128, sm: 168 },
                    px: { xs: 2, sm: 2.5 },
                    py: 1.25,
                    gap: 1,
                    fontSize: playerFluidType.tab,
                    fontWeight: 600,
                    textTransform: 'none',
                    color: 'secondary.main',
                    '& .MuiTab-iconWrapper': { marginRight: 0.75 },
                  },
                  '& .MuiTab-root.Mui-selected': {
                    color: 'primary.main',
                    fontWeight: 700,
                  },
                  '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0' },
                }}
              >
                <Tab
                  label="Lesson notes"
                  color={
                    hasLearningMaterials && lessonDetailTab === 1 ? 'secondary' : 'primary'
                  }
                  icon={
                    <Box
                      component="img"
                      src={courseLessonNotesIcon}
                      alt=""
                      sx={playerTabIconSx}
                    />
                  }
                  iconPosition="start"
                />
                {hasLearningMaterials ? (
                  <Tab
                    label="Learning materials"
                    color={lessonDetailTab === 1 ? 'primary' : 'secondary'}
                    icon={
                      <Box
                        component="img"
                        src={courseLearningMaterialsIcon}
                        alt=""
                        sx={playerTabIconSx}
                      />
                    }
                    iconPosition="start"
                  />
                ) : null}
              </Tabs>
              <Box sx={{ px: { xs: 2, md: 2.5 }, pt: 2, pb: { xs: 2, md: 2.5 } }}>
                <Box
                  sx={{
                    display: hasLearningMaterials && lessonDetailTab === 1 ? 'none' : 'block',
                  }}
                >
                  {hasDisplayableHtml(activeLesson?.description) ? (
                    <RichTextContent html={activeLesson.description} sx={playerLessonNotesSx} />
                  ) : (
                    <Typography
                      variant="body2"
                      sx={{
                        color: 'text.secondary',
                        lineHeight: 1.7,
                        fontSize: playerFluidType.body,
                      }}
                    >
                      {activeLesson && course?.description
                        ? (() => {
                            const paras = htmlToPlainText(course.description || '')
                              .split(/\n\n+/)
                              .filter(Boolean);
                            const idx = modules
                              .flatMap((m) => m.lessons || [])
                              .findIndex((l) => l.id === activeLesson.id);
                            const text = paras[idx] || paras[0];
                            return (
                              text || `Notes for "${activeLesson.title}" can be added here.`
                            );
                          })()
                        : `Notes for "${activeLesson.title}" can be added here.`}
                    </Typography>
                  )}
                </Box>
                {hasLearningMaterials ? (
                  <Box sx={{ display: lessonDetailTab === 1 ? 'block' : 'none' }}>
                    <LessonLearningMaterialsPanel
                      key={`materials-${activeLessonId}`}
                      materials={activeLesson.learningMaterials}
                    />
                  </Box>
                ) : null}
              </Box>
            </Box>
          ) : null}

          {activeLesson && flatLessons.length > 1 && (
            <Box
              sx={{
                mt: 2.5,
                p: 2,
                borderRadius: 2.5,
                bgcolor: 'background.paper',
                border: playerCardBorder,
                boxShadow: playerElevatedShadow,
              }}
            >
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                spacing={2}
              >
                <Button
                  variant="outlined"
                  color="inherit"
                  startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
                  onClick={goToPrevLesson}
                  disabled={!prevLesson}
                  sx={{
                    minWidth: { xs: 96, sm: 128 },
                    borderRadius: 1.5,
                    fontWeight: 600,
                    fontSize: playerFluidType.body,
                  }}
                >
                  Previous
                </Button>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'text.secondary',
                    fontWeight: 700,
                    fontSize: playerFluidType.caption,
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 1,
                    bgcolor: alpha(theme.palette.grey[500], 0.08),
                  }}
                >
                  {currentIndex >= 0 ? `${currentIndex + 1} / ${flatLessons.length}` : ''}
                </Typography>
                <LoadingButton
                  variant="contained"
                  color="primary"
                  endIcon={<Iconify icon="eva:arrow-ios-forward-fill" />}
                  onClick={goToNextLesson}
                  loading={nextLoading}
                  disabled={!canGoNextLesson}
                  sx={{
                    minWidth: { xs: 96, sm: 128 },
                    borderRadius: 1.5,
                    fontWeight: 600,
                    fontSize: playerFluidType.body,
                  }}
                >
                  Next
                </LoadingButton>
              </Stack>
            </Box>
          )}

          </Box>
        </Box>
      </Stack>
    </DashboardContent>
  );
}

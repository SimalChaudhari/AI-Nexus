import { useState, useMemo, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import useSWR, { useSWRConfig } from 'swr';
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
import { Upload } from 'src/components/upload';
import { LessonVideoPlayer } from 'src/sections/learning/components/lesson-video-player';
import { LessonVideoCoverageStrip } from 'src/sections/learning/components/lesson-video-coverage-strip';
import { ProgramCpeSummaryPanel } from 'src/sections/learning/components/program-cpe-summary-panel';
import { useSpotlightrLessonPlayer } from 'src/sections/learning/hooks/use-spotlightr-lesson-player';
import { isSpotlightrUrl, parseSpotlightrUrl, seekSpotlightrPlayer } from 'src/utils/spotlightr';
import {
  coverageMeasureSeconds,
  coveragePercentDisplay,
  computeUnwatchedRanges,
  isPlaybackAtVideoEnd,
  mergeCoverageRangesMonotonic,
  roundedVideoDurationSeconds,
  sealCoverageRangesToVideoEnd,
  sealCoverageRangesWhenComplete,
  isTimelineFullyCovered,
  preferCatalogDurationWhenPlayerSkewed,
} from 'src/sections/learning/utils/video-coverage';
import {
  buildCourseProgressUnits,
  summarizeProgressUnits,
  getModuleProgressFromUnits,
  areModuleLessonsComplete,
} from 'src/sections/learning/utils/course-progress-units';
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
  UNLOCK_QUIZ_ASSESSMENT_WITHOUT_VIDEO,
} from 'src/config/constants';
import { toast } from 'src/components/snackbar';
import { DashboardContent } from 'src/layouts/dashboard';
import { RichTextContent } from 'src/components/html-content';
import { htmlToPlainText } from 'src/utils/html-plain-text';
import { getCourseDefaultImage } from 'src/utils/course-default-image';

import courseLessonNotesIcon from 'src/assets/course/notes.png';
import courseLearningMaterialsIcon from 'src/assets/course/material.png';
import {
  getLessonMediaFrameSx,
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
  // Close tiny holes from play/pause / poll jitter (same order as displayed clock gaps).
  const GAP_FILL_SEC = 0.75;
  const sorted = ranges
    .map(([a, b]) => [Math.min(a, b), Math.max(a, b)])
    .filter(([s, e]) => e > s && Number.isFinite(s) && Number.isFinite(e))
    .sort((x, y) => x[0] - y[0]);
  const out = [];
  for (const [s, e] of sorted) {
    const last = out[out.length - 1];
    if (!last || s > last[1] + GAP_FILL_SEC) out.push([s, e]);
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
  return coverageMeasureSeconds(ranges, maxDuration);
}

/** Never replace in-memory coverage with a smaller server/snapshot payload. */
function applyCoverageRangesMonotonic(rangesRef, incoming, maxDuration = 0) {
  rangesRef.current = mergeCoverageRangesMonotonic(
    rangesRef.current,
    incoming,
    maxDuration
  );
}

/** Replace coverage on lesson switch or after admin video URL change — do not carry prior lesson ranges. */
function replaceCoverageRangesFromServer(rangesRef, incoming, maxDuration = 0) {
  const parsed = parseCoverageRangePairs(incoming);
  const merged = mergeCoverageRangesPlayer(parsed);
  rangesRef.current =
    maxDuration > 0 ? clipCoverageRangesPlayer(merged, maxDuration) : merged;
}

/**
 * Add a forward play segment.
 * Small jumps are always accepted. Larger jumps are accepted when wall-clock
 * elapsed explains them (background-tab timer throttle / play-pause race).
 * True seeks jump faster than real time and are still rejected.
 */
function appendCoverageSlicePlayer(rangesRef, from, to, maxDuration, atEnd = false, wallElapsedMs = null) {
  const lo = Number(from);
  const hi = Number(to);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return;
  const a = Math.min(lo, hi);
  const b = Math.max(lo, hi);
  const rawDelta = b - a;
  if (rawDelta <= 0) return;

  const LEGACY_POLL_MAX_SEC = 2.5;
  const durationCap =
    Number.isFinite(maxDuration) && maxDuration > 0 ? maxDuration : 7200;
  let maxAcceptSec = LEGACY_POLL_MAX_SEC;
  if (Number.isFinite(wallElapsedMs) && wallElapsedMs != null && wallElapsedMs >= 0) {
    // Allow poll jitter (+1.5s) and slight drift while throttled in a background tab.
    maxAcceptSec = Math.min(
      durationCap,
      Math.max(LEGACY_POLL_MAX_SEC, (wallElapsedMs / 1000) * 1.5 + 1.5)
    );
  }
  if (!atEnd && rawDelta > maxAcceptSec) return;

  const cap = Number.isFinite(maxDuration) && maxDuration > 0 ? maxDuration : null;
  const start = Math.max(0, a);
  let end = cap != null ? Math.min(cap, b) : b;
  if (cap != null && atEnd) {
    end = cap;
  }
  if (end <= start) return;
  const prev = Array.isArray(rangesRef.current) ? rangesRef.current : [];
  const merged = mergeCoverageRangesPlayer([...parseCoverageRangePairs(prev), [start, end]]);
  rangesRef.current = cap != null ? clipCoverageRangesPlayer(merged, cap) : merged;
}

/** Estimated position while playing when poll/API lags (visibility / pause races). */
function estimatePlayingPosition(prog, fallbackTime = 0, duration = 0) {
  const last = Math.max(0, Number(prog?.lastTime) || 0);
  const fallback = Math.max(0, Number(fallbackTime) || 0);
  let estimated = Math.max(last, fallback);
  // Use lastTickAtMs even after isPlaying was cleared (pause handlers clear the flag first).
  if (Number.isFinite(prog?.lastTickAtMs) && prog.lastTickAtMs > 0) {
    const wallSec = Math.max(0, (Date.now() - prog.lastTickAtMs) / 1000);
    const wallCap = Number.isFinite(duration) && duration > 0 ? duration : 7200;
    estimated = Math.max(estimated, last + Math.min(wallCap, wallSec));
  }
  const cap = Math.max(0, Number(duration) || 0);
  if (cap > 0) estimated = Math.min(cap, estimated);
  return estimated;
}

function wallElapsedSinceTick(prog) {
  if (!Number.isFinite(prog?.lastTickAtMs) || !(prog.lastTickAtMs > 0)) return null;
  return Math.max(0, Date.now() - prog.lastTickAtMs);
}

/** Build PUT payload: watchedSeconds always derived from coverage ranges (single source of truth). */
function buildVideoCoveragePayloadFromRef(rangesRef, lastPosition, durationSeconds, { ended = false } = {}) {
  const dur = roundedVideoDurationSeconds(durationSeconds);
  let ranges =
    dur > 0
      ? clipCoverageRangesPlayer(parseCoverageRangePairs(rangesRef.current), dur)
      : mergeCoverageRangesPlayer(parseCoverageRangePairs(rangesRef.current));
  if (dur > 0) {
    ranges = sealCoverageRangesWhenComplete(ranges, dur);
    if (
      !isTimelineFullyCovered(ranges, dur) &&
      isPlaybackAtVideoEnd(lastPosition, dur, { ended })
    ) {
      ranges = sealCoverageRangesToVideoEnd(ranges, dur);
    }
  }
  rangesRef.current = ranges;
  const covered = dur > 0 ? coverageMeasureSeconds(ranges, dur) : 0;
  const serialized = ranges.map(([s, e]) => [
    Math.round(s * 100) / 100,
    Math.round(e * 100) / 100,
  ]);
  const lastPos = Math.max(0, Math.round(Number(lastPosition) || 0));
  return {
    lastPositionSeconds: dur > 0 ? Math.min(dur, lastPos) : lastPos,
    durationSeconds: dur,
    watchedSeconds: covered,
    watchedCoverageRanges: serialized,
  };
}

/** iPhone, iPod, and iPad (incl. iPadOS desktop UA). */
function isAppleMobileDevice() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return navigator.platform === 'MacIntel' && Number(navigator.maxTouchPoints) > 1;
}

/** Bookmark for resume — prefer live player time over stale snapshot / coverage end. */
function resolveBookmarkLastPositionSeconds(
  currentTimes,
  progLastTimes,
  priorBookmark = 0,
  coverageRanges = []
) {
  const liveCurrent = Math.max(
    0,
    ...(currentTimes || []).map((n) => Number(n)).filter((n) => Number.isFinite(n) && n >= 0)
  );
  if (liveCurrent > 0) return Math.round(liveCurrent);
  const fromProg = Math.max(
    0,
    ...(progLastTimes || []).map((n) => Number(n)).filter((n) => Number.isFinite(n) && n >= 0)
  );
  if (fromProg > 0) return Math.round(fromProg);
  return Math.max(Number(priorBookmark || 0), maxCoverageEndPlayer(coverageRanges || []));
}

/** Best live playhead from mounted players + in-memory prog refs (tab return / background play). */
function readLivePlayerPositionSeconds(
  videoRef,
  youtubePlayerRef,
  spotlightrPlayerRef,
  nativeProg,
  ytProg,
  spotlightrProg
) {
  let current = Math.max(
    0,
    Number(nativeProg?.lastTime || 0),
    Number(ytProg?.lastTime || 0),
    Number(spotlightrProg?.lastTime || 0)
  );
  const nv = videoRef?.current;
  if (nv && Number.isFinite(nv.currentTime) && nv.currentTime > 0) {
    current = Math.max(current, nv.currentTime);
  }
  const yt = youtubePlayerRef?.current;
  if (yt && typeof yt.getCurrentTime === 'function') {
    try {
      current = Math.max(current, Number(yt.getCurrentTime() || 0));
    } catch {
      // ignore YT API errors
    }
  }
  const sp = spotlightrPlayerRef?.current;
  if (sp && typeof sp.getCurrentTime === 'function') {
    try {
      current = Math.max(current, Number(sp.getCurrentTime() || 0));
    } catch {
      // ignore Spotlightr API errors
    }
  }
  return Math.max(0, current);
}

/** Never rewind the playhead when the player is already ahead of a stale saved bookmark. */
function resolveResumeSecondsAgainstLive(bookmarkSeconds, liveSeconds) {
  const bookmark = Math.max(0, Number(bookmarkSeconds) || 0);
  const live = Math.max(0, Number(liveSeconds) || 0);
  if (bookmark <= 0) {
    return { seconds: 0, applied: live <= 0.5 };
  }
  if (live > bookmark + 0.5) {
    return { seconds: Math.round(live), applied: true };
  }
  return { seconds: Math.round(bookmark), applied: false };
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

function mergeServerProgressIntoMap(prev, data) {
  if (!data || typeof data !== 'object') return prev || {};
  const next = { ...(prev || {}) };
  const allowResumeRewind = Boolean(
    next.isCompleted ||
      data.isCompleted ||
      next.isWatched ||
      data.isWatched
  );
  const monotonicKeys = ['watchedSeconds', 'durationSeconds', 'completionPercent'];
  monotonicKeys.forEach((k) => {
    if (data[k] === undefined || data[k] === null) return;
    const incoming = Number(data[k]);
    const existing = Number(next[k] || 0);
    if (Number.isFinite(incoming)) {
      next[k] = Math.max(existing, incoming);
    }
  });
  if (data.lastPositionSeconds !== undefined && data.lastPositionSeconds !== null) {
    const incoming = Number(data.lastPositionSeconds);
    const existing = Number(next.lastPositionSeconds || 0);
    if (Number.isFinite(incoming)) {
      next.lastPositionSeconds =
        allowResumeRewind && incoming > 0 ? incoming : Math.max(existing, incoming);
    }
  }
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
    const dur = Math.max(
      Number(next.durationSeconds || 0),
      Number(data.durationSeconds || 0)
    );
    next.watchedCoverageRanges = mergeCoverageRangesMonotonic(
      next.watchedCoverageRanges,
      data.watchedCoverageRanges,
      dur
    );
  }
  return next;
}

function isServerSectionComplete(data) {
  return Boolean(data?.isCompleted === true || data?.isWatched === true);
}

function lessonHasVideoContent(lesson) {
  if (!lesson) return false;
  return Boolean(String(lesson.videoUrl || '').trim());
}

function mergeProgressForSidebar(lesson, liveById) {
  if (!lesson?.id) return {};
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
  const fromStr = lessonDetectedVideoDurationSeconds(lesson);
  const fromSp = Math.max(
    0,
    Number(merged?.durationSeconds || lesson?.sectionProgress?.durationSeconds || 0)
  );
  const fromPlayback =
    playback && Number.isFinite(playback.durationSec) && playback.durationSec > 0
      ? Math.round(playback.durationSec)
      : 0;

  let total = Math.max(fromStr || 0, fromSp, fromPlayback);

  const catalogDuration = fromStr > 0 ? fromStr : fromSp;
  const coverageEnd = Math.max(0, Number(merged?.watchedSeconds || 0));
  if (
    fromPlayback > 0 &&
    catalogDuration > 0 &&
    fromPlayback < catalogDuration &&
    (catalogDuration - fromPlayback > 120 || fromPlayback < catalogDuration * 0.85)
  ) {
    total = Math.max(fromPlayback, coverageEnd);
  } else if (
    fromPlayback > 0 &&
    catalogDuration > 0 &&
    fromPlayback < catalogDuration &&
    catalogDuration - fromPlayback <= 120 &&
    fromPlayback >= catalogDuration * 0.9
  ) {
    total = fromPlayback;
  }

  const done =
    merged?.isCompleted === true ||
    merged?.isWatched === true ||
    lesson?.sectionProgress?.isCompleted === true ||
    lesson?.sectionProgress?.isWatched === true;

  if (fromStr > 0 && total > fromStr * 1.25) total = fromStr;
  if (done && coverageEnd > 0 && total > coverageEnd + 15) {
    total = Math.max(coverageEnd, fromStr || coverageEnd);
  }
  if (catalogDuration > 0) {
    total = preferCatalogDurationWhenPlayerSkewed(total, catalogDuration);
    if (fromStr > 0) total = fromStr;
  }
  return total;
}

function capProgressDurationForLesson(sectionId, payload, flatLessons, liveById, viewedIds) {
  if (!payload || !sectionId) return payload;
  const lesson = (flatLessons || []).find((l) => l.id === sectionId);
  if (!lesson) return payload;

  const adminDur = lessonFallbackDurationSeconds(lesson, liveById);
  const watched = Math.max(0, Number(payload.watchedSeconds || 0));
  let dur = Math.max(0, Number(payload.durationSeconds || 0));

  if (adminDur > 0) {
    dur = preferCatalogDurationWhenPlayerSkewed(Math.max(dur, adminDur), adminDur);
  }

  const merged = mergeProgressForSidebar(lesson, liveById);
  const done =
    viewedIds?.includes(sectionId) ||
    merged.isCompleted === true ||
    merged.isWatched === true;
  if (done && watched > 0 && dur > watched + 10) {
    dur = Math.max(watched, adminDur > 0 ? adminDur : watched);
  }

  return { ...payload, durationSeconds: Math.round(dur) };
}

/** Client-side lesson % from unique watched coverage (same basis as sidebar). */
function completionPercentFromCoverage(watchedSeconds, durationSeconds) {
  const dur = Math.max(0, Number(durationSeconds) || 0);
  const watched = Math.max(0, Number(watchedSeconds) || 0);
  return coveragePercentDisplay(watched, dur, { isComplete: false });
}

/**
 * Lesson contribution to the top "Course progress" bar.
 *
 * Steps:
 * 1. If lesson is completed (admin % / watchtime threshold met) → count as 100% for this lesson.
 * 2. Else if video lesson → use real watch-coverage % (can grow toward 100% after unlock).
 * 3. Else (text/images/files not done) → 0 (or any server %).
 *
 * Watch-coverage strip still shows unique watched time; sidebar clock shows playback position.
 */
function getLessonCourseProgressPercent(lesson, liveById, viewedIds, playback = null) {
  // Step 1 — completed lesson fully counts toward course progress.
  if (isLessonDoneForUi(lesson, liveById, viewedIds)) return 100;

  const merged = mergeProgressForSidebar(lesson, liveById);
  const fromServer = Number(merged.completionPercent ?? 0);
  const serverPct = Number.isFinite(fromServer) ? Math.max(0, Math.min(100, fromServer)) : 0;

  if (!lesson?.videoUrl) {
    return serverPct;
  }

  // Step 2 — in-progress video: real coverage only.
  const { totalSec, coverageSec } = resolveSidebarVideoProgress(
    lesson,
    liveById,
    playback,
    viewedIds
  );

  const fromCoverage =
    totalSec > 0
      ? coveragePercentDisplay(coverageSec, totalSec, { isComplete: false })
      : coverageSec > 0
        ? 1
        : 0;

  return Math.max(serverPct, fromCoverage);
}

/** Lesson "done" only when the server has confirmed completion (not client % / coverage heuristics). */
function isLessonDoneForUi(lesson, liveById, viewedIds) {
  if (!lesson?.id) return false;
  const merged = mergeProgressForSidebar(lesson, liveById);
  if (merged.isWatched === true || merged.isCompleted === true) return true;
  if (lesson.sectionProgress?.isWatched === true || lesson.sectionProgress?.isCompleted === true) {
    return true;
  }
  if (Array.isArray(viewedIds) && viewedIds.includes(lesson.id)) return true;
  return false;
}

function isSectionLessonComplete(sectionId, flatLessons, liveById, viewedIds) {
  if (!sectionId) return false;
  if (Array.isArray(viewedIds) && viewedIds.includes(sectionId)) return true;
  const lesson = (flatLessons || []).find((l) => l.id === sectionId);
  if (!lesson) return false;
  return isLessonDoneForUi(lesson, liveById, viewedIds);
}

/** Real media length for coverage checks — never treat admin metadata longer than the watched asset. */
function resolveSectionCoverageDurationSeconds(
  sectionId,
  flatLessons,
  liveById,
  payload = null,
  rangePairs = null
) {
  const lesson = (flatLessons || []).find((l) => l.id === sectionId);
  const live = liveById?.[sectionId] || {};
  const adminDur = lesson ? lessonFallbackDurationSeconds(lesson, liveById) : 0;
  const fromProgress = Math.max(
    0,
    Number(payload?.durationSeconds || 0),
    Number(live.durationSeconds || 0)
  );
  const pairs =
    rangePairs ||
    parseCoverageRangePairs(payload?.watchedCoverageRanges || live.watchedCoverageRanges);
  const rangeEnd = maxCoverageEndPlayer(parseCoverageRangePairs(pairs));
  const observed = Math.max(fromProgress, rangeEnd);
  if (adminDur > 0 && observed > 0) {
    return Math.min(adminDur, observed);
  }
  return Math.max(adminDur, observed);
}

/** True only when every second of the timeline is covered — gaps mean the learner may still be re-watching. */
function isSectionVideoFullyWatched(sectionId, flatLessons, liveById, payload = null, ranges = null) {
  if (!sectionId) return false;
  const rangePairs =
    ranges ||
    parseCoverageRangePairs(
      payload?.watchedCoverageRanges || liveById?.[sectionId]?.watchedCoverageRanges
    );
  if (!rangePairs.length) return false;
  const dur = resolveSectionCoverageDurationSeconds(
    sectionId,
    flatLessons,
    liveById,
    payload,
    rangePairs
  );
  if (dur <= 0) return false;

  const clipped =
    dur > 0
      ? clipCoverageRangesPlayer(rangePairs, dur)
      : mergeCoverageRangesPlayer(rangePairs);
  return isTimelineFullyCovered(clipped, dur);
}

function computeResumeSecondsFromProgress(sectionProgressData, snap = null, liveProgress = null) {
  const snapPos = Math.max(0, Number(snap?.lastPositionSeconds || 0));
  const livePos = Math.max(0, Number(liveProgress?.lastPositionSeconds || 0));
  const serverPos = Math.max(0, Number(sectionProgressData?.lastPositionSeconds || 0));
  if (snapPos > 2) return snapPos;
  if (livePos > 2) return livePos;
  if (serverPos > 2) return serverPos;
  const rangeSources = [
    ...parseCoverageRangePairs(sectionProgressData?.watchedCoverageRanges),
    ...parseCoverageRangePairs(snap?.watchedCoverageRanges),
    ...parseCoverageRangePairs(liveProgress?.watchedCoverageRanges),
  ];
  return maxCoverageEndPlayer(rangeSources);
}

function resolveLessonBookmarkSeconds(
  sectionId,
  flatLessons,
  liveById,
  sectionProgressData,
  snap = null,
  liveProgress = null,
  liveCoverageRanges = null
) {
  if (!sectionId) return 0;
  // Always resume from this section's last bookmark — never force 0:00.
  // (Same video URL across sections must not share playhead state.)
  return computeResumeSecondsFromProgress(sectionProgressData, snap, liveProgress);
}

/** @deprecated Same-video sections must always resume from lastPosition — never restart at 0. */
function shouldResumeVideoFromStart() {
  return false;
}

/** Saved coverage from live map + last server fetch (not the in-flight PUT payload). */
function getPersistedVideoCoverageState(sectionId, flatLessons, liveById) {
  const live = liveById?.[sectionId] || {};
  const lesson = (flatLessons || []).find((l) => l.id === sectionId);
  const sp = lesson?.sectionProgress || {};
  const dur = Math.max(
    0,
    Number(live.durationSeconds || 0),
    Number(sp.durationSeconds || 0),
    lesson ? lessonFallbackDurationSeconds(lesson, liveById) : 0
  );
  const rangePairs = parseCoverageRangePairs(
    live.watchedCoverageRanges || sp.watchedCoverageRanges
  );
  return { durationSeconds: dur, watchedCoverageRanges: rangePairs };
}

function persistedVideoCoverageIsFull(sectionId, flatLessons, liveById) {
  const persisted = getPersistedVideoCoverageState(sectionId, flatLessons, liveById);
  if (persisted.durationSeconds <= 0 || !persisted.watchedCoverageRanges.length) return false;
  return isSectionVideoFullyWatched(
    sectionId,
    flatLessons,
    liveById,
    persisted,
    persisted.watchedCoverageRanges
  );
}

/** After 100% coverage is synced to the server: no more timeline PUTs; reopen from the start on return visits. */
function shouldSkipRedundantTimelineSave(sectionId, flatLessons, liveById, payload) {
  const live = liveById?.[sectionId] || {};
  const lesson = (flatLessons || []).find((l) => l.id === sectionId);
  const alreadyComplete =
    live.isCompleted === true ||
    live.isWatched === true ||
    lesson?.sectionProgress?.isCompleted === true;

  const prevPos = Math.max(
    0,
    Number(live.lastPositionSeconds || 0),
    Number(lesson?.sectionProgress?.lastPositionSeconds || 0)
  );
  const nextPos = Math.max(0, Number(payload?.lastPositionSeconds || 0));
  // Always persist playhead moves so each section keeps its own resume point (same video URL OK).
  if (Math.abs(nextPos - prevPos) > 1) {
    return false;
  }

  if (Boolean(payload?.markCompleted)) {
    return alreadyComplete;
  }

  const serverFullyWatched = persistedVideoCoverageIsFull(sectionId, flatLessons, liveById);

  if (isSectionVideoFullyWatched(sectionId, flatLessons, liveById, payload)) {
    return serverFullyWatched;
  }

  const dur = Math.max(
    0,
    Number(payload?.durationSeconds || 0),
    Number(live.durationSeconds || 0),
    lesson ? lessonFallbackDurationSeconds(lesson, liveById) : 0
  );
  const watched = Math.max(
    0,
    Number(payload?.watchedSeconds || 0),
    Number(live.watchedSeconds || 0)
  );
  if (alreadyComplete && dur > 0 && watched >= dur - 1) {
    return serverFullyWatched;
  }

  return false;
}

/** Detected video length from file metadata (`durationTime`) — not custom watchtime or player progress. */
function lessonDetectedVideoDurationSeconds(lesson) {
  if (!lesson) return 0;
  const fromDurationTime = parseWatchtimeToSeconds(String(lesson?.durationTime || '').trim());
  if (fromDurationTime != null && fromDurationTime > 0) return fromDurationTime;
  const fromDuration = parseWatchtimeToSeconds(String(lesson?.duration || '').trim());
  if (fromDuration != null && fromDuration > 0) return fromDuration;
  return 0;
}

/** Known section length for progress display — detected duration first, then saved player progress. */
function lessonFallbackDurationSeconds(lesson, liveById) {
  if (!lesson) return 0;
  const detected = lessonDetectedVideoDurationSeconds(lesson);
  if (detected > 0) return detected;
  const merged = mergeProgressForSidebar(lesson, liveById);
  return Math.max(0, Number(merged.durationSeconds || lesson.sectionProgress?.durationSeconds || 0));
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
  }
  const fallback = Math.max(0, Math.round(Number(fallbackDurationSec) || 0));
  const rawEffective = Math.max(Math.round(durationSec), fallback);
  const effectiveDuration =
    fallback > 0
      ? preferCatalogDurationWhenPlayerSkewed(rawEffective, fallback)
      : rawEffective;
  const clipForCoverage = effectiveDuration > 0 ? effectiveDuration : 0;
  const watchedCoverageSec =
    clipForCoverage > 0
      ? coverageMeasurePlayer(rangesRef?.current, clipForCoverage)
      : coverageMeasurePlayer(rangesRef?.current, 0);
  if (effectiveDuration <= 0 && currentSec <= 0) return null;
  return { currentSec, durationSec: effectiveDuration, watchedCoverageSec };
}

/** Sidebar progress — % from unique watched segments (Udemy-style), not seek position. */
function resolveSidebarVideoProgress(lesson, liveById, playback, viewedIds) {
  const merged = mergeProgressForSidebar(lesson, liveById);
  const totalSec = resolveLessonVideoTotalSeconds(lesson, merged, playback);
  const watchedCoverage = Math.max(0, Number(merged.watchedSeconds || 0));
  const lastPos = Math.max(0, Number(merged.lastPositionSeconds || 0));
  const doneForUi = isLessonDoneForUi(lesson, liveById, viewedIds);

  const liveCurrent =
    playback && Number.isFinite(playback.currentSec) ? Math.max(0, playback.currentSec) : null;
  const liveCoverage =
    playback && Number.isFinite(playback.watchedCoverageSec)
      ? Math.max(0, playback.watchedCoverageSec)
      : 0;
  const coverageSec = Math.max(watchedCoverage, liveCoverage);

  const positionishRaw =
    liveCurrent != null ? liveCurrent : lastPos > 0 ? lastPos : coverageSec;
  const positionish = totalSec > 0 ? Math.min(totalSec, positionishRaw) : positionishRaw;

  return { merged, totalSec, coverageSec, doneForUi, liveCurrent, positionish };
}

/**
 * Sidebar video row: `MM:SS / MM:SS • N%` (no "Duration" label).
 * Left clock = current playback / resume position (matches the video player).
 * Progress % = unique watched seconds / full duration (segment coverage, not seek position).
 */
function getLessonVideoSidebarCaption(lesson, liveById, playback, viewedIds) {
  const { merged, totalSec, coverageSec, doneForUi, liveCurrent, positionish } =
    resolveSidebarVideoProgress(lesson, liveById, playback, viewedIds);

  let pct;
  if (totalSec > 0) {
    // Real watch-range % — completion threshold must not force this to 100.
    pct = coveragePercentDisplay(coverageSec, totalSec, { isComplete: false });
  } else {
    const pctRaw = Number(merged.completionPercent ?? 0);
    pct = Number.isFinite(pctRaw) && pctRaw > 0 ? Math.min(100, Math.round(pctRaw)) : 0;
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

  // Match the player scrubber: show where you are now, not unique coverage length.
  const left = Math.min(totalSec, Math.max(0, positionish));
  const completedMark = doneForUi ? ' ✓' : '';
  return `${formatSecondsToClock(left)} / ${formatSecondsToClock(totalSec)} • ${pct}%${completedMark}`;
}

function getLessonVideoSidebarPercent(lesson, liveById, playback, viewedIds) {
  const { totalSec, coverageSec } = resolveSidebarVideoProgress(
    lesson,
    liveById,
    playback,
    viewedIds
  );

  if (totalSec <= 0) return coverageSec > 0 ? 1 : 0;
  return coveragePercentDisplay(coverageSec, totalSec, { isComplete: false });
}

function getNextLessonFromModules(modules, currentLessonId) {
  const orderedLessons = (modules || []).flatMap((section) =>
    (section.lessons || []).map((lesson) => ({ ...lesson, sectionId: section.id }))
  );
  const currentIndex = orderedLessons.findIndex((lesson) => lesson.id === currentLessonId);
  if (currentIndex < 0 || currentIndex >= orderedLessons.length - 1) return null;
  return orderedLessons[currentIndex + 1];
}

/** Next module after `fromIndex` that has at least one published section/lesson. */
function getNextModuleWithLessons(modules, fromIndex) {
  if (!modules?.length || fromIndex < 0) return null;
  for (let i = fromIndex + 1; i < modules.length; i += 1) {
    if ((modules[i]?.lessons || []).length > 0) return modules[i];
  }
  return null;
}

/** Required seconds for progress: completion % of duration when set; else watchtime capped by duration; else full duration. */
function effectiveRequiredSeconds(watchtimeSec, videoDurationSec, completionPercentage) {
  const duration =
    Number.isFinite(videoDurationSec) && videoDurationSec > 0 ? videoDurationSec : null;
  const pct = Number(completionPercentage);
  if (Number.isFinite(pct) && pct >= 1 && pct <= 100 && duration != null) {
    return Math.max(1, Math.ceil((duration * pct) / 100));
  }
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
      completionPercentage:
        s.completionPercentage != null && s.completionPercentage !== ''
          ? Number(s.completionPercentage)
          : null,
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
/** Course-end pseudo ids — Beginner / Advanced: single quiz + assignment after all modules done. */
const COURSE_END_PRACTICE_ID = '__course_end_quiz__';
const COURSE_END_ASSIGNMENT_ID = '__course_end_assignment__';
const PROGRAM_CPE_SUMMARY_ID = '__program_cpe_summary__';
const PROGRAM_CPE_SECTION_ID = 'section-program-cpe';

function SidebarCompletedChip({ theme }) {
  return (
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
  );
}

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
  // Avoid refetch storms while watching (focus/tab switches) — those 401 windows wipe UI progress.
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  keepPreviousData: true,
  shouldRetryOnError: true,
  errorRetryCount: 3,
  errorRetryInterval: 1500,
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
  const persistVideoBookmarkRef = useRef(() => {});
  const sectionProgressDataRef = useRef(null);
  const captureActiveLessonProgressRef = useRef(() => {});
  /** Seek lock off — learner can jump anywhere on the timeline. */
  const shouldBlockForwardSeekRef = useRef(() => false);
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
    lastTickAtMs: 0,
    markedComplete: false,
  });
  const viewedSectionIdsRef = useRef(viewedSectionIds);
  const courseIdRef = useRef(course?.id || null);
  const flushSectionProgressRef = useRef(() => {});
  /** Real section UUIDs from API — reject stale URL/mock ids before progress PUT. */
  const apiSectionIdsRef = useRef([]);
  const lastProgressPayloadRef = useRef({ key: '', at: 0 });
  const lessonVideoUrlRef = useRef({});
  /** Sections whose video URL changed — block stale progress flush until user plays again. */
  const sectionVideoProgressResetRef = useRef(new Set());
  const lastFlushPayloadRef = useRef({ key: '', at: 0 });
  /** Tracks lesson switches vs in-lesson server echoes (must not reset isPlaying mid-playback). */
  const lastHydratedLessonIdRef = useRef(null);
  const completedSectionIdsRef = useRef(new Set());
  const autoPlayNextRef = useRef(false);
  const autoNextTimerRef = useRef(null);
  // Progress only counts while video is playing
  const youtubeProgressRef = useRef({
    watchedSeconds: 0,
    pendingDeltaSeconds: 0,
    lastTime: 0,
    isPlaying: false,
    lastTickAtMs: 0,
    markedComplete: false,
  });
  const nativeVideoProgressRef = useRef({
    watchedSeconds: 0,
    pendingDeltaSeconds: 0,
    lastTime: 0,
    maxWatchedTimeline: 0,
    isPlaying: false,
    lastTickAtMs: 0,
    markedComplete: false,
  });
  /** Timeline coverage [[start,end],...] — unique seconds watched; repeats don't add length. */
  const videoCoverageRangesRef = useRef([]);
  const fullDurationSyncRef = useRef({ sectionId: null, sent: false });
  /** One PUT when every timeline range is covered but the server still has gaps. */
  const fullCoverageSyncRef = useRef({ sectionId: null, sent: false });
  const imageSectionMarkedRef = useRef(false);
  const resumeSeekAppliedRef = useRef({ sectionId: null, seconds: 0, applied: false });
  /** Prevents re-forcing resume after the first successful apply for this section+src mount. */
  const nativeResumeMountKeyRef = useRef('');
  /** Briefly skip seek rollback while resume / server hydration seeks apply (mobile). */
  const videoSeekClampGraceUntilRef = useRef(0);
  const markVideoSeekClampGrace = useCallback((ms) => {
    const duration = ms ?? (isAppleMobileDevice() ? 5000 : 3500);
    videoSeekClampGraceUntilRef.current = Date.now() + duration;
  }, []);
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
      shouldSkipRedundantTimelineSave(
        sectionId,
        flatLessonsRef.current,
        liveSectionProgressMapRef.current,
        cappedPayload
      )
    ) {
      return Promise.resolve(null);
    }
    if (!force && !isMarkCompletedOnly) {
      const payloadFullyWatched = isSectionVideoFullyWatched(
        sectionId,
        flatLessonsRef.current,
        liveSectionProgressMapRef.current,
        cappedPayload
      );
      const serverFullyWatched = persistedVideoCoverageIsFull(
        sectionId,
        flatLessonsRef.current,
        liveSectionProgressMapRef.current
      );
      if (payloadFullyWatched && serverFullyWatched) {
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
            applyCoverageRangesMonotonic(
              videoCoverageRangesRef,
              data.watchedCoverageRanges,
              dur
            );
          }
          if (isServerSectionComplete(data)) {
            appendViewedSectionId(sectionId);
          }
        }
        return data;
      })
      .catch(() => {
        // Failed PUT is queued in section-progress-save for retry after refresh/online.
        return null;
      });
  }, [appendViewedSectionId]);

  const syncProgressOnFullDuration = useCallback((sectionId, lastPosition, durationSeconds, forceSync = false) => {
    const courseId = courseIdRef.current;
    if (!courseId || !sectionId || sectionId === FEEDBACK_LESSON_ID) return Promise.resolve(null);
    if (!isUuid(sectionId)) return Promise.resolve(null);
    const state = fullDurationSyncRef.current;
    if (state.sectionId !== sectionId) {
      fullDurationSyncRef.current = { sectionId, sent: false };
    }
    if (fullDurationSyncRef.current.sent) return Promise.resolve(null);
    const durRounded = Math.max(0, Math.round(Number(durationSeconds) || 0));
    const covered =
      durRounded > 0
        ? coverageMeasurePlayer(videoCoverageRangesRef.current, durRounded)
        : coverageMeasurePlayer(videoCoverageRangesRef.current, 0);
    const lesson = flatLessonsRef.current.find((l) => l.id === sectionId);
    const required = lesson
      ? effectiveRequiredSeconds(
          parseWatchtimeToSeconds(lesson.watchtime || ''),
          durationSeconds,
          lesson.completionPercentage
        )
      : durRounded;
    const meetsRequirement =
      required > 0 ? covered >= required : durRounded > 0 && covered >= durRounded;
    const payload = {
      ...buildVideoCoveragePayloadFromRef(
        videoCoverageRangesRef,
        Math.max(0, Math.round(Number(lastPosition) || 0)),
        durationSeconds,
        { ended: forceSync }
      ),
      ...(meetsRequirement ? { markCompleted: true } : {}),
    };
    if (
      shouldSkipRedundantTimelineSave(
        sectionId,
        flatLessonsRef.current,
        liveSectionProgressMapRef.current,
        payload
      )
    ) {
      fullDurationSyncRef.current.sent = true;
      return Promise.resolve(null);
    }
    fullDurationSyncRef.current.sent = true;
    return sendProgressUpdate(courseId, sectionId, payload, false, true)
      .then((data) => {
        if (!data || typeof data !== 'object') return data;
        setLiveSectionProgressMap((prev) => ({
          ...prev,
          [sectionId]: mergeServerProgressIntoMap(prev[sectionId], data),
        }));
        return data;
      })
      .catch(() => {
        fullDurationSyncRef.current.sent = false;
        return null;
      });
  }, [sendProgressUpdate]);

  const maybeSyncFullVideoCoverage = useCallback((sectionId, lastPosition, durationSeconds) => {
    const courseId = courseIdRef.current;
    if (!courseId || !sectionId || sectionId === FEEDBACK_LESSON_ID) return Promise.resolve(null);
    if (!isUuid(sectionId)) return Promise.resolve(null);

    if (fullCoverageSyncRef.current.sectionId !== sectionId) {
      fullCoverageSyncRef.current = { sectionId, sent: false };
    }
    if (fullCoverageSyncRef.current.sent) return Promise.resolve(null);

    const payload = buildVideoCoveragePayloadFromRef(
      videoCoverageRangesRef,
      Math.max(0, Math.round(Number(lastPosition) || 0)),
      durationSeconds,
      { ended: true }
    );

    if (
      !isSectionVideoFullyWatched(
        sectionId,
        flatLessonsRef.current,
        liveSectionProgressMapRef.current,
        payload
      )
    ) {
      return Promise.resolve(null);
    }

    if (
      persistedVideoCoverageIsFull(
        sectionId,
        flatLessonsRef.current,
        liveSectionProgressMapRef.current
      )
    ) {
      fullCoverageSyncRef.current.sent = true;
      return Promise.resolve(null);
    }

    fullCoverageSyncRef.current.sent = true;
    return sendProgressUpdate(courseId, sectionId, payload, false, true)
      .then((data) => {
        if (data && typeof data === 'object') {
          setLiveSectionProgressMap((prev) => ({
            ...prev,
            [sectionId]: mergeServerProgressIntoMap(prev[sectionId], data),
          }));
        }
        return data;
      })
      .catch(() => {
        fullCoverageSyncRef.current.sent = false;
        return null;
      });
  }, [sendProgressUpdate]);

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
    shouldBlockForwardSeekRef.current = () => false;

    updateSectionPlayerSnapshotRef.current = (sectionId, data) => {
      if (!sectionId || !isUuid(sectionId)) return;
      const prev = sectionPlayerSnapshotRef.current[sectionId] || {};
      const dur = Math.max(
        Number(prev.durationSeconds || 0),
        Number(data?.durationSeconds || 0)
      );
      const mergedRanges =
        Array.isArray(data?.watchedCoverageRanges) && data.watchedCoverageRanges.length > 0
          ? mergeCoverageRangesMonotonic(
              prev.watchedCoverageRanges,
              data.watchedCoverageRanges,
              dur
            )
          : prev.watchedCoverageRanges;
      sectionPlayerSnapshotRef.current[sectionId] = {
        ...prev,
        ...data,
        lastPositionSeconds:
          data?.lastPositionSeconds != null
            ? Number(data.lastPositionSeconds)
            : Math.max(Number(prev.lastPositionSeconds || 0), 0),
        watchedSeconds: Math.max(
          Number(prev.watchedSeconds || 0),
          Number(data?.watchedSeconds || 0)
        ),
        durationSeconds: dur,
        ...(mergedRanges ? { watchedCoverageRanges: mergedRanges } : {}),
      };
    };

    persistVideoBookmarkRef.current = (sectionId, payload) => {
      if (!sectionId || !isUuid(sectionId) || !payload) return;
      if (
        shouldSkipRedundantTimelineSave(
          sectionId,
          flatLessonsRef.current,
          liveSectionProgressMapRef.current,
          payload
        )
      ) {
        resumeSeekAppliedRef.current = { sectionId, seconds: 0, applied: true };
        return;
      }
      updateSectionPlayerSnapshotRef.current(sectionId, payload);
      setLiveSectionProgressMap((prev) => ({
        ...prev,
        [sectionId]: mergeServerProgressIntoMap(prev[sectionId], payload),
      }));
      const bookmark = Math.max(0, Number(payload.lastPositionSeconds || 0));
      const livePos = readLivePlayerPositionSeconds(
        videoRef,
        youtubePlayerRef,
        spotlightrPlayerRef,
        nativeVideoProgressRef.current,
        youtubeProgressRef.current,
        spotlightrProgressRef.current
      );
      const { seconds: resumeSeconds, applied: liveAhead } = resolveResumeSecondsAgainstLive(
        bookmark,
        livePos
      );
      if (resumeSeconds > 2) {
        resumeSeekAppliedRef.current = {
          sectionId,
          seconds: resumeSeconds,
          applied: liveAhead,
        };
      }
    };

    const captureLessonProgressToLiveMap = (sectionId) => {
      if (!sectionId || !isUuid(sectionId) || sectionId === FEEDBACK_LESSON_ID) return;
      if (videoCoverageLessonIdRef.current !== sectionId) return;

      const spotlightrProg = spotlightrProgressRef.current;
      const nativeVideo = videoRef.current;
      const ytPlayer = youtubePlayerRef.current;
      const ytProg = youtubeProgressRef.current;
      const nativeProg = nativeVideoProgressRef.current;

      let duration = Math.max(
        Number(spotlightrProg?.duration || 0),
        Number(nativeVideo?.duration || 0),
        Number(liveSectionProgressMapRef.current[sectionId]?.durationSeconds || 0)
      );
      if (ytPlayer && typeof ytPlayer.getDuration === 'function') {
        try {
          duration = Math.max(duration, Number(ytPlayer.getDuration() || 0));
        } catch {
          // ignore
        }
      }
      const durRounded = Math.round(duration || 0);

      if (nativeVideo && nativeProg) {
        const wallMs = wallElapsedSinceTick(nativeProg);
        const sliceFrom = Math.max(0, Number(nativeProg.lastTime || 0));
        const current = estimatePlayingPosition(nativeProg, nativeVideo.currentTime, duration);
        if (current > sliceFrom + 0.05) {
          appendCoverageSlicePlayer(
            videoCoverageRangesRef,
            sliceFrom,
            current,
            durRounded,
            false,
            wallMs
          );
          nativeProg.lastTime = current;
        }
      }
      if (ytPlayer && ytProg) {
        try {
          const wallMs = wallElapsedSinceTick(ytProg);
          const sliceFrom = Math.max(0, Number(ytProg.lastTime || 0));
          const ytNow =
            typeof ytPlayer.getCurrentTime === 'function' ? Number(ytPlayer.getCurrentTime() || 0) : 0;
          const current = estimatePlayingPosition(ytProg, ytNow, duration);
          if (current > sliceFrom + 0.05) {
            appendCoverageSlicePlayer(
              videoCoverageRangesRef,
              sliceFrom,
              current,
              durRounded,
              false,
              wallMs
            );
            ytProg.lastTime = current;
          }
        } catch {
          // ignore
        }
      }
      if (spotlightrPlayerRef.current && spotlightrProg) {
        try {
          const wallMs = wallElapsedSinceTick(spotlightrProg);
          const sliceFrom = Math.max(0, Number(spotlightrProg.lastTime || 0));
          const spNow = Number(spotlightrPlayerRef.current.getCurrentTime?.() || spotlightrProg.lastTime || 0);
          const current = estimatePlayingPosition(spotlightrProg, spNow, duration);
          if (current > sliceFrom + 0.05) {
            appendCoverageSlicePlayer(
              videoCoverageRangesRef,
              sliceFrom,
              current,
              durRounded,
              false,
              wallMs
            );
            spotlightrProg.lastTime = current;
          }
        } catch {
          // ignore
        }
      }

      const priorLive = liveSectionProgressMapRef.current[sectionId];
      let ytCurrentTime = 0;
      if (ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
        try {
          ytCurrentTime = Number(ytPlayer.getCurrentTime() || 0);
        } catch {
          // ignore
        }
      }
      let spotlightrCurrentTime = 0;
      if (spotlightrPlayerRef.current && typeof spotlightrPlayerRef.current.getCurrentTime === 'function') {
        try {
          spotlightrCurrentTime = Number(spotlightrPlayerRef.current.getCurrentTime() || 0);
        } catch {
          // ignore
        }
      }
      const lastPosition = resolveBookmarkLastPositionSeconds(
        [nativeVideo?.currentTime, ytCurrentTime, spotlightrCurrentTime],
        [nativeProg?.lastTime, spotlightrProg?.lastTime, ytProg?.lastTime],
        priorLive?.lastPositionSeconds,
        videoCoverageRangesRef.current
      );

      const watchedSeconds =
        durRounded > 0
          ? coverageMeasurePlayer(videoCoverageRangesRef.current, durRounded)
          : 0;
      if (!(lastPosition > 0) && watchedSeconds <= 0) return;

      const watchedCoverageRanges = mergeCoverageRangesPlayer(
        parseCoverageRangePairs(videoCoverageRangesRef.current)
      ).map(([s, e]) => [Math.round(s * 100) / 100, Math.round(e * 100) / 100]);
      const payload = {
        lastPositionSeconds: Math.round(lastPosition),
        durationSeconds: durRounded,
        watchedSeconds,
        watchedCoverageRanges,
        completionPercent: completionPercentFromCoverage(watchedSeconds, durRounded),
      };
      persistVideoBookmarkRef.current(sectionId, payload);
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
      if (sectionVideoProgressResetRef.current.has(sectionId)) {
        return undefined;
      }

      const snapshot = sectionPlayerSnapshotRef.current[sectionId] || null;
      const mountedSectionId = playerFlushSectionIdRef.current || activeLessonIdRef.current;
      const snapshotRangesRef = { current: parseCoverageRangePairs(snapshot?.watchedCoverageRanges) };
      const coverageRef =
        sectionId !== mountedSectionId && snapshotRangesRef.current.length > 0
          ? snapshotRangesRef
          : videoCoverageRangesRef;

      let lastPosition = 0;
      let duration = Math.max(0, Number(snapshot?.durationSeconds || 0));

      const nativeVideo = videoRef.current;
      if (nativeVideo) {
        duration = Math.max(duration, Number(nativeVideo.duration || 0));
      }

      const ytPlayer = youtubePlayerRef.current;
      if (ytPlayer && typeof ytPlayer.getDuration === 'function') {
        try {
          duration = Math.max(duration, Number(ytPlayer.getDuration() || 0));
        } catch {
          // ignore YT runtime errors during unload
        }
      }

      const spotlightrPlayer = spotlightrPlayerRef.current;
      const spotlightrProg = spotlightrProgressRef.current;
      if (spotlightrPlayer && typeof spotlightrPlayer.getDuration === 'function') {
        try {
          duration = Math.max(duration, Number(spotlightrPlayer.getDuration() || 0));
        } catch {
          // ignore Spotlightr runtime errors during unload
        }
      }

      const nativeProg = nativeVideoProgressRef.current;
      const ytProg = youtubeProgressRef.current;
      const priorLive = liveSectionProgressMapRef.current[sectionId];

      if (nativeVideo && nativeProg) {
        const wallMs = wallElapsedSinceTick(nativeProg);
        const sliceFrom = Math.max(0, Number(nativeProg.lastTime || 0));
        const currentNative = estimatePlayingPosition(
          nativeProg,
          nativeVideo.currentTime,
          duration
        );
        if (currentNative > sliceFrom + 0.05) {
          appendCoverageSlicePlayer(
            coverageRef,
            sliceFrom,
            currentNative,
            Math.round(duration || 0),
            false,
            wallMs
          );
          nativeProg.lastTime = currentNative;
          if (nativeProg.isPlaying) nativeProg.lastTickAtMs = Date.now();
          lastPosition = Math.max(lastPosition, currentNative);
        }
      }
      if (ytPlayer && typeof ytPlayer.getCurrentTime === 'function' && ytProg) {
        try {
          const wallMs = wallElapsedSinceTick(ytProg);
          const ytNow = Number(ytPlayer.getCurrentTime() || 0);
          const sliceFrom = Math.max(0, Number(ytProg.lastTime || 0));
          const currentYt = estimatePlayingPosition(ytProg, ytNow, duration);
          if (currentYt > sliceFrom + 0.05) {
            appendCoverageSlicePlayer(
              coverageRef,
              sliceFrom,
              currentYt,
              Math.round(duration || 0),
              false,
              wallMs
            );
            ytProg.lastTime = currentYt;
            if (ytProg.isPlaying) ytProg.lastTickAtMs = Date.now();
            lastPosition = Math.max(lastPosition, currentYt);
          }
        } catch {
          // ignore
        }
      }
      if (spotlightrPlayer && spotlightrProg) {
        try {
          const durRoundedForSlice = Math.round(duration || 0);
          const wallMs = wallElapsedSinceTick(spotlightrProg);
          const sliceFrom = Math.max(0, Number(spotlightrProg.lastTime || 0));
          const currentSpotlightr = estimatePlayingPosition(
            spotlightrProg,
            Number(spotlightrPlayer.getCurrentTime?.() || spotlightrProg.lastTime || 0),
            duration
          );
          if (currentSpotlightr > sliceFrom + 0.05) {
            appendCoverageSlicePlayer(
              coverageRef,
              sliceFrom,
              currentSpotlightr,
              durRoundedForSlice,
              false,
              wallMs
            );
            spotlightrProg.lastTime = currentSpotlightr;
            if (spotlightrProg.isPlaying) spotlightrProg.lastTickAtMs = Date.now();
            lastPosition = Math.max(lastPosition, currentSpotlightr);
          }
        } catch {
          // ignore
        }
      }

      let ytCurrentTime = 0;
      if (ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
        try {
          ytCurrentTime = Number(ytPlayer.getCurrentTime() || 0);
        } catch {
          // ignore
        }
      }
      let spotlightrCurrentTime = 0;
      if (spotlightrPlayer && typeof spotlightrPlayer.getCurrentTime === 'function') {
        try {
          spotlightrCurrentTime = Number(spotlightrPlayer.getCurrentTime() || 0);
        } catch {
          // ignore
        }
      }
      lastPosition = resolveBookmarkLastPositionSeconds(
        [nativeVideo?.currentTime, ytCurrentTime, spotlightrCurrentTime],
        [nativeProg?.lastTime, ytProg?.lastTime, spotlightrProg?.lastTime],
        priorLive?.lastPositionSeconds,
        coverageRef.current
      );

      const durRounded = Math.round(duration || 0);
      let payload = buildVideoCoveragePayloadFromRef(coverageRef, lastPosition, durRounded);
      payload = capProgressDurationForLesson(
        sectionId,
        payload,
        flatLessonsRef.current,
        liveSectionProgressMapRef.current,
        viewedSectionIdsRef.current
      );
      payload = {
        ...payload,
        completionPercent: completionPercentFromCoverage(
          payload.watchedSeconds,
          payload.durationSeconds
        ),
      };
      if (payload.watchedSeconds <= 0 && payload.lastPositionSeconds <= 0) return;

      if (
        shouldSkipRedundantTimelineSave(
          sectionId,
          flatLessonsRef.current,
          liveSectionProgressMapRef.current,
          payload
        )
      ) {
        return undefined;
      }

      const flushKey = [
        sectionId,
        payload.lastPositionSeconds,
        payload.watchedSeconds,
        payload.durationSeconds,
        Array.isArray(payload.watchedCoverageRanges) ? payload.watchedCoverageRanges.length : 0,
      ].join('|');
      const flushNow = Date.now();
      if (
        !force &&
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

      setLiveSectionProgressMap((prev) => ({
        ...prev,
        [sectionId]: mergeServerProgressIntoMap(prev[sectionId], payload),
      }));

      const req = sendProgressUpdate(courseId, sectionId, payload, useKeepalive, force);

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
        // Seal in-flight coverage; video may keep playing in background (free credit allowed).
        flushSectionProgress(true, true);
      } else if (document.visibilityState === 'visible') {
        // Retry any progress that failed while the tab was hidden / token was refreshing.
        void courseService.flushPendingSectionProgress().then((rows) => {
          if (!Array.isArray(rows) || rows.length === 0) return;
          setLiveSectionProgressMap((prev) => {
            const next = { ...prev };
            rows.forEach(({ sectionId, data }) => {
              if (!sectionId || !data) return;
              next[sectionId] = mergeServerProgressIntoMap(next[sectionId], data);
            });
            return next;
          });
        });
        const sectionId = activeLessonIdRef.current;
        if (sectionId && isUuid(sectionId)) {
          captureActiveLessonProgressRef.current?.();
          const livePos = readLivePlayerPositionSeconds(
            videoRef,
            youtubePlayerRef,
            spotlightrPlayerRef,
            nativeVideoProgressRef.current,
            youtubeProgressRef.current,
            spotlightrProgressRef.current
          );
          if (livePos > 2) {
            resumeSeekAppliedRef.current = {
              sectionId,
              seconds: Math.round(livePos),
              applied: true,
            };
          }
        }
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
  const { mutate } = useSWRConfig();
  const programCpeRefreshRef = useRef(null);

  const questionBankSwrKey = course?.id ? ['course-question-bank', course.id] : null;
  const { data: questionBankList = [] } = useSWR(
    questionBankSwrKey,
    () => courseService.getCourseQuestionBank(course.id),
    swrOptions
  );

  const quizAssessmentProgressKey =
    course?.id && authenticated ? ['course-quiz-assessment-progress', course.id] : null;
  const { data: quizAssessmentProgress, mutate: mutateQuizAssessmentProgress } = useSWR(
    quizAssessmentProgressKey,
    () => courseService.getQuizAssessmentProgress(course.id),
    swrOptions
  );

  const [localQuizCompletedKeys, setLocalQuizCompletedKeys] = useState(() => new Set());

  const markLocalQuizCompleted = useCallback(
    (moduleId) => {
      const key = moduleId || '__course_end__';
      setLocalQuizCompletedKeys((prev) => {
        const next = new Set(prev);
        next.add(key);
        return next;
      });
      mutateQuizAssessmentProgress();
    },
    [mutateQuizAssessmentProgress]
  );

  useEffect(() => {
    const scopes = quizAssessmentProgress?.scopes;
    if (!Array.isArray(scopes) || !scopes.length) return;
    setLocalQuizCompletedKeys((prev) => {
      const next = new Set(prev);
      scopes.forEach((scope) => {
        if (!scope?.quizCompleted) return;
        next.add(scope.moduleId || '__course_end__');
      });
      return next;
    });
  }, [quizAssessmentProgress]);

  const quizAssessmentScopeByModuleId = useMemo(() => {
    const map = {};
    (quizAssessmentProgress?.scopes || []).forEach((scope) => {
      if (scope?.moduleId) map[scope.moduleId] = scope;
    });
    return map;
  }, [quizAssessmentProgress]);

  const courseEndQuizAssessmentScope = useMemo(
    () => (quizAssessmentProgress?.scopes || []).find((scope) => !scope?.moduleId) || null,
    [quizAssessmentProgress]
  );

  const hasEarnedCredential = Boolean(quizAssessmentProgress?.hasEarnedCredential);
  const hasCredentialUnlock = Boolean(
    quizAssessmentProgress?.hasCredentialUnlock ?? quizAssessmentProgress?.hasEarnedCredential
  );

  const programCpeSummary = useMemo(() => {
    if (!hasEarnedCredential || !playerContext?.programCpeSummary) return null;
    return playerContext.programCpeSummary;
  }, [hasEarnedCredential, playerContext?.programCpeSummary]);

  useEffect(() => {
    // Only refresh CPE summary after a section is marked complete — not on every progress tick.
    // Mutating player-context while watching caused 401 storms when the access token expired.
    if (!playerKey || !programCpeSummary) return undefined;
    const completedIds = Object.entries(liveSectionProgressMap || {})
      .filter(([, row]) => row?.isCompleted === true || row?.isWatched === true)
      .map(([id]) => id);
    if (completedIds.length === 0) return undefined;

    clearTimeout(programCpeRefreshRef.current);
    programCpeRefreshRef.current = setTimeout(() => {
      mutate(playerKey);
    }, 4000);
    return () => clearTimeout(programCpeRefreshRef.current);
  }, [liveSectionProgressMap, mutate, playerKey, programCpeSummary]);

  const isModuleQuizPerfect = useCallback(
    (moduleId) => {
      if (localQuizCompletedKeys.has(moduleId)) return true;
      return Boolean(quizAssessmentScopeByModuleId[moduleId]?.quizCompleted);
    },
    [localQuizCompletedKeys, quizAssessmentScopeByModuleId]
  );

  const isCourseEndQuizPerfect =
    localQuizCompletedKeys.has('__course_end__') ||
    Boolean(courseEndQuizAssessmentScope?.quizCompleted);

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

  const courseLevel = String(playerContext?.course?.level || course?.level || '').toLowerCase();
  const isCourseEndModel = courseLevel === 'beginner' || courseLevel === 'advanced';
  // Course-level (unlinked) assessments: beginner + intermediate + advanced (Pillar 3)
  const courseEndAssignmentAllowed =
    courseLevel === 'beginner' ||
    courseLevel === 'intermediate' ||
    courseLevel === 'advanced';

  const courseEndQuizCount = useMemo(
    () =>
      isCourseEndModel || courseLevel === 'intermediate'
        ? (questionBankList || []).filter((q) => !q?.moduleId && q.questionType !== 'assignment').length
        : 0,
    [questionBankList, isCourseEndModel, courseLevel]
  );

  const courseEndAssignmentCount = useMemo(
    () =>
      courseEndAssignmentAllowed
        ? (questionBankList || []).filter((q) => !q?.moduleId && q.questionType === 'assignment').length
        : 0,
    [questionBankList, courseEndAssignmentAllowed]
  );

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

  const courseEndQuizQuestions = useMemo(
    () =>
      activeLessonId === COURSE_END_PRACTICE_ID
        ? (questionBankList || []).filter((q) => !q?.moduleId && q.questionType !== 'assignment')
        : [],
    [questionBankList, activeLessonId]
  );

  const courseEndAssignmentQuestions = useMemo(
    () =>
      activeLessonId === COURSE_END_ASSIGNMENT_ID
        ? (questionBankList || []).filter((q) => !q?.moduleId && q.questionType === 'assignment')
        : [],
    [questionBankList, activeLessonId]
  );

  useEffect(() => {
    if (!practiceQuizOn) return;
    if (
      !getModuleIdFromPracticeLessonId(activeLessonId) &&
      activeLessonId !== COURSE_END_PRACTICE_ID
    ) {
      const sec = searchParams.get('section');
      if (sec) setSearchParams({ section: sec }, { replace: true });
    }
  }, [practiceQuizOn, activeLessonId, searchParams, setSearchParams]);

  useEffect(() => {
    setLiveSectionProgressMap({});
    sectionPlayerSnapshotRef.current = {};
    lessonVideoUrlRef.current = {};
    sectionVideoProgressResetRef.current = new Set();
  }, [course?.id]);

  const apiModules = playerContext?.modules || [];
  const lastGoodModulesRef = useRef([]);

  const modules = useMemo(() => {
    const fromApi = getCourseModulesFromApi(apiModules);
    if (fromApi && fromApi.length > 0) {
      lastGoodModulesRef.current = fromApi;
      return fromApi;
    }
    // Keep last good modules during auth refresh / SWR gaps so progress does not flash to 0%.
    if (lastGoodModulesRef.current.length > 0) {
      return lastGoodModulesRef.current;
    }
    return getFallbackModules(playerContext?.course || course);
  }, [apiModules, playerContext?.course, course]);

  useEffect(() => {
    lastGoodModulesRef.current = [];
  }, [course?.id]);

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

  // Admin replaced the video URL — drop stale local minutes/resume for that section only.
  // Do NOT clear when server progress is briefly missing (401 → token refresh → retry). That
  // used to zero the sidebar/coverage until player-context came back.
  useEffect(() => {
    if (!Array.isArray(flatLessons) || flatLessons.length === 0) return;

    const clearedIds = [];

    flatLessons.forEach((lesson) => {
      if (!lesson?.id || !isUuid(lesson.id)) return;

      const nextUrl = String(lesson.videoUrl || '').trim();
      const prevUrl = lessonVideoUrlRef.current[lesson.id];
      const urlChanged = prevUrl !== undefined && prevUrl !== nextUrl;
      lessonVideoUrlRef.current[lesson.id] = nextUrl;

      if (!urlChanged) return;

      clearedIds.push(lesson.id);
      delete sectionPlayerSnapshotRef.current[lesson.id];
      sectionVideoProgressResetRef.current.add(lesson.id);
    });

    if (clearedIds.length === 0) return;

    clearedIds.forEach((id) => {
      if (activeLessonIdRef.current !== id) return;
      resumeSeekAppliedRef.current = { sectionId: id, seconds: 0, applied: false };
      replaceCoverageRangesFromServer(videoCoverageRangesRef, [], 0);
      nativeVideoProgressRef.current.lastTime = 0;
      nativeVideoProgressRef.current.maxWatchedTimeline = 0;
      nativeVideoProgressRef.current.markedComplete = false;
      nativeVideoProgressRef.current.pendingDeltaSeconds = 0;
      nativeVideoProgressRef.current.lastTickAtMs = 0;
      youtubeProgressRef.current.lastTime = 0;
      youtubeProgressRef.current.maxWatchedTimeline = 0;
      youtubeProgressRef.current.markedComplete = false;
      youtubeProgressRef.current.isPlaying = false;
      youtubeProgressRef.current.pendingDeltaSeconds = 0;
      youtubeProgressRef.current.lastTickAtMs = 0;
      spotlightrProgressRef.current.lastTime = 0;
      spotlightrProgressRef.current.maxWatchedTimeline = 0;
      spotlightrProgressRef.current.markedComplete = false;
      spotlightrProgressRef.current.isPlaying = false;
      spotlightrProgressRef.current.watchedSeconds = 0;
      spotlightrProgressRef.current.pendingDeltaSeconds = 0;
      spotlightrProgressRef.current.lastTickAtMs = 0;
    });

    setLiveSectionProgressMap((prev) => {
      const next = { ...prev };
      clearedIds.forEach((id) => {
        delete next[id];
      });
      return next;
    });
    setViewedSectionIds((prev) => {
      const next = prev.filter((id) => !clearedIds.includes(id));
      viewedSectionIdsRef.current = next;
      return next;
    });
  }, [flatLessons]);

  const modulesRef = useRef(modules);
  modulesRef.current = modules;

  const markLessonCompletedOnly = useCallback(
    (lessonId) => {
      if (
        !authenticated ||
        !course?.id ||
        !lessonId ||
        lessonId === FEEDBACK_LESSON_ID ||
        !isUuid(lessonId)
      ) {
        return Promise.resolve(false);
      }
      const lessonRow = flatLessons.find((l) => l.id === lessonId);
      if (lessonRow && isLessonDoneForUi(lessonRow, liveSectionProgressMap, viewedSectionIds)) {
        return Promise.resolve(true);
      }

      return sendProgressUpdate(course.id, lessonId, {
        watchedDeltaSeconds: 1,
        durationSeconds: 1,
        markCompleted: true,
      }).then((data) => isServerSectionComplete(data));
    },
    [
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
    const hasVideo = flatLessons.some((l) => l.id === activeLessonId && lessonHasVideoContent(l));
    if (!hasVideo) return undefined;
    const id = window.setInterval(() => {
      setSidebarPlaybackTick((n) => n + 1);
    }, 250);
    return () => window.clearInterval(id);
  }, [activeLessonId, flatLessons]);

  // Heartbeat: persist coverage every ~50s while playing so a crash/long session
  // does not lose the last stretch. Pause / switch / unload still save immediately.
  // Failed PUTs are queued and retried after token refresh or when the tab is online again.
  const PROGRESS_HEARTBEAT_MS = 50_000;

  useEffect(() => {
    void courseService.flushPendingSectionProgress().then((rows) => {
      if (!Array.isArray(rows) || rows.length === 0) return;
      setLiveSectionProgressMap((prev) => {
        const next = { ...prev };
        rows.forEach(({ sectionId, data }) => {
          if (!sectionId || !data) return;
          next[sectionId] = mergeServerProgressIntoMap(next[sectionId], data);
        });
        return next;
      });
    });
  }, [course?.id]);

  useEffect(() => {
    if (!authenticated || !course?.id) return undefined;
    const id = window.setInterval(() => {
      const playing =
        nativeVideoProgressRef.current.isPlaying ||
        youtubeProgressRef.current.isPlaying ||
        spotlightrProgressRef.current.isPlaying;
      if (!playing) return;
      flushSectionProgressRef.current?.(false, false);
    }, PROGRESS_HEARTBEAT_MS);
    return () => window.clearInterval(id);
  }, [authenticated, course?.id]);

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

  sectionProgressDataRef.current = sectionProgressData;

  const sectionProgressCoverageSig = useMemo(() => {
    if (!sectionProgressData) return '';
    return JSON.stringify([
      sectionProgressData.watchedSeconds,
      sectionProgressData.durationSeconds,
      sectionProgressData.lastPositionSeconds,
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
    fullCoverageSyncRef.current = { sectionId: activeLessonId || null, sent: false };
    imageSectionMarkedRef.current = false;
    // Allow one resume pass for the newly selected section.
    nativeResumeMountKeyRef.current = '';
  }, [activeLessonId]);

  // Save progress only when switching lessons — not when live/server progress updates (avoids flush loops).
  useLayoutEffect(() => {
    const lessonId = activeLessonId;
    if (!lessonId || lessonId === FEEDBACK_LESSON_ID || !isUuid(lessonId)) {
      return undefined;
    }
    return () => {
      flushSectionProgressRef.current?.(false, true, lessonId);
    };
  }, [activeLessonId]);

  // Hydrate before paint so mobile playback is not clamped to 0 before server progress applies.
  useLayoutEffect(() => {
    if (!activeLessonId || activeLessonId === FEEDBACK_LESSON_ID || !isUuid(activeLessonId)) {
      playerFlushSectionIdRef.current = null;
      videoCoverageLessonIdRef.current = null;
      lastHydratedLessonIdRef.current = null;
      return undefined;
    }
    const lesson = flatLessons.find((l) => l.id === activeLessonId);
    if (!lesson) return undefined;
    const lessonChanged = lastHydratedLessonIdRef.current !== activeLessonId;
    lastHydratedLessonIdRef.current = activeLessonId;
    videoCoverageLessonIdRef.current = activeLessonId;
    playerFlushSectionIdRef.current = activeLessonId;
    if (lessonChanged) {
      spotlightrPlayerRef.current = null;
    }
    const sp = sectionProgressData;
    const snap = sectionPlayerSnapshotRef.current[activeLessonId] || null;
    const liveProgress = liveSectionProgressMapRef.current[activeLessonId] || null;
    const watchtimeSec = parseWatchtimeToSeconds(lesson.watchtime || '');
    const d = Math.max(
      Number(sp?.durationSeconds || 0),
      Number(snap?.durationSeconds || 0),
      Number(liveProgress?.durationSeconds || 0),
      watchtimeSec || 0
    );
    const videoUrlResetPending = sectionVideoProgressResetRef.current.has(activeLessonId);
    if (lessonChanged || videoUrlResetPending) {
      if (videoUrlResetPending) {
        sectionVideoProgressResetRef.current.delete(activeLessonId);
      }
      replaceCoverageRangesFromServer(videoCoverageRangesRef, [], d);
      applyCoverageRangesMonotonic(videoCoverageRangesRef, sp?.watchedCoverageRanges, d);
      applyCoverageRangesMonotonic(videoCoverageRangesRef, snap?.watchedCoverageRanges, d);
      applyCoverageRangesMonotonic(videoCoverageRangesRef, liveProgress?.watchedCoverageRanges, d);
    } else {
      // Same lesson mid-playback — merge server echo only; never shrink local coverage.
      applyCoverageRangesMonotonic(videoCoverageRangesRef, sp?.watchedCoverageRanges, d);
      applyCoverageRangesMonotonic(videoCoverageRangesRef, snap?.watchedCoverageRanges, d);
      applyCoverageRangesMonotonic(videoCoverageRangesRef, liveProgress?.watchedCoverageRanges, d);
    }
    const covMax = maxCoverageEndPlayer(videoCoverageRangesRef.current);
    const bookmarkPos = resolveLessonBookmarkSeconds(
      activeLessonId,
      flatLessons,
      liveSectionProgressMap,
      sp,
      snap,
      liveProgress,
      videoCoverageRangesRef.current
    );
    const maxTimeline = Math.max(covMax, bookmarkPos);
    const isAnyPlaying =
      nativeVideoProgressRef.current.isPlaying ||
      youtubeProgressRef.current.isPlaying ||
      spotlightrProgressRef.current.isPlaying;

    if (!lessonChanged) {
      // Same lesson — merge server echo only; never clear isPlaying or rewind lastTime mid-playback.
      nativeVideoProgressRef.current.maxWatchedTimeline = Math.max(
        nativeVideoProgressRef.current.maxWatchedTimeline || 0,
        maxTimeline
      );
      nativeVideoProgressRef.current.lastTime = isAnyPlaying
        ? Math.max(nativeVideoProgressRef.current.lastTime || 0, bookmarkPos)
        : bookmarkPos;
      if (!isAnyPlaying) {
        nativeVideoProgressRef.current.markedComplete =
          Boolean(sp?.isCompleted) || nativeVideoProgressRef.current.markedComplete;
      }
      youtubeProgressRef.current.maxWatchedTimeline = Math.max(
        youtubeProgressRef.current.maxWatchedTimeline || 0,
        maxTimeline
      );
      youtubeProgressRef.current.lastTime = isAnyPlaying
        ? Math.max(youtubeProgressRef.current.lastTime || 0, bookmarkPos)
        : bookmarkPos;
      if (!isAnyPlaying) {
        youtubeProgressRef.current.markedComplete =
          Boolean(sp?.isCompleted || sp?.isWatched) ||
          youtubeProgressRef.current.markedComplete;
      }
      spotlightrProgressRef.current.maxWatchedTimeline = Math.max(
        spotlightrProgressRef.current.maxWatchedTimeline || 0,
        maxTimeline
      );
      spotlightrProgressRef.current.lastTime = isAnyPlaying
        ? Math.max(spotlightrProgressRef.current.lastTime || 0, bookmarkPos)
        : bookmarkPos;
      if (!isAnyPlaying) {
        spotlightrProgressRef.current.markedComplete =
          Boolean(sp?.isCompleted || sp?.isWatched) ||
          spotlightrProgressRef.current.markedComplete;
      }
      const lessonVideoDur = lessonFallbackDurationSeconds(lesson, liveSectionProgressMap);
      spotlightrProgressRef.current.duration = Math.max(
        Number(spotlightrProgressRef.current.duration || 0),
        Number(sp?.durationSeconds || 0),
        Number(snap?.durationSeconds || 0),
        lessonVideoDur || 0
      );
      setSidebarPlaybackTick((n) => n + 1);
      return undefined;
    }

    nativeVideoProgressRef.current.maxWatchedTimeline = maxTimeline;
    nativeVideoProgressRef.current.markedComplete = Boolean(sp?.isCompleted);
    nativeVideoProgressRef.current.lastTime = bookmarkPos;
    nativeVideoProgressRef.current.lastTickAtMs = 0;
    youtubeProgressRef.current.maxWatchedTimeline = maxTimeline;
    youtubeProgressRef.current.markedComplete = Boolean(sp?.isCompleted || sp?.isWatched);
    youtubeProgressRef.current.lastTime = bookmarkPos;
    youtubeProgressRef.current.isPlaying = false;
    youtubeProgressRef.current.lastTickAtMs = 0;
    spotlightrProgressRef.current.maxWatchedTimeline = maxTimeline;
    spotlightrProgressRef.current.markedComplete = Boolean(
      sp?.isCompleted || sp?.isWatched
    );
    spotlightrProgressRef.current.lastTime = bookmarkPos;
    spotlightrProgressRef.current.isPlaying = false;
    spotlightrProgressRef.current.watchedSeconds = 0;
    spotlightrProgressRef.current.pendingDeltaSeconds = 0;
    spotlightrProgressRef.current.lastTickAtMs = 0;
    const lessonVideoDur = lessonFallbackDurationSeconds(lesson, liveSectionProgressMap);
    spotlightrProgressRef.current.duration = Math.max(
      Number(sp?.durationSeconds || 0),
      Number(snap?.durationSeconds || 0),
      lessonVideoDur || 0
    );
    setSidebarPlaybackTick((n) => n + 1);
    return undefined;
  }, [activeLessonId, sectionProgressCoverageSig, flatLessons, markVideoSeekClampGrace]);

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
    const hasVideo = lessonHasVideoContent(lesson);
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

    if (sectionIdFromUrl === PROGRAM_CPE_SUMMARY_ID && playerContext?.programCpeSummary) {
      setExpandedSection(PROGRAM_CPE_SECTION_ID);
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
  }, [modules, course?.id, playerLoading, searchParams, setSearchParams, activeLessonId, playerContext?.programCpeSummary]);

  // Handle default section/lesson selection.
  // If URL section exists, respect it. Otherwise auto-open first available lesson.
  useEffect(() => {
    if (modules.length === 0) return;
    if (activeLessonId === FEEDBACK_LESSON_ID) return;
    if (expandedSection === FEEDBACK_SECTION_ID) return;
    if (expandedSection === PROGRAM_CPE_SECTION_ID) return;

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
  const [spotlightrDirectSrc, setSpotlightrDirectSrc] = useState(null);
  /** HTML5 caption tracks from Spotlightr playerSettings.subtitleTracks (gov hybrid CC). */
  const [spotlightrCaptionTracks, setSpotlightrCaptionTracks] = useState([]);
  /** idle | pending | ready — iframe mounts only after prepare-playback (avoids Spotlightr remount races). */
  const [spotlightrPrepareState, setSpotlightrPrepareState] = useState('idle');

  const sectionVideoUrlForEmbed = activeLesson?.videoUrl?.trim() || null;
  const embedVideoId = sectionVideoUrlForEmbed ? getYouTubeVideoId(sectionVideoUrlForEmbed) : null;
  const spotlightrMeta = useMemo(
    () =>
      sectionVideoUrlForEmbed && !embedVideoId
        ? parseSpotlightrUrl(sectionVideoUrlForEmbed)
        : null,
    [sectionVideoUrlForEmbed, embedVideoId]
  );

  const activeSpotlightrMeta = useMemo(() => {
    if (!spotlightrMeta || spotlightrDirectSrc || spotlightrPrepareState !== 'ready') return null;
    return spotlightrMeta;
  }, [spotlightrMeta, spotlightrDirectSrc, spotlightrPrepareState]);

  const isActiveSpotlightrLesson = Boolean(spotlightrMeta && !embedVideoId);
  const showSpotlightrPrepareSpinner =
    isActiveSpotlightrLesson && spotlightrPrepareState === 'pending';

  // Leave Spotlightr immediately when switching to YouTube/native (avoid stale "pending" blocking YT mount).
  useLayoutEffect(() => {
    if (!isActiveSpotlightrLesson) {
      setSpotlightrDirectSrc(null);
      setSpotlightrCaptionTracks([]);
      setSpotlightrPrepareState('idle');
    }
  }, [isActiveSpotlightrLesson, activeLessonId]);

  // Government hybrid for Spotlightr URLs:
  // - directUrl + captionTracks → native MP4 + HTML5 CC (best: stable progress + accessibility)
  // - otherwise → Spotlightr iframe (CC from Spotlightr player when API has no VTT tracks)
  useEffect(() => {
    setSpotlightrDirectSrc(null);
    setSpotlightrCaptionTracks([]);
    if (!spotlightrMeta?.watchUrl || activeLessonGateBlocked) {
      setSpotlightrPrepareState('idle');
      return undefined;
    }

    setSpotlightrPrepareState('pending');
    let cancelled = false;
    courseService
      .prepareSpotlightrPlayback(spotlightrMeta.watchUrl)
      .then((payload) => {
        if (cancelled) return;
        const direct = String(payload?.directUrl || '').trim();
        const tracks = Array.isArray(payload?.captionTracks)
          ? payload.captionTracks
              .map((row) => ({
                src: String(row?.src || '').trim(),
                language: String(row?.language || 'en').trim() || 'en',
                label: String(row?.label || row?.language || 'English').trim() || 'English',
                isDefault: Boolean(row?.isDefault),
              }))
              .filter((row) => row.src)
          : [];

        // Prefer native only when we can also attach captions (gov accessibility).
        if (direct && tracks.length > 0) {
          setSpotlightrCaptionTracks(tracks);
          setSpotlightrDirectSrc(direct);
          setSpotlightrPrepareState('idle');
          return;
        }

        // No usable VTT from API → Spotlightr iframe keeps CC + progress API.
        setSpotlightrCaptionTracks([]);
        setSpotlightrDirectSrc(null);
        setSpotlightrPrepareState('ready');
      })
      .catch(() => {
        if (!cancelled) {
          setSpotlightrCaptionTracks([]);
          setSpotlightrDirectSrc(null);
          setSpotlightrPrepareState('ready');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    spotlightrMeta?.watchUrl,
    spotlightrMeta?.videoId,
    activeLessonId,
    activeLessonGateBlocked,
  ]);

  // Direct MP4 resume — once per section mount only (do not re-run on progress updates).
  useEffect(() => {
    if (!spotlightrDirectSrc || !activeLessonId || activeLessonGateBlocked) return undefined;
    const snap = sectionPlayerSnapshotRef.current[activeLessonId] || null;
    const live = liveSectionProgressMapRef.current?.[activeLessonId] || null;
    const resumeSeconds = Math.max(
      Number(
        resumeSeekAppliedRef.current.sectionId === activeLessonId
          ? resumeSeekAppliedRef.current.seconds || 0
          : 0
      ),
      resolveLessonBookmarkSeconds(
        activeLessonId,
        flatLessonsRef.current,
        liveSectionProgressMapRef.current,
        sectionProgressDataRef.current,
        snap,
        live
      )
    );

    const mountKey = `${activeLessonId}|${spotlightrDirectSrc}`;
    if (nativeResumeMountKeyRef.current === mountKey) {
      return undefined;
    }

    resumeSeekAppliedRef.current = {
      sectionId: activeLessonId,
      seconds: resumeSeconds > 2 ? Math.round(resumeSeconds) : 0,
      applied: !(resumeSeconds > 2),
    };

    if (!(resumeSeconds > 2)) {
      nativeResumeMountKeyRef.current = mountKey;
      return undefined;
    }

    let cancelled = false;
    let waitId = null;
    let confirmId = null;
    let attempts = 0;

    const finishResume = (pos) => {
      const meta = resumeSeekAppliedRef.current;
      if (meta.sectionId !== activeLessonId) return;
      meta.applied = true;
      meta.seconds = Math.round(Number(pos) || resumeSeconds);
      nativeResumeMountKeyRef.current = mountKey;
      if (confirmId) {
        window.clearInterval(confirmId);
        confirmId = null;
      }
    };

    const applyResume = (el) => {
      if (cancelled || !el) return;
      const meta = resumeSeekAppliedRef.current;
      if (meta.sectionId !== activeLessonId || meta.applied) return;
      try {
        markVideoSeekClampGrace();
        const resumeAt = Math.min(
          resumeSeconds,
          Number.isFinite(el.duration) && el.duration > 0 ? el.duration : resumeSeconds
        );
        if (!(resumeAt > 2)) {
          finishResume(0);
          return;
        }
        const pos = Number(el.currentTime || 0);
        if (Math.abs(pos - resumeAt) <= 1.5) {
          finishResume(pos);
          nativeVideoProgressRef.current.lastTime = Math.round(pos);
          return;
        }
        el.currentTime = resumeAt;
        nativeVideoProgressRef.current.lastTime = resumeAt;
        nativeVideoProgressRef.current.maxWatchedTimeline = Math.max(
          nativeVideoProgressRef.current.maxWatchedTimeline || 0,
          resumeAt
        );
      } catch {
        // ignore
      }
    };

    const tryApply = () => {
      if (cancelled) return;
      const el = videoRef.current;
      if (!el) {
        waitId = window.setTimeout(tryApply, 100);
        return;
      }
      const onReady = () => applyResume(el);
      if (Number.isFinite(el.duration) && el.duration > 0) onReady();
      else {
        el.addEventListener('loadedmetadata', onReady, { once: true });
        el.addEventListener('canplay', onReady, { once: true });
        waitId = window.setTimeout(onReady, 250);
      }
      // Short confirm window only — stop as soon as resume lands or user scrubs away.
      confirmId = window.setInterval(() => {
        if (cancelled) return;
        const v = videoRef.current;
        if (!v) return;
        const meta = resumeSeekAppliedRef.current;
        if (meta.sectionId !== activeLessonId || meta.applied) {
          if (confirmId) {
            window.clearInterval(confirmId);
            confirmId = null;
          }
          return;
        }
        const pos = Number(v.currentTime || 0);
        if (pos >= resumeSeconds - 2) {
          finishResume(pos);
          return;
        }
        attempts += 1;
        if (attempts > 8) {
          // Give up forcing resume so user seeks are never yanked back.
          finishResume(pos);
          return;
        }
        applyResume(v);
      }, 400);
    };

    tryApply();
    return () => {
      cancelled = true;
      if (waitId) window.clearTimeout(waitId);
      if (confirmId) window.clearInterval(confirmId);
    };
  }, [
    spotlightrDirectSrc,
    activeLessonId,
    activeLessonGateBlocked,
    markVideoSeekClampGrace,
  ]);
  const watchtimeSeconds = activeLesson ? parseWatchtimeToSeconds(activeLesson.watchtime) : null;
  const completionPercentage = activeLesson?.completionPercentage ?? null;

  useEffect(() => {
    if (!activeLessonId) return;
    const snap = sectionPlayerSnapshotRef.current?.[activeLessonId] || null;
    const resumeSeconds = resolveLessonBookmarkSeconds(
      activeLessonId,
      flatLessons,
      liveSectionProgressMap,
      sectionProgressData,
      snap,
      liveSectionProgressMap?.[activeLessonId] || null,
      videoCoverageRangesRef.current
    );
    const prev = resumeSeekAppliedRef.current;
    if (prev.sectionId !== activeLessonId) {
      resumeSeekAppliedRef.current = {
        sectionId: activeLessonId,
        seconds: resumeSeconds > 2 ? Math.round(resumeSeconds) : 0,
        applied: false,
      };
      return;
    }
    // Once resume is done (or user scrubbed), never reopen forcing from progress echoes.
    if (prev.applied) return;
    if (resumeSeconds > 2) {
      resumeSeekAppliedRef.current = {
        sectionId: activeLessonId,
        seconds: Math.max(Number(prev.seconds || 0), Math.round(resumeSeconds)),
        applied: false,
      };
    }
  }, [sectionProgressData, activeLessonId, flatLessons, liveSectionProgressMap]);

  // If section progress arrives after player mounted, seek immediately.
  useEffect(() => {
    if (!sectionProgressData || !activeLessonId) return;
    const snap = sectionPlayerSnapshotRef.current?.[activeLessonId] || null;
    const resumeSeconds = resolveLessonBookmarkSeconds(
      activeLessonId,
      flatLessons,
      liveSectionProgressMap,
      sectionProgressData,
      snap,
      liveSectionProgressMap?.[activeLessonId] || null,
      videoCoverageRangesRef.current
    );
    if (!(resumeSeconds > 2)) return;

    const resumeMeta = resumeSeekAppliedRef.current;
    if (resumeMeta.sectionId === activeLessonId && resumeMeta.applied) return;
    if (resumeMeta.sectionId !== activeLessonId) {
      resumeSeekAppliedRef.current = {
        sectionId: activeLessonId,
        seconds: Math.round(resumeSeconds),
        applied: false,
      };
    } else {
      resumeMeta.seconds = Math.max(Number(resumeMeta.seconds || 0), Math.round(resumeSeconds));
    }
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;

    const nativeVideo = videoRef.current;
    if (nativeVideo && (spotlightrDirectSrc || !activeSpotlightrMeta)) {
      const applyNativeResume = () => {
        const el = videoRef.current;
        const meta = resumeSeekAppliedRef.current;
        if (!el || meta.sectionId !== activeLessonId || meta.applied) return;
        if (!(Number.isFinite(el.duration) && el.duration > 0)) return;
        try {
          markVideoSeekClampGrace();
          const resumeAt = Math.min(resumeSeconds, el.duration);
          el.currentTime = resumeAt;
          nativeVideoProgressRef.current.lastTime = resumeAt;
          meta.applied = true;
          meta.seconds = resumeAt;
        } catch {
          // ignore seek errors
        }
      };
      if (Number.isFinite(nativeVideo.duration) && nativeVideo.duration > 0) {
        applyNativeResume();
        if (resumeSeekAppliedRef.current.applied) return;
      } else {
        nativeVideo.addEventListener('loadedmetadata', applyNativeResume, { once: true });
      }
    }

    const ytPlayer = youtubePlayerRef.current;
    if (ytPlayer && typeof ytPlayer.seekTo === 'function') {
      try {
        markVideoSeekClampGrace();
        ytPlayer.seekTo(resumeSeconds, true);
        youtubeProgressRef.current.lastTime = resumeSeconds;
        resumeSeekAppliedRef.current.applied = true;
        resumeSeekAppliedRef.current.seconds = Math.round(resumeSeconds);
        return;
      } catch {
        // ignore seek errors
      }
    }

    // Spotlightr iframe resume is applied in useSpotlightrLessonPlayer.
  }, [
    sectionProgressData,
    activeLessonId,
    flatLessons,
    liveSectionProgressMap,
    markVideoSeekClampGrace,
    spotlightrMeta,
    spotlightrDirectSrc,
  ]);

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
      if (
        shouldSkipRedundantTimelineSave(
          sectionId,
          flatLessonsRef.current,
          liveSectionProgressMapRef.current,
          { ...payload, markCompleted: true }
        )
      ) {
        return;
      }
      sendProgressUpdate(courseId, sectionId, { ...payload, markCompleted: true }).then((data) => {
        if (!isServerSectionComplete(data)) return;
        nativeVideoProgressRef.current.markedComplete = true;
        youtubeProgressRef.current.markedComplete = true;
        spotlightrProgressRef.current.markedComplete = true;
      });
    };
    return () => {
      videoWatchedEnoughRef.current = null;
    };
  }, [course?.id, activeLessonId, sendProgressUpdate]);

  // Tear down Spotlightr DOM before YouTube layout init (Spotlightr hook runs in useEffect — too late).
  useLayoutEffect(() => {
    if (isActiveSpotlightrLesson) return undefined;
    spotlightrPlayerRef.current = null;
    const wrapper = spotlightrContainerRef.current;
    if (wrapper) {
      while (wrapper.firstChild) wrapper.removeChild(wrapper.firstChild);
    }
    return undefined;
  }, [isActiveSpotlightrLesson, activeLessonId]);

  // YouTube: load IFrame API; track progress when watchtime set, or mark complete when video ends (all sections)
  useLayoutEffect(() => {
    if (activeLessonGateBlocked) {
      const p = youtubePlayerRef.current;
      if (p && typeof p.destroy === 'function') {
        try {
          p.destroy();
        } catch {
          // ignore
        }
      }
      youtubePlayerRef.current = null;
      return undefined;
    }
    if (!embedVideoId) {
      const p = youtubePlayerRef.current;
      if (p && typeof p.destroy === 'function') {
        try {
          p.destroy();
        } catch {
          // ignore
        }
      }
      youtubePlayerRef.current = null;
      return undefined;
    }
    let preservedLastTime = resolveLessonBookmarkSeconds(
      activeLessonId,
      flatLessonsRef.current,
      liveSectionProgressMapRef.current,
      sectionProgressDataRef.current,
      sectionPlayerSnapshotRef.current[activeLessonId] || null,
      null,
      videoCoverageRangesRef.current
    );
    const preservedMaxTimeline = Math.max(
      Number(youtubeProgressRef.current.maxWatchedTimeline || 0),
      maxCoverageEndPlayer(videoCoverageRangesRef.current),
      preservedLastTime
    );
    youtubeProgressRef.current = {
      watchedSeconds: youtubeProgressRef.current.watchedSeconds || 0,
      pendingDeltaSeconds: 0,
      lastTime: preservedLastTime,
      maxWatchedTimeline: preservedMaxTimeline,
      isPlaying: false,
      lastTickAtMs: 0,
      markedComplete: youtubeProgressRef.current.markedComplete || false,
    };
    let player = null;
    let intervalId = null;
    let createCancelled = false;
    let createRetryTimer = null;
    let createAttempts = 0;

    const createPlayer = () => {
      if (createCancelled) return;
      const wrapper = youtubeContainerRef.current;
      const iframe = wrapper?.querySelector('iframe[data-yt-lesson-player]');
      if (!iframe) {
        if (createAttempts < 40) {
          createAttempts += 1;
          createRetryTimer = window.setTimeout(createPlayer, 50);
        }
        return;
      }

      const existing = youtubePlayerRef.current;
      if (existing && typeof existing.destroy === 'function') {
        try {
          existing.destroy();
        } catch {
          // ignore teardown errors
        }
      }
      youtubePlayerRef.current = null;

      if (!window.YT || !window.YT.Player) {
        scheduleCreatePlayer();
        return;
      }

      const isCoarsePointer =
        typeof window !== 'undefined' &&
        window.matchMedia('(hover: none) and (pointer: coarse)').matches;
      const youtubePollMs = isCoarsePointer ? 100 : 300;

      const bindEvents = () => ({
        onReady: () => {
          fitYoutubeToFrame();
          const resumeMeta = resumeSeekAppliedRef.current;
          const snap = sectionPlayerSnapshotRef.current[activeLessonId] || null;
          const reopenFromStart = shouldResumeVideoFromStart(
            activeLessonId,
            flatLessonsRef.current,
            liveSectionProgressMapRef.current,
            sectionProgressDataRef.current,
            snap
          );

          if (reopenFromStart && player && typeof player.seekTo === 'function') {
            try {
              markVideoSeekClampGrace();
              player.seekTo(0, true);
              youtubeProgressRef.current.lastTime = 0;
              resumeMeta.sectionId = activeLessonId;
              resumeMeta.seconds = 0;
              resumeMeta.applied = true;
            } catch {
              // ignore seek errors
            }
          } else {
            let resumeAt = 0;
            if (resumeMeta.sectionId === activeLessonId && Number(resumeMeta.seconds || 0) > 2) {
              resumeAt = Number(resumeMeta.seconds);
            } else {
              resumeAt = resolveLessonBookmarkSeconds(
                activeLessonId,
                flatLessonsRef.current,
                liveSectionProgressMapRef.current,
                sectionProgressDataRef.current,
                snap,
                null,
                videoCoverageRangesRef.current
              );
            }
            if (resumeAt > 2 && player && typeof player.seekTo === 'function') {
              const livePos = readLivePlayerPositionSeconds(
                videoRef,
                youtubePlayerRef,
                spotlightrPlayerRef,
                nativeVideoProgressRef.current,
                youtubeProgressRef.current,
                spotlightrProgressRef.current
              );
              const { seconds: effectiveResume, applied: liveAhead } =
                resolveResumeSecondsAgainstLive(resumeAt, livePos);
              if (liveAhead) {
                if (resumeMeta.sectionId === activeLessonId) {
                  resumeMeta.applied = true;
                  resumeMeta.seconds = effectiveResume;
                  youtubeProgressRef.current.lastTime = effectiveResume;
                }
              } else {
                try {
                  markVideoSeekClampGrace();
                  player.seekTo(effectiveResume, true);
                  youtubeProgressRef.current.lastTime = effectiveResume;
                  youtubeProgressRef.current.maxWatchedTimeline = Math.max(
                    youtubeProgressRef.current.maxWatchedTimeline || 0,
                    effectiveResume
                  );
                  if (resumeMeta.sectionId === activeLessonId) {
                    resumeMeta.applied = true;
                    resumeMeta.seconds = effectiveResume;
                  }
                } catch {
                  // ignore seek errors
                }
              }
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
          intervalId = setInterval(() => {
                try {
                  if (!player || !player.getCurrentTime) return;
                  const t = player.getCurrentTime();
                  const d = typeof player.getDuration === 'function' ? player.getDuration() : 0;
                  const requiredSec = effectiveRequiredSeconds(
                    watchtimeSeconds,
                    d,
                    completionPercentage
                  );
                  const prog = youtubeProgressRef.current;
                  const durRounded = Math.round(Number(d) || 0);
                  const previousTime = Math.max(0, Number(prog.lastTime || 0));
                  const wallMs = wallElapsedSinceTick(prog);
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
                    appendCoverageSlicePlayer(
                      videoCoverageRangesRef,
                      previousTime,
                      t,
                      durRounded,
                      false,
                      wallMs
                    );
                    const cov =
                      durRounded > 0
                        ? coverageMeasurePlayer(videoCoverageRangesRef.current, durRounded)
                        : 0;
                    if (durRounded > 0 && cov >= durRounded) {
                      syncProgressOnFullDuration(activeLessonIdRef.current, t, d);
                    }
                    maybeSyncFullVideoCoverage(activeLessonIdRef.current, t, d);
                    prog.watchedSeconds = cov;
                    prog.pendingDeltaSeconds = 0;
                    if (!prog.markedComplete && requiredSec > 0 && cov >= requiredSec) {
                      prog.markedComplete = true;
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
                  if (prog.isPlaying || isForwardStep) prog.lastTickAtMs = Date.now();
                } catch (e) {
                  // ignore
                }
              }, youtubePollMs);
        },
            onStateChange: (e) => {
              const prog = youtubeProgressRef.current;
              if (e.data === 1) {
                prog.isPlaying = true;
                prog.lastTickAtMs = Date.now();
                if (activeLessonIdRef.current) {
                  sectionVideoProgressResetRef.current.delete(activeLessonIdRef.current);
                }
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
                  courseIdRef.current &&
                  activeLessonIdRef.current &&
                  player &&
                  typeof player.getCurrentTime === 'function'
                ) {
                  try {
                    const current = player.getCurrentTime();
                    const d = typeof player.getDuration === 'function' ? player.getDuration() : 0;
                    const durRounded = Math.round(Number(d) || 0);
                    const sliceFrom = Math.max(0, Number(prog.lastTime || 0));
                    const sealed = estimatePlayingPosition(prog, current, d);
                    appendCoverageSlicePlayer(
                      videoCoverageRangesRef,
                      sliceFrom,
                      sealed,
                      durRounded,
                      isPlaybackAtVideoEnd(sealed, d),
                      wallElapsedSinceTick(prog)
                    );
                    prog.lastTime = sealed;
                    prog.lastTickAtMs = 0;
                    const payload = buildVideoCoveragePayloadFromRef(
                      videoCoverageRangesRef,
                      sealed,
                      d,
                      { ended: isPlaybackAtVideoEnd(sealed, d) }
                    );
                    if (durRounded > 0 && payload.watchedSeconds >= durRounded) {
                      syncProgressOnFullDuration(activeLessonIdRef.current, sealed, d);
                    }
                    persistVideoBookmarkRef.current(pauseLessonId, payload);
                    sendProgressUpdate(
                      courseIdRef.current,
                      activeLessonIdRef.current,
                      payload
                    );
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
                    const currentLesson = flatLessonsRef.current.find((l) => l.id === currentId);
                    const fallbackDur = currentLesson
                      ? lessonFallbackDurationSeconds(
                          currentLesson,
                          liveSectionProgressMapRef.current
                        )
                      : 0;
                    const durationForSync = Math.max(Number(d) || 0, Number(fallbackDur) || 0);
                    if (courseIdRef.current && activeLessonIdRef.current) {
                      appendCoverageSlicePlayer(
                        videoCoverageRangesRef,
                        prog.lastTime,
                        t,
                        Math.round(d || 0),
                        true
                      );
                    }
                    const durRounded = Math.round(Number(durationForSync || d) || 0);
                    const maybeAutoNextAfterServer = (confirmed) => {
                      if (!confirmed || !currentId || currentId === FEEDBACK_LESSON_ID) return;
                      const next = getNextLessonFromModules(modulesRef.current, currentId);
                      if (next?.id) startAutoNextCountdown(next);
                    };
                    syncProgressOnFullDuration(
                      activeLessonIdRef.current,
                      durRounded || t,
                      durationForSync,
                      true
                    ).then((data) => {
                      if (!isServerSectionComplete(data)) return;
                      prog.markedComplete = true;
                      if (intervalId) clearInterval(intervalId);
                      intervalId = null;
                      maybeAutoNextAfterServer(true);
                    });
                  } catch {
                    // ignore
                  }
                }
              }
            },
      });

      if (window.YT && window.YT.Player) {
        player = new window.YT.Player(iframe, { events: bindEvents() });
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

    const scheduleCreatePlayer = () => {
      if (createCancelled) return;
      if (window.YT && window.YT.Player) {
        createPlayer();
        return;
      }
      const priorReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof priorReady === 'function') priorReady();
        if (!createCancelled) createPlayer();
      };
      if (!document.getElementById('youtube-iframe-api')) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        tag.id = 'youtube-iframe-api';
        const first = document.getElementsByTagName('script')[0];
        if (first?.parentNode) first.parentNode.insertBefore(tag, first);
      }
    };

    scheduleCreatePlayer();

    window.addEventListener('resize', fitYoutubeToFrame);
    window.addEventListener('orientationchange', fitYoutubeToFrame);
    let ro;
    if (typeof ResizeObserver !== 'undefined' && youtubeContainerRef.current) {
      ro = new ResizeObserver(fitYoutubeToFrame);
      ro.observe(youtubeContainerRef.current);
    }

    return () => {
      createCancelled = true;
      if (createRetryTimer) window.clearTimeout(createRetryTimer);
      window.removeEventListener('resize', fitYoutubeToFrame);
      window.removeEventListener('orientationchange', fitYoutubeToFrame);
      if (ro) ro.disconnect();
      if (intervalId) clearInterval(intervalId);
      // Do not call player.destroy() here — YT API removes the iframe React owns (blank screen).
      youtubePlayerRef.current = null;
    };
  }, [
    embedVideoId,
    watchtimeSeconds,
    completionPercentage,
    activeLessonId,
    activeLessonGateBlocked,
  ]);

  useSpotlightrLessonPlayer({
    spotlightrMeta: activeSpotlightrMeta,
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
    feedbackLessonId: FEEDBACK_LESSON_ID,
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
  });

  const seekActiveLessonTo = useCallback(
    (seconds) => {
      const sec = Math.max(0, Number(seconds) || 0);
      markVideoSeekClampGrace();

      const v = videoRef.current;
      if (v && typeof v.currentTime === 'number') {
        try {
          v.currentTime = sec;
          nativeVideoProgressRef.current.lastTime = sec;
          return;
        } catch {
          // try embed players
        }
      }

      const yt = youtubePlayerRef.current;
      if (yt && typeof yt.seekTo === 'function') {
        try {
          yt.seekTo(sec, true);
          youtubeProgressRef.current.lastTime = sec;
          return;
        } catch {
          // try Spotlightr
        }
      }

      const sp = spotlightrPlayerRef.current;
      if (sp) {
        seekSpotlightrPlayer(sp, sec);
        spotlightrProgressRef.current.lastTime = sec;
      }
    },
    [markVideoSeekClampGrace]
  );

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
      if (!isCourseEndModel && (quizCountByModuleId[module.id] || 0) > 0) {
        steps.push({
          id: `${MODULE_PRACTICE_PREFIX}${module.id}`,
          sectionId: module.id,
          videoUrl: null,
          kind: 'practice',
        });
      }
      if (!isCourseEndModel && (assignmentCountByModuleId[module.id] || 0) > 0) {
        steps.push({
          id: `${MODULE_ASSIGNMENT_PREFIX}${module.id}`,
          sectionId: module.id,
          videoUrl: null,
          kind: 'assignment',
        });
      }
    });
    if (isCourseEndModel && courseEndQuizCount > 0) {
      steps.push({ id: COURSE_END_PRACTICE_ID, sectionId: null, videoUrl: null, kind: 'course-end-practice' });
    }
    if (courseEndAssignmentAllowed && courseEndAssignmentCount > 0) {
      steps.push({ id: COURSE_END_ASSIGNMENT_ID, sectionId: null, videoUrl: null, kind: 'course-end-assignment' });
    }
    return steps;
  }, [
    modules,
    quizCountByModuleId,
    assignmentCountByModuleId,
    isCourseEndModel,
    courseEndQuizCount,
    courseEndAssignmentCount,
    courseEndAssignmentAllowed,
  ]);

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
  // Bottom "Next" follows navigationSteps (may include practice/assignment before the next module).
  // "Next Module" remains a shortcut to the next module's first lesson.
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
    if (activeModuleIndex < 0) return;
    const nextModule = getNextModuleWithLessons(modules, activeModuleIndex);
    const firstLesson = nextModule?.lessons?.[0];
    if (!nextModule || !firstLesson) return;
    autoPlayNextRef.current = Boolean(firstLesson.videoUrl);
    setActiveLessonId(firstLesson.id);
    setExpandedSection(nextModule.id);
    setSearchParams({ section: firstLesson.id }, { replace: true });
  };

  const courseProgressUnits = useMemo(() => {
    const activeVideoLesson =
      activeLessonId &&
      activeLessonId !== FEEDBACK_LESSON_ID &&
      !getModuleIdFromPseudoLessonId(activeLessonId)
        ? flatLessons.find((l) => l.id === activeLessonId && l.videoUrl)
        : null;
    const activePlayback = activeVideoLesson
      ? computeSidebarPlaybackSnapshot(
          videoRef,
          youtubePlayerRef,
          spotlightrPlayerRef,
          videoCoverageRangesRef,
          lessonFallbackDurationSeconds(activeVideoLesson, liveSectionProgressMap),
          spotlightrProgressRef,
          activeVideoLesson.id,
          videoCoverageLessonIdRef
        )
      : null;

    return buildCourseProgressUnits({
      modules,
      quizCountByModuleId,
      assignmentCountByModuleId,
      quizAssessmentScopeByModuleId,
      courseEndQuizAssessmentScope,
      isCourseEndModel,
      courseEndQuizCount,
      courseEndAssignmentCount,
      courseEndAssignmentAllowed,
      isModuleQuizPerfect,
      isCourseEndQuizPerfect,
      getLessonUnitPercent: (lesson) => {
        if (isLessonDoneForUi(lesson, liveSectionProgressMap, viewedSectionIds)) {
          return { percent: 100, isDone: true };
        }
        let playback = null;
        if (activeVideoLesson && lesson.id === activeVideoLesson.id) {
          playback = activePlayback;
        } else if (lesson.videoUrl) {
          const snap = sectionPlayerSnapshotRef.current?.[lesson.id];
          if (snap && (Number(snap.watchedSeconds) > 0 || Number(snap.durationSeconds) > 0)) {
            playback = {
              currentSec: Math.max(0, Number(snap.lastPositionSeconds) || 0),
              durationSec: Math.max(0, Number(snap.durationSeconds) || 0),
              watchedCoverageSec: Math.max(0, Number(snap.watchedSeconds) || 0),
            };
          }
        }
        const percent = getLessonCourseProgressPercent(
          lesson,
          liveSectionProgressMap,
          viewedSectionIds,
          playback
        );
        return { percent, isDone: false };
      },
    });
  }, [
    modules,
    quizCountByModuleId,
    assignmentCountByModuleId,
    quizAssessmentScopeByModuleId,
    courseEndQuizAssessmentScope,
    isCourseEndModel,
    courseEndQuizCount,
    courseEndAssignmentCount,
    courseEndAssignmentAllowed,
    isModuleQuizPerfect,
    isCourseEndQuizPerfect,
    flatLessons,
    liveSectionProgressMap,
    viewedSectionIds,
    activeLessonId,
    sidebarPlaybackTick,
  ]);

  const courseProgressSummary = useMemo(
    () => summarizeProgressUnits(courseProgressUnits),
    [courseProgressUnits]
  );

  const courseOverviewProgressPercent = courseProgressSummary.percent;
  const progressCompletedCount = courseProgressSummary.completed;
  const progressTotalUnits = courseProgressSummary.total;
  const isCourseProgressComplete = courseProgressSummary.isComplete;
  const progressPercent = courseOverviewProgressPercent;

  const pendingPracticeHint = null;

  const moduleProgressById = useMemo(() => {
    const result = {};
    modules.forEach((module) => {
      result[module.id] = getModuleProgressFromUnits(courseProgressUnits, module.id);
    });
    return result;
  }, [modules, courseProgressUnits]);

  const moduleLessonsCompleteById = useMemo(() => {
    const result = {};
    modules.forEach((module) => {
      result[module.id] = areModuleLessonsComplete(courseProgressUnits, module.id);
    });
    return result;
  }, [modules, courseProgressUnits]);

  const allModulesDone = useMemo(
    () =>
      modules.length > 0 &&
      modules.every((mod) => {
        const stats = moduleProgressById[mod.id];
        return stats && stats.total > 0 && stats.completed >= stats.total;
      }),
    [modules, moduleProgressById]
  );

  const isProgramCourse = Boolean(course?.programId || course?.program?.id);

  const hasPillar2ProgrammeQualifyingModule = useMemo(
    () =>
      modules.some((mod) => {
        if (!moduleLessonsCompleteById[mod.id]) return false;
        const quizCount = quizCountByModuleId[mod.id] || 0;
        const assignmentCount = assignmentCountByModuleId[mod.id] || 0;
        if (quizCount === 0 || assignmentCount === 0) return false;
        const scope = quizAssessmentScopeByModuleId[mod.id];
        return Boolean(scope?.quizCompleted && scope?.assignmentCompleted);
      }),
    [
      modules,
      moduleLessonsCompleteById,
      quizCountByModuleId,
      assignmentCountByModuleId,
      quizAssessmentScopeByModuleId,
    ]
  );

  const shouldTryIssueCertificate = isProgramCourse
    ? courseLevel === 'intermediate'
      ? hasPillar2ProgrammeQualifyingModule
      : courseLevel === 'beginner'
        ? allModulesDone && quizAssessmentProgress?.quizAssessmentCompleted
        : false
    : allModulesDone && quizAssessmentProgress?.quizAssessmentCompleted;

  const courseEndLocked =
    isCourseEndModel &&
    !allModulesDone &&
    !hasCredentialUnlock &&
    !UNLOCK_QUIZ_ASSESSMENT_WITHOUT_VIDEO;

  useEffect(() => {
    if (!courseEndLocked) return;
    if (
      activeLessonId !== COURSE_END_PRACTICE_ID &&
      activeLessonId !== COURSE_END_ASSIGNMENT_ID
    ) {
      return;
    }
    toast.info('Complete all modules to unlock the final quiz and assessment');
    const firstLesson = flatLessons[0];
    if (firstLesson?.id) {
      setActiveLessonId(firstLesson.id);
      setSearchParams({ section: firstLesson.id }, { replace: true });
    }
  }, [courseEndLocked, activeLessonId, flatLessons, setSearchParams]);

  const activeModuleAssignmentQuizLocked = Boolean(
    !hasCredentialUnlock &&
      moduleAssignmentModuleId &&
      (quizCountByModuleId[moduleAssignmentModuleId] || 0) > 0 &&
      !isModuleQuizPerfect(moduleAssignmentModuleId)
  );

  const courseEndAssignmentQuizLocked = Boolean(
    !hasCredentialUnlock &&
      activeLessonId === COURSE_END_ASSIGNMENT_ID &&
      courseEndQuizCount > 0 &&
      !isCourseEndQuizPerfect
  );

  useEffect(() => {
    if (!activeModuleAssignmentQuizLocked && !courseEndAssignmentQuizLocked) return;
    toast.info('Score 100% on the quiz before starting the assessment');
    if (activeModuleAssignmentQuizLocked && moduleAssignmentModuleId) {
      const practiceId = `${MODULE_PRACTICE_PREFIX}${moduleAssignmentModuleId}`;
      setActiveLessonId(practiceId);
      setSearchParams({ section: practiceId }, { replace: true });
      return;
    }
    if (courseEndAssignmentQuizLocked) {
      setActiveLessonId(COURSE_END_PRACTICE_ID);
      setSearchParams({ section: COURSE_END_PRACTICE_ID }, { replace: true });
    }
  }, [
    activeModuleAssignmentQuizLocked,
    courseEndAssignmentQuizLocked,
    moduleAssignmentModuleId,
    setSearchParams,
  ]);

  useEffect(() => {
    if (!course?.id || !authenticated || !shouldTryIssueCertificate) return;
    let active = true;
    courseService
      .issueCourseCertificate(course.id)
      .then((result) => {
        if (!active || !result?.issued) return;
        toast.success(
          isProgramCourse
            ? 'Congratulations! Your programme certificate is ready.'
            : 'Congratulations! Your course certificate is ready.'
        );
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [
    course?.id,
    authenticated,
    isProgramCourse,
    shouldTryIssueCertificate,
  ]);

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
  const hasNextModule = activeModuleIndex >= 0 && Boolean(getNextModuleWithLessons(modules, activeModuleIndex));

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
  const sectionVideoUrl =
    sectionVideoUrlForEmbed || activeLesson?.videoUrl?.trim() || null;
  const videoSrc = sectionVideoUrl || null;
  const embedUrl = videoSrc ? getYouTubeEmbedUrl(videoSrc) : null;
  const isSpotlightr = Boolean(spotlightrMeta);
  const playerNativeVideoSrc =
    !embedUrl && !activeSpotlightrMeta && !activeLessonGateBlocked
      ? spotlightrDirectSrc || (!isSpotlightr ? videoSrc : null)
      : null;
  const hasVideo = !!(
    embedUrl ||
    isSpotlightr ||
    spotlightrDirectSrc ||
    lessonHasVideoContent(activeLesson) ||
    (videoSrc && !embedUrl && !isSpotlightr)
  );
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
  const activeLessonVideoDurationSec = activeVideoLessonForSidebar
    ? (() => {
        const catalogDur = lessonFallbackDurationSeconds(
          activeVideoLessonForSidebar,
          liveSectionProgressMap
        );
        if (catalogDur > 0) return catalogDur;
        return Math.max(0, Number(activeLessonSidebarPlayback?.durationSec || 0));
      })()
    : 0;
  const activeLessonCoverageRanges = (() => {
    if (!activeVideoLessonForSidebar) return [];
    const lessonId = activeVideoLessonForSidebar.id;
    if (videoCoverageLessonIdRef.current === lessonId) {
      return parseCoverageRangePairs(videoCoverageRangesRef.current);
    }
    const live = liveSectionProgressMap[lessonId];
    const sp = activeVideoLessonForSidebar.sectionProgress;
    if (Array.isArray(live?.watchedCoverageRanges) && live.watchedCoverageRanges.length > 0) {
      return parseCoverageRangePairs(live.watchedCoverageRanges);
    }
    if (Array.isArray(sp?.watchedCoverageRanges) && sp.watchedCoverageRanges.length > 0) {
      return parseCoverageRangePairs(sp.watchedCoverageRanges);
    }
    return [];
  })();
  const activeLessonVideoCurrentSec = activeLessonSidebarPlayback?.currentSec ?? null;
  const activeLessonVideoRequiredSec = activeVideoLessonForSidebar
    ? effectiveRequiredSeconds(
        parseWatchtimeToSeconds(activeVideoLessonForSidebar.watchtime || ''),
        activeLessonVideoDurationSec,
        activeVideoLessonForSidebar.completionPercentage
      )
    : 0;
  const activeLessonVideoDone = activeVideoLessonForSidebar
    ? isLessonDoneForUi(activeVideoLessonForSidebar, liveSectionProgressMap, viewedSectionIds)
    : false;

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
        minWidth: 0,
        overflow: 'hidden',
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
        {progressTotalUnits > 0 && (
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
                    {Math.min(100, Math.round(courseOverviewProgressPercent))}%
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
                    {progressCompletedCount}/{progressTotalUnits}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: theme.typography.pxToRem(10) }}>
                    completed
                  </Typography>
                </Box>
              </Stack>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: pendingPracticeHint ? 0.5 : 1.25, fontWeight: 500 }}>
                {progressCompletedCount > 0 || currentStepIndex >= 0
                  ? `Current: item ${Math.max(1, currentStepIndex + 1)} of ${progressTotalUnits}`
                  : `Select an item to begin (${progressTotalUnits} total · sessions, quiz & assessment)`}
              </Typography>
              {pendingPracticeHint ? (
                <Typography variant="caption" sx={{ color: 'warning.dark', display: 'block', mb: 1.25, fontWeight: 600 }}>
                  {pendingPracticeHint}
                </Typography>
              ) : null}
              <LinearProgress
                variant="determinate"
                value={Math.min(100, courseOverviewProgressPercent)}
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
            mx: { xs: 1.5, sm: 2.5 },
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
                {progressTotalUnits} item{progressTotalUnits !== 1 ? 's' : ''} · sections, quiz & assessment
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
          {modules.map((section) => {
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
                  mx: { xs: 1.5, sm: 2.5 },
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
                    px: { xs: 1, sm: 1.25 },
                    py: 0.25,
                    borderLeft: `4px solid ${
                      sectionHasActiveLesson ? sidebarAccent : alpha(theme.palette.grey[500], 0.25)
                    }`,
                    '& .MuiAccordionSummary-content': {
                      my: 1,
                      alignItems: 'center',
                      minWidth: 0,
                      overflow: 'hidden',
                    },
                    '& .MuiAccordionSummary-expandIconWrapper': {
                      flexShrink: 0,
                      ml: 0.25,
                    },
                    '&:hover': { bgcolor: alpha(theme.palette.grey[500], 0.04) },
                    ...(sectionHasActiveLesson && {
                      bgcolor: alpha(sidebarAccent, 0.06),
                      '& .MuiAccordionSummary-expandIconWrapper': { color: 'primary.main' },
                    }),
                  }}
                >
                  <Box
                    sx={{
                      width: 1,
                      minWidth: 0,
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr) auto',
                      columnGap: 1,
                      rowGap: 0.5,
                      alignItems: 'center',
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 700,
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: { xs: 2, sm: 1 },
                        WebkitBoxOrient: 'vertical',
                        lineHeight: 1.35,
                      }}
                    >
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
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {sectionStats.completed}/{sectionStats.total}
                    </Typography>
                    {sectionStats.total > 0 && (
                      <LinearProgress
                        variant="determinate"
                        value={sectionStats.percent}
                        sx={{
                          gridColumn: '1 / -1',
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
                    px: { xs: 1, sm: 1.5 },
                    minWidth: 0,
                    overflow: 'hidden',
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
                                  controlsList="nodownload"
                                  disablePictureInPicture
                                  onContextMenu={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                  }}
                                  onDragStart={(event) => event.preventDefault()}
                                  sx={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    WebkitUserSelect: 'none',
                                    userSelect: 'none',
                                    WebkitTouchCallout: 'none',
                                  }}
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
                            <Stack spacing={0.25} sx={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 600,
                                  minWidth: 0,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  lineHeight: 1.35,
                                }}
                              >
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
                      if (isCourseEndModel) return null;
                      const modPracticeCount = quizCountByModuleId[section.id] || 0;
                      if (modPracticeCount === 0) return null;
                      const isQuizCompleted = isModuleQuizPerfect(section.id);
                      const moduleLessonsDone = Boolean(moduleLessonsCompleteById[section.id]);
                      const moduleQuizAccessible =
                        UNLOCK_QUIZ_ASSESSMENT_WITHOUT_VIDEO ||
                        hasCredentialUnlock ||
                        isQuizCompleted ||
                        moduleLessonsDone;
                      const practiceUnlockedStyle = moduleQuizAccessible;
                      return (
                        <Tooltip
                          title={
                            moduleQuizAccessible
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
                              if (!moduleQuizAccessible) {
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
                              cursor: moduleQuizAccessible ? 'pointer' : 'not-allowed',
                              opacity: moduleQuizAccessible ? 1 : 0.55,
                              bgcolor:
                                moduleQuizAccessible && activeLessonId === modulePracticeRowId
                                  ? alpha(sidebarAccent, 0.1)
                                  : practiceUnlockedStyle
                                    ? alpha(theme.palette.info.main, 0.06)
                                    : alpha(theme.palette.grey[500], 0.04),
                              border: `1px solid ${
                                moduleQuizAccessible && activeLessonId === modulePracticeRowId
                                  ? alpha(sidebarAccent, 0.4)
                                  : practiceUnlockedStyle
                                    ? alpha(theme.palette.info.main, 0.25)
                                    : sidebarMutedBorder
                              }`,
                              boxShadow: `0 1px 2px ${alpha(theme.palette.common.black, 0.04)}`,
                              color:
                                moduleQuizAccessible && activeLessonId === modulePracticeRowId
                                  ? 'primary.dark'
                                  : practiceUnlockedStyle
                                    ? 'info.dark'
                                    : 'text.primary',
                              '&:hover': {
                                bgcolor: moduleQuizAccessible
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
                                    moduleQuizAccessible && activeLessonId === modulePracticeRowId
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
                              {isQuizCompleted ? <SidebarCompletedChip theme={theme} /> : null}
                              {!moduleQuizAccessible && !isQuizCompleted ? (
                                <Iconify
                                  icon="solar:lock-keyhole-bold"
                                  width={14}
                                  sx={{ color: 'text.disabled', flexShrink: 0 }}
                                />
                              ) : null}
                            </Stack>
                          </Stack>
                        </Tooltip>
                      );
                    })()}

                    {(() => {
                      if (isCourseEndModel) return null;
                      const modAssignmentCount = assignmentCountByModuleId[section.id] || 0;
                      if (modAssignmentCount === 0) return null;
                      const modQuizCount = quizCountByModuleId[section.id] || 0;
                      const isQuizCompleted = isModuleQuizPerfect(section.id);
                      const isAssignmentCompleted = Boolean(
                        quizAssessmentScopeByModuleId[section.id]?.assignmentCompleted
                      );
                      const moduleLessonsDone = Boolean(moduleLessonsCompleteById[section.id]);
                      const moduleVideosDone =
                        UNLOCK_QUIZ_ASSESSMENT_WITHOUT_VIDEO ||
                        hasCredentialUnlock ||
                        isQuizCompleted ||
                        isAssignmentCompleted ||
                        moduleLessonsDone;
                      const moduleQuizPassed =
                        modQuizCount === 0 || isModuleQuizPerfect(section.id);
                      const assessmentUnlocked =
                        hasCredentialUnlock ||
                        isAssignmentCompleted ||
                        (modQuizCount > 0 ? moduleQuizPassed || isQuizCompleted : moduleVideosDone);
                      const assignmentTooltip =
                        modQuizCount > 0 && !moduleQuizPassed && !isQuizCompleted
                          ? 'Score 100% on the quiz to unlock assessment'
                          : modQuizCount === 0 && !moduleVideosDone
                            ? 'Complete every lesson in this module to unlock assessment'
                            : `Open assessment (${modAssignmentCount} item${modAssignmentCount !== 1 ? 's' : ''})`;
                      const assignmentUnlockedStyle = assessmentUnlocked;
                      return (
                        <Tooltip
                          title={assignmentTooltip}
                          placement="left"
                          arrow
                        >
                          <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="flex-start"
                            onClick={() => {
                              if (modQuizCount > 0 && !moduleQuizPassed && !isQuizCompleted) {
                                toast.info('Score 100% on the quiz before starting the assessment');
                                return;
                              }
                              if (modQuizCount === 0 && !moduleVideosDone) {
                                toast.info(
                                  'Complete every lesson in this module to unlock assessment'
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
                              cursor: assessmentUnlocked ? 'pointer' : 'not-allowed',
                              opacity: assessmentUnlocked ? 1 : 0.55,
                              bgcolor:
                                assessmentUnlocked && activeLessonId === moduleAssignmentRowId
                                  ? alpha(sidebarAccent, 0.1)
                                  : assignmentUnlockedStyle
                                    ? alpha(theme.palette.warning.main, 0.06)
                                    : alpha(theme.palette.grey[500], 0.04),
                              border: `1px solid ${
                                assessmentUnlocked && activeLessonId === moduleAssignmentRowId
                                  ? alpha(sidebarAccent, 0.4)
                                  : assignmentUnlockedStyle
                                    ? alpha(theme.palette.warning.main, 0.25)
                                    : sidebarMutedBorder
                              }`,
                              boxShadow: `0 1px 2px ${alpha(theme.palette.common.black, 0.04)}`,
                              color:
                                assessmentUnlocked && activeLessonId === moduleAssignmentRowId
                                  ? 'primary.dark'
                                  : assignmentUnlockedStyle
                                    ? 'warning.dark'
                                    : 'text.primary',
                              '&:hover': {
                                bgcolor: assessmentUnlocked
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
                                    assessmentUnlocked && activeLessonId === moduleAssignmentRowId
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
                                  Assessment
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{ color: 'warning.dark', fontWeight: 700 }}
                                  noWrap
                                >
                                  {modAssignmentCount} item{modAssignmentCount !== 1 ? 's' : ''}
                                </Typography>
                              </Stack>
                              {isAssignmentCompleted ? <SidebarCompletedChip theme={theme} /> : null}
                              {!assessmentUnlocked && !isAssignmentCompleted ? (
                                <Iconify
                                  icon="solar:lock-keyhole-bold"
                                  width={14}
                                  sx={{ color: 'text.disabled', flexShrink: 0 }}
                                />
                              ) : null}
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

        {isCourseEndModel && (courseEndQuizCount > 0 || courseEndAssignmentCount > 0) && (
          <Box sx={{ mt: 1.5, px: 1.5, pb: 1 }}>
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 0.06, textTransform: 'uppercase', px: 0.5 }}
            >
              End of Course
            </Typography>
            <Stack spacing={1} sx={{ mt: 1 }}>
              {courseEndQuizCount > 0 && (() => {
                const unlocked =
                  allModulesDone || hasCredentialUnlock || UNLOCK_QUIZ_ASSESSMENT_WITHOUT_VIDEO;
                const isFinalQuizCompleted = isCourseEndQuizPerfect;
                return (
                  <Tooltip
                    key="course-end-quiz"
                    title={unlocked ? `Open final quiz (${courseEndQuizCount} question${courseEndQuizCount !== 1 ? 's' : ''})` : 'Complete all modules to unlock the final quiz'}
                    placement="left"
                    arrow
                  >
                    <Stack
                      direction="row"
                      alignItems="center"
                      onClick={() => {
                        if (!unlocked) { toast.info('Complete all modules to unlock the final quiz'); return; }
                        setActiveLessonId(COURSE_END_PRACTICE_ID);
                        setSidebarOpen(false);
                        setSearchParams({ section: COURSE_END_PRACTICE_ID }, { replace: true });
                      }}
                      sx={{
                        py: 1.35, px: 1.5, borderRadius: 1.5,
                        cursor: unlocked ? 'pointer' : 'not-allowed',
                        opacity: unlocked ? 1 : 0.55,
                        bgcolor: unlocked && activeLessonId === COURSE_END_PRACTICE_ID ? alpha(sidebarAccent, 0.1) : unlocked ? alpha(theme.palette.info.main, 0.06) : alpha(theme.palette.grey[500], 0.04),
                        border: `1px solid ${unlocked && activeLessonId === COURSE_END_PRACTICE_ID ? alpha(sidebarAccent, 0.4) : unlocked ? alpha(theme.palette.info.main, 0.25) : sidebarMutedBorder}`,
                        color: unlocked && activeLessonId === COURSE_END_PRACTICE_ID ? 'primary.dark' : unlocked ? 'info.dark' : 'text.primary',
                        '&:hover': { bgcolor: unlocked ? activeLessonId === COURSE_END_PRACTICE_ID ? alpha(sidebarAccent, 0.14) : alpha(theme.palette.info.main, 0.1) : alpha(theme.palette.grey[500], 0.06) },
                      }}
                    >
                      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0, flex: 1 }}>
                        <Box sx={{ width: 64, height: 40, borderRadius: 1, overflow: 'hidden', bgcolor: alpha(theme.palette.info.dark, 0.85), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Iconify icon="solar:clipboard-list-bold" width={22} sx={{ color: 'common.white' }} />
                        </Box>
                        <Stack spacing={0.25} sx={{ minWidth: 0, flex: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>Final Quiz</Typography>
                          <Typography variant="caption" sx={{ color: 'info.dark', fontWeight: 700 }} noWrap>{courseEndQuizCount} question{courseEndQuizCount !== 1 ? 's' : ''}</Typography>
                        </Stack>
                        {isFinalQuizCompleted ? <SidebarCompletedChip theme={theme} /> : null}
                        {!unlocked && !isFinalQuizCompleted ? <Iconify icon="solar:lock-keyhole-bold" width={14} sx={{ color: 'text.disabled', flexShrink: 0 }} /> : null}
                      </Stack>
                    </Stack>
                  </Tooltip>
                );
              })()}
              {courseEndAssignmentCount > 0 && (() => {
                const modulesUnlocked =
                  allModulesDone || hasCredentialUnlock || UNLOCK_QUIZ_ASSESSMENT_WITHOUT_VIDEO;
                const unlocked =
                  courseEndQuizCount > 0 ? isCourseEndQuizPerfect : modulesUnlocked;
                const isFinalAssignmentCompleted = Boolean(
                  courseEndQuizAssessmentScope?.assignmentCompleted
                );
                const assignmentTooltip =
                  courseEndQuizCount > 0 && !isCourseEndQuizPerfect
                    ? 'Score 100% on the final quiz to unlock the final assessment'
                    : courseEndQuizCount === 0 && !modulesUnlocked
                      ? 'Complete all modules to unlock the final assessment'
                      : `Open final assessment (${courseEndAssignmentCount} item${courseEndAssignmentCount !== 1 ? 's' : ''})`;
                return (
                  <Tooltip
                    key="course-end-assignment"
                    title={assignmentTooltip}
                    placement="left"
                    arrow
                  >
                    <Stack
                      direction="row"
                      alignItems="center"
                      onClick={() => {
                        if (courseEndQuizCount > 0 && !isCourseEndQuizPerfect) {
                          toast.info('Score 100% on the final quiz before starting the final assessment');
                          return;
                        }
                        if (courseEndQuizCount === 0 && !modulesUnlocked) {
                          toast.info('Complete all modules to unlock the final assessment');
                          return;
                        }
                        setActiveLessonId(COURSE_END_ASSIGNMENT_ID);
                        setSidebarOpen(false);
                        setSearchParams({ section: COURSE_END_ASSIGNMENT_ID }, { replace: true });
                      }}
                      sx={{
                        py: 1.35, px: 1.5, borderRadius: 1.5,
                        cursor: unlocked ? 'pointer' : 'not-allowed',
                        opacity: unlocked ? 1 : 0.55,
                        bgcolor: unlocked && activeLessonId === COURSE_END_ASSIGNMENT_ID ? alpha(sidebarAccent, 0.1) : unlocked ? alpha(theme.palette.warning.main, 0.06) : alpha(theme.palette.grey[500], 0.04),
                        border: `1px solid ${unlocked && activeLessonId === COURSE_END_ASSIGNMENT_ID ? alpha(sidebarAccent, 0.4) : unlocked ? alpha(theme.palette.warning.main, 0.25) : sidebarMutedBorder}`,
                        color: unlocked && activeLessonId === COURSE_END_ASSIGNMENT_ID ? 'primary.dark' : unlocked ? 'warning.dark' : 'text.primary',
                        '&:hover': { bgcolor: unlocked ? activeLessonId === COURSE_END_ASSIGNMENT_ID ? alpha(sidebarAccent, 0.14) : alpha(theme.palette.warning.main, 0.1) : alpha(theme.palette.grey[500], 0.06) },
                      }}
                    >
                      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0, flex: 1 }}>
                        <Box sx={{ width: 64, height: 40, borderRadius: 1, overflow: 'hidden', bgcolor: alpha(theme.palette.warning.dark, 0.85), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Iconify icon="solar:document-add-bold" width={22} sx={{ color: 'common.white' }} />
                        </Box>
                        <Stack spacing={0.25} sx={{ minWidth: 0, flex: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>Final Assessment</Typography>
                          <Typography variant="caption" sx={{ color: 'warning.dark', fontWeight: 700 }} noWrap>{courseEndAssignmentCount} item{courseEndAssignmentCount !== 1 ? 's' : ''}</Typography>
                        </Stack>
                        {isFinalAssignmentCompleted ? <SidebarCompletedChip theme={theme} /> : null}
                        {!unlocked && !isFinalAssignmentCompleted ? <Iconify icon="solar:lock-keyhole-bold" width={14} sx={{ color: 'text.disabled', flexShrink: 0 }} /> : null}
                      </Stack>
                    </Stack>
                  </Tooltip>
                );
              })()}
            </Stack>
          </Box>
        )}

        </>
      )}

      {programCpeSummary ? (
        <Accordion
          expanded={expandedSection === PROGRAM_CPE_SECTION_ID}
          onChange={() => {
            const next =
              expandedSection === PROGRAM_CPE_SECTION_ID ? '' : PROGRAM_CPE_SECTION_ID;
            setExpandedSection(next);
            if (next === PROGRAM_CPE_SECTION_ID) {
              setSearchParams({ section: PROGRAM_CPE_SUMMARY_ID }, { replace: true });
            }
          }}
          disableGutters
          elevation={0}
          sx={{
            mx: { xs: 1.5, sm: 2.5 },
            mb: 1,
            mt: 0.5,
            borderRadius: 2.5,
            overflow: 'hidden',
            bgcolor: 'background.paper',
            border: playerCardBorder,
            boxShadow: playerElevatedShadow,
            '&:before': { display: 'none' },
          }}
        >
          <AccordionSummary
            expandIcon={<Iconify icon="eva:chevron-down-fill" width={20} sx={{ color: 'text.secondary' }} />}
            sx={{
              minHeight: 52,
              px: { xs: 1, sm: 1.25 },
              borderLeft: `4px solid ${alpha(theme.palette.success.main, 0.9)}`,
              '& .MuiAccordionSummary-content': { my: 1.25, minWidth: 0, overflow: 'hidden' },
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
                  bgcolor: alpha(theme.palette.success.main, 0.12),
                  color: 'success.dark',
                  border: `1px solid ${alpha(theme.palette.success.main, 0.25)}`,
                }}
              >
                <Iconify icon="solar:clock-circle-bold" width={20} />
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, letterSpacing: -0.01 }}>
                  Programme CPE summary
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  {Number(programCpeSummary.totalEarnedCpeHours ?? programCpeSummary.totalCpeHours ?? 0)}{' '}
                  CPE Hour
                  {Number(programCpeSummary.totalEarnedCpeHours ?? programCpeSummary.totalCpeHours ?? 0) === 1
                    ? ''
                    : 's'}{' '}
                  earned · {programCpeSummary.totalWatchedTime || '0:00'} watched
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
            <Box
              sx={{
                bgcolor: 'background.paper',
                boxShadow: `0 2px 8px ${alpha(theme.palette.common.black, 0.06)}`,
                p: 2,
                border: `1px solid ${sidebarMutedBorder}`,
                borderRadius: 1.5,
              }}
            >
              <ProgramCpeSummaryPanel summary={programCpeSummary} compact />
            </Box>
          </AccordionDetails>
        </Accordion>
      ) : null}

      {/* Feedback — same visual language as modules */}
      <Accordion
        expanded={expandedSection === FEEDBACK_SECTION_ID}
        onChange={() => {
          setExpandedSection(expandedSection === FEEDBACK_SECTION_ID ? '' : FEEDBACK_SECTION_ID);
        }}
        disableGutters
        elevation={0}
        sx={{
          mx: { xs: 1.5, sm: 2.5 },
          mb: 2.5,
          mt: 0.5,
          borderRadius: 2.5,
          overflow: 'hidden',
          bgcolor: 'background.paper',
          border: playerCardBorder,
          boxShadow: playerElevatedShadow,
          '&:before': { display: 'none' },
          ...(progressTotalUnits > 0 && !isCourseProgressComplete && { opacity: 0.92 }),
        }}
      >
        <AccordionSummary
          expandIcon={<Iconify icon="eva:chevron-down-fill" width={20} sx={{ color: 'text.secondary' }} />}
          sx={{
            minHeight: 52,
            px: { xs: 1, sm: 1.25 },
            borderLeft: `4px solid ${alpha(theme.palette.warning.main, isCourseProgressComplete ? 0.9 : 0.35)}`,
            '& .MuiAccordionSummary-content': { my: 1.25, minWidth: 0, overflow: 'hidden' },
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
                {isCourseProgressComplete ? 'Available now' : 'Unlocks when all course items are complete'}
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
          {!isCourseProgressComplete ? (
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
                Progress: {progressCompletedCount} / {progressTotalUnits}
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
  const isCourseEndPracticeView = activeLessonId === COURSE_END_PRACTICE_ID;
  const isCourseEndAssignmentView = activeLessonId === COURSE_END_ASSIGNMENT_ID;
  const isModulePanelView =
    isModulePracticePanelView ||
    isModuleAssignmentView ||
    isCourseEndPracticeView ||
    isCourseEndAssignmentView;
  const isModulePracticeQuiz = isModulePracticePanelView && practiceQuizOn;
  /** Quiz + assignment fill panel; lessons scroll separately. */
  const isScrollableLessonPanel = !isModulePanelView;
  const showLessonDetailPanel = Boolean(
    activeLesson &&
      activeLessonId !== FEEDBACK_LESSON_ID &&
      !modulePracticeModuleId &&
      !moduleAssignmentModuleId &&
      !isCourseEndPracticeView &&
      !isCourseEndAssignmentView
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

          {activeLessonId === FEEDBACK_LESSON_ID ? null : isCourseEndAssignmentView ? (
            courseEndLocked ? (
              <Box sx={{ py: 8, px: 3, textAlign: 'center' }}>
                <Iconify icon="solar:lock-keyhole-bold" width={40} sx={{ color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" sx={{ mb: 1 }}>
                  Final assessment locked
                </Typography>
                <Typography color="text.secondary">
                  Complete every lesson in all modules to unlock the final assessment.
                </Typography>
              </Box>
            ) : courseEndAssignmentQuizLocked ? (
              <Box sx={{ py: 8, px: 3, textAlign: 'center' }}>
                <Iconify icon="solar:lock-keyhole-bold" width={40} sx={{ color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" sx={{ mb: 1 }}>
                  Final assessment locked
                </Typography>
                <Typography color="text.secondary">
                  Score 100% on the final quiz before starting the final assessment.
                </Typography>
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
                courseId={course?.id}
                moduleTitle="Final Assessment"
                assignments={courseEndAssignmentQuestions}
                fillContainer
                onAssessmentCompleted={() => mutateQuizAssessmentProgress()}
              />
            </Box>
            )
          ) : isCourseEndPracticeView ? (
            courseEndLocked ? (
              <Box sx={{ py: 8, px: 3, textAlign: 'center' }}>
                <Iconify icon="solar:lock-keyhole-bold" width={40} sx={{ color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" sx={{ mb: 1 }}>
                  Final quiz locked
                </Typography>
                <Typography color="text.secondary">
                  Complete every lesson in all modules to unlock the final quiz.
                </Typography>
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
              {practiceQuizOn && courseEndQuizQuestions.length > 0 ? (
                <LearningModulePracticeQuiz
                  key={COURSE_END_PRACTICE_ID}
                  courseId={course?.id}
                  moduleId={null}
                  moduleTitle="Final Quiz"
                  questions={courseEndQuizQuestions}
                  fillContainer
                  onAttemptCompleted={() => markLocalQuizCompleted(null)}
                  onBackToIntro={() => {
                    setSearchParams({ section: COURSE_END_PRACTICE_ID }, { replace: true });
                  }}
                  onContinueToAssessment={
                    courseEndAssignmentCount > 0
                      ? () => {
                          setActiveLessonId(COURSE_END_ASSIGNMENT_ID);
                          setSearchParams({ section: COURSE_END_ASSIGNMENT_ID }, { replace: true });
                        }
                      : undefined
                  }
                />
              ) : (
                <LearningModulePracticeIntro
                  moduleTitle="Final Quiz"
                  questionCount={courseEndQuizCount}
                  onStartTest={() => setSearchParams({ section: COURSE_END_PRACTICE_ID, practiceQuiz: '1' }, { replace: true })}
                />
              )}
            </Box>
            )
          ) : moduleAssignmentModuleId && course?.id ? (
            playerLoading || modules.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <Typography color="text.secondary">Loading module…</Typography>
              </Box>
            ) : !moduleAssignmentModuleMeta ? (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <Typography color="text.secondary">This module could not be found.</Typography>
              </Box>
            ) : activeModuleAssignmentQuizLocked ? (
              <Box sx={{ py: 8, px: 3, textAlign: 'center' }}>
                <Iconify icon="solar:lock-keyhole-bold" width={40} sx={{ color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" sx={{ mb: 1 }}>
                  Assessment locked
                </Typography>
                <Typography color="text.secondary">
                  Score 100% on the module quiz before starting the assessment.
                </Typography>
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
                  onAssessmentCompleted={() => mutateQuizAssessmentProgress()}
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
                    onAttemptCompleted={() => markLocalQuizCompleted(modulePracticeModuleId)}
                    onBackToIntro={() => {
                      setSearchParams({ section: activeLessonId }, { replace: true });
                    }}
                    onContinueToAssessment={
                      (assignmentCountByModuleId[modulePracticeModuleId] || 0) > 0
                        ? () => {
                            const assignmentId = `${MODULE_ASSIGNMENT_PREFIX}${modulePracticeModuleId}`;
                            setActiveLessonId(assignmentId);
                            setExpandedSection(modulePracticeModuleId);
                            setSearchParams({ section: assignmentId }, { replace: true });
                          }
                        : undefined
                    }
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
            showSpotlightrPrepareSpinner ? (
              <Box
                sx={{
                  ...getLessonMediaFrameSx(theme, LESSON_MEDIA_FRAME_HEIGHT),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'common.black',
                }}
              >
                <CircularProgress sx={{ color: 'common.white' }} />
              </Box>
            ) : (
              <>
              <LessonVideoPlayer
              key={activeLessonId || 'lesson-player'}
              remountKey={activeLessonId || null}
              embedUrl={!activeLessonGateBlocked ? embedUrl : null}
              spotlightrMeta={!activeLessonGateBlocked && !embedUrl ? activeSpotlightrMeta : null}
              videoSrc={playerNativeVideoSrc}
              captionTracks={spotlightrCaptionTracks}
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
                // User already scrubbed / resume already applied — never yank playhead again.
                if (resumeMeta.sectionId === activeLessonId && resumeMeta.applied) {
                  if (autoPlayNextRef.current && !activeLessonGateBlocked) {
                    try {
                      v.muted = true;
                      const promise = v.play();
                      if (promise && typeof promise.then === 'function') promise.catch(() => {});
                    } catch {
                      // ignore
                    } finally {
                      autoPlayNextRef.current = false;
                    }
                  }
                  return;
                }
                const snap = sectionPlayerSnapshotRef.current?.[activeLessonId] || null;
                const resumeSeconds = resolveLessonBookmarkSeconds(
                  activeLessonId,
                  flatLessons,
                  liveSectionProgressMap,
                  sectionProgressData,
                  snap,
                  liveSectionProgressMap?.[activeLessonId] || null,
                  videoCoverageRangesRef.current
                );
                const realPos = Math.max(0, Number(v.currentTime || 0));
                if (resumeSeconds > 2 && realPos < resumeSeconds - 2) {
                  try {
                    markVideoSeekClampGrace();
                    const resumeAt = Math.min(
                      resumeSeconds,
                      Number.isFinite(v.duration) && v.duration > 0 ? v.duration : resumeSeconds
                    );
                    v.currentTime = resumeAt;
                    nativeVideoProgressRef.current.lastTime = resumeAt;
                    nativeVideoProgressRef.current.maxWatchedTimeline = Math.max(
                      nativeVideoProgressRef.current.maxWatchedTimeline || 0,
                      resumeAt
                    );
                    resumeMeta.sectionId = activeLessonId;
                    resumeMeta.applied = true;
                    resumeMeta.seconds = resumeAt;
                  } catch {
                    // ignore
                  }
                } else if (resumeSeconds > 2) {
                  resumeMeta.sectionId = activeLessonId;
                  resumeMeta.seconds = Math.round(realPos || resumeSeconds);
                  resumeMeta.applied = true;
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
                if (activeLessonId) sectionVideoProgressResetRef.current.delete(activeLessonId);
                const prog = nativeVideoProgressRef.current;
                prog.isPlaying = true;
                prog.lastTime = Math.max(0, Number(v.currentTime || 0));
                prog.lastTickAtMs = Date.now();
                console.log('[Video] Play');
              }}
              onPause={() => {
                const v = videoRef.current;
                const prog = nativeVideoProgressRef.current;
                prog.isPlaying = false;
                // Avoid duplicate pause save after ended; onEnded handles final persist.
                if (v?.ended) return;
                if (v && course?.id && activeLessonId) {
                  const durRounded = Math.round(Number(v.duration) || 0);
                  const sliceFrom = Math.max(0, Number(prog.lastTime || 0));
                  const sealed = estimatePlayingPosition(prog, v.currentTime, v.duration);
                  appendCoverageSlicePlayer(
                    videoCoverageRangesRef,
                    sliceFrom,
                    sealed,
                    durRounded,
                    v.ended || isPlaybackAtVideoEnd(sealed, v.duration),
                    wallElapsedSinceTick(prog)
                  );
                  prog.lastTime = sealed;
                  prog.lastTickAtMs = 0;
                  const payload = buildVideoCoveragePayloadFromRef(
                    videoCoverageRangesRef,
                    sealed,
                    v.duration,
                    { ended: v.ended || isPlaybackAtVideoEnd(sealed, v.duration) }
                  );
                  if (durRounded > 0 && payload.watchedSeconds >= durRounded) {
                    syncProgressOnFullDuration(activeLessonIdRef.current, sealed, v.duration, true);
                  }
                  persistVideoBookmarkRef.current(activeLessonId, payload);
                  sendProgressUpdate(course.id, activeLessonId, payload);
                  prog.pendingDeltaSeconds = 0;
                }
                console.log('[Video] Pause');
              }}
              onEnded={() => {
                const v = videoRef.current;
                if (!v) return;
                const prog = nativeVideoProgressRef.current;
                const t = v.currentTime;
                const d = v.duration;
                const currentLesson = flatLessons.find((l) => l.id === activeLessonId);
                const fallbackDur = currentLesson
                  ? lessonFallbackDurationSeconds(currentLesson, liveSectionProgressMap)
                  : 0;
                const durationForSync = Math.max(Number(d) || 0, Number(fallbackDur) || 0);
                if (course?.id && activeLessonId) {
                  appendCoverageSlicePlayer(
                    videoCoverageRangesRef,
                    prog.lastTime,
                    t,
                    Math.round(d || 0),
                    true
                  );
                }
                const durRounded = Math.round(Number(durationForSync || d) || 0);
                const maybeAutoNextAfterServer = (confirmed) => {
                  if (!confirmed || !nextLesson?.id) return;
                  startAutoNextCountdown(nextLesson);
                };
                syncProgressOnFullDuration(
                  activeLessonIdRef.current,
                  durRounded || t,
                  durationForSync,
                  true
                ).then((data) => {
                  if (!isServerSectionComplete(data)) return;
                  prog.markedComplete = true;
                  maybeAutoNextAfterServer(true);
                });
              }}
              onSeeked={(e) => {
                const v = e.target;
                if (!v || embedUrl) return;
                const t = Math.max(0, Number(v.currentTime || 0));
                nativeVideoProgressRef.current.lastTime = t;
                // Any user scrub ends resume forcing — never yank back to old bookmark.
                if (activeLessonId) {
                  resumeSeekAppliedRef.current = {
                    sectionId: activeLessonId,
                    seconds: Math.round(t),
                    applied: true,
                  };
                  nativeResumeMountKeyRef.current = `${activeLessonId}|${spotlightrDirectSrc || v.currentSrc || 'native'}`;
                }
              }}
              onTimeUpdate={() => {
                const v = videoRef.current;
                if (!v) return;
                const prog = nativeVideoProgressRef.current;
                const durRounded = Math.round(Number(v.duration) || 0);
                const required = effectiveRequiredSeconds(
                  watchtimeSeconds,
                  v.duration,
                  completionPercentage
                );
                const previousTime = Math.max(0, Number(prog.lastTime || 0));
                const wallMs = wallElapsedSinceTick(prog);
                const durationCap = durRounded > 0 ? durRounded : 7200;
                const legacyMax = isAppleMobileDevice() ? 1.5 : 2.5;
                const maxAccept =
                  Number.isFinite(wallMs) && wallMs != null
                    ? Math.min(durationCap, Math.max(legacyMax, (wallMs / 1000) * 1.5 + 1.5))
                    : legacyMax;
                const forwardDelta = v.currentTime - previousTime;
                const isForwardStep =
                  forwardDelta > 0.05 && Math.abs(forwardDelta) <= maxAccept;

                if (!prog.isPlaying && isForwardStep) {
                  prog.isPlaying = true;
                }

                if (isForwardStep) {
                  if (Math.abs(v.currentTime - previousTime) <= maxAccept) {
                    prog.maxWatchedTimeline = Math.max(prog.maxWatchedTimeline ?? 0, v.currentTime);
                  }
                  appendCoverageSlicePlayer(
                    videoCoverageRangesRef,
                    previousTime,
                    v.currentTime,
                    durRounded,
                    false,
                    wallMs
                  );
                  const cov =
                    durRounded > 0
                      ? coverageMeasurePlayer(videoCoverageRangesRef.current, durRounded)
                      : 0;
                  if (durRounded > 0 && cov >= durRounded) {
                    syncProgressOnFullDuration(activeLessonIdRef.current, v.currentTime, v.duration, true);
                  }
                  maybeSyncFullVideoCoverage(
                    activeLessonIdRef.current,
                    v.currentTime,
                    v.duration
                  );
                  prog.watchedSeconds = cov;
                  prog.pendingDeltaSeconds = 0;
                  if (!prog.markedComplete && required > 0 && cov >= required) {
                    prog.markedComplete = true;
                    videoWatchedEnoughRef.current?.();
                  }
                }
                prog.lastTime = v.currentTime;
                if (prog.isPlaying || isForwardStep) prog.lastTickAtMs = Date.now();
              }}
            />
            {activeVideoLessonForSidebar && activeLessonVideoDurationSec > 0 ? (
              <Box
                sx={{
                  width: '100%',
                  maxWidth: {
                    xs: '100%',
                    sm: 'min(100%, calc(56vh * 16 / 9))',
                    md: 'min(100%, calc(60vh * 16 / 9))',
                    lg: 'min(100%, calc(65vh * 16 / 9))',
                    xl: 'min(100%, calc(72vh * 16 / 9))',
                  },
                  mx: 'auto',
                  px: { xs: 1.5, sm: 2 },
                  py: 1.5,
                  bgcolor: 'background.paper',
                  border: `1px solid ${alpha(theme.palette.grey[500], 0.2)}`,
                  borderTop: 'none',
                  boxShadow: `0 8px 24px ${alpha(theme.palette.common.black, 0.06)}`,
                }}
              >
                <LessonVideoCoverageStrip
                  durationSeconds={activeLessonVideoDurationSec}
                  watchedRanges={activeLessonCoverageRanges}
                  currentTimeSec={activeLessonVideoCurrentSec}
                  requiredSeconds={activeLessonVideoRequiredSec}
                  isComplete={activeLessonVideoDone}
                  onSeekTo={activeLessonGateBlocked ? undefined : seekActiveLessonTo}
                  disabled={activeLessonGateBlocked}
                />
              </Box>
            ) : null}
              </>
            )
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
              canPrev={sectionImageIndex > 0}
              canNext={sectionImageIndex < activeLesson.images.length - 1}
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
                <Box sx={{ display: lessonDetailTab === 1 ? 'block' : 'none' }}>
                  {hasLearningMaterials ? (
                    <LessonLearningMaterialsPanel
                      key={`materials-${activeLessonId}`}
                      materials={activeLesson.learningMaterials}
                    />
                  ) : null}

                  {/* Admin upload area when no materials or to add more */}
                  {authenticated && user?.role === 'admin' ? (
                    <Box sx={{ mt: 2 }}>
                      <Upload
                        value={null}
                        multiple
                        coverPreview
                        onDrop={async (acceptedFiles) => {
                          if (!activeLesson?.id) return;
                          const files = Array.isArray(acceptedFiles) ? acceptedFiles : [acceptedFiles];
                          try {
                            const uploaded = await courseService.uploadSectionLearningMaterials(files);
                            const existing = Array.isArray(activeLesson.learningMaterials)
                              ? activeLesson.learningMaterials
                              : [];
                            const newList = [...existing, ...uploaded];
                            await courseService.updateModuleSection(activeLesson.id, { learningMaterials: newList });
                            toast.success('Learning materials uploaded');
                            if (playerKey) await mutate(playerKey);
                          } catch (err) {
                            toast.error(err?.response?.data?.message || err?.message || 'Upload failed');
                          }
                        }}
                        onDelete={async () => {
                          // Deleting handled from admin modules panel; refresh player context
                          if (playerKey) await mutate(playerKey);
                        }}
                        helperText="Drop files here or click to browse — uploaded when you save (max 50MB each)"
                      />
                    </Box>
                  ) : null}
                </Box>
              </Box>
            </Box>
          ) : null}

          {activeLesson && navigationSteps.length > 1 && (
            <Box
              sx={{
                mt: 2.5,
                p: { xs: 1.5, sm: 2 },
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
                spacing={{ xs: 1, sm: 2 }}
                sx={{ flexWrap: 'nowrap' }}
              >
                <Button
                  variant="outlined"
                  color="inherit"
                  startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
                  onClick={goToPrevLesson}
                  disabled={!prevLesson}
                  sx={{
                    flexShrink: 0,
                    minWidth: { xs: 40, sm: 128 },
                    px: { xs: 1, sm: 2 },
                    borderRadius: 1.5,
                    fontWeight: 600,
                    fontSize: playerFluidType.body,
                  }}
                >
                  <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                    Previous
                  </Box>
                </Button>
                <Typography
                  variant="caption"
                  sx={{
                    color: 'text.secondary',
                    fontWeight: 700,
                    fontSize: { xs: theme.typography.pxToRem(12), sm: playerFluidType.caption },
                    px: { xs: 1, sm: 1.5 },
                    py: 0.5,
                    borderRadius: 1,
                    bgcolor: alpha(theme.palette.grey[500], 0.08),
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    textAlign: 'center',
                    lineHeight: 1.3,
                    minWidth: { xs: 52, sm: 64 },
                  }}
                >
                  {currentStepIndex >= 0
                    ? `${currentStepIndex + 1} / ${navigationSteps.length}`
                    : ''}
                </Typography>
                <LoadingButton
                  variant="contained"
                  color="primary"
                  endIcon={<Iconify icon="eva:arrow-ios-forward-fill" />}
                  onClick={goToNextLesson}
                  loading={nextLoading}
                  disabled={!canGoNextLesson}
                  sx={{
                    flexShrink: 0,
                    minWidth: { xs: 40, sm: 128 },
                    px: { xs: 1, sm: 2 },
                    borderRadius: 1.5,
                    fontWeight: 600,
                    fontSize: playerFluidType.body,
                  }}
                >
                  <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                    Next
                  </Box>
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

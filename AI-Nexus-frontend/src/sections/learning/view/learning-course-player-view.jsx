import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
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
import LoadingButton from '@mui/lab/LoadingButton';
import { alpha, useTheme } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { EmptyContent } from 'src/components/empty-content';
import { LoadingScreen } from 'src/components/loading-screen';
import { LessonDocumentViewer } from 'src/sections/learning/components/lesson-document-viewer';
import { LessonVideoPlayer } from 'src/sections/learning/components/lesson-video-player';
import { LessonImageViewer } from 'src/sections/learning/components/lesson-image-viewer';
import { LessonTextViewer } from 'src/sections/learning/components/lesson-text-viewer';
import { Iconify } from 'src/components/iconify';
import { courseService } from 'src/services/course.service';
import { speakerService } from 'src/services/speaker.service';
import {
  LearningModulePracticeIntro,
  LearningModulePracticeQuiz,
} from 'src/sections/learning/components/learning-module-practice-panel';
import { createCourseReview, createSpeakerReview } from 'src/services/review.service';
import { useAuthContext } from 'src/auth/hooks';
import {
  IMAGE_VIEW_COMPLETE_DELAY_MS,
  TEXT_VIEW_COMPLETE_DELAY_MS,
} from 'src/config/constants';
import { toast } from 'src/components/snackbar';
import { DashboardContent } from 'src/layouts/dashboard';
import { htmlToPlainText } from 'src/utils/html-plain-text';

// ----------------------------------------------------------------------

const isPaidCourse = (value) => value === true || value === 'true' || value === 1 || value === '1';

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
  const keys = [
    'lastPositionSeconds',
    'watchedSeconds',
    'durationSeconds',
    'completionPercent',
    'isCompleted',
    'isWatched',
    'isLocked',
    'remainingSeconds',
    'watchedCoverageRanges',
  ];
  keys.forEach((k) => {
    if (data[k] !== undefined && data[k] !== null) next[k] = data[k];
  });
  return next;
}

function mergeProgressForSidebar(lesson, liveById) {
  const live = liveById?.[lesson.id];
  const sp = lesson.sectionProgress || {};
  if (!live) return { ...sp };
  return { ...sp, ...live };
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
function computeSidebarPlaybackSnapshot(videoRef, youtubeRef, rangesRef, fallbackDurationSec = 0) {
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
  const durRounded = Math.round(durationSec);
  const fallback = Math.max(0, Math.round(Number(fallbackDurationSec) || 0));
  const clipForCoverage = durRounded > 0 ? durRounded : fallback;
  const watchedCoverageSec =
    clipForCoverage > 0
      ? coverageMeasurePlayer(rangesRef?.current, clipForCoverage)
      : coverageMeasurePlayer(rangesRef?.current, 0);
  if (durRounded <= 0 && currentSec <= 0 && fallback <= 0) return null;
  return { currentSec, durationSec, watchedCoverageSec };
}

/**
 * Sidebar video row: `MM:SS / MM:SS • N%` (no "Duration" label).
 * Progress % is always vs full video length (duration). Watchtime only affects when the backend marks complete.
 */
function getLessonVideoSidebarCaption(lesson, liveById, playback) {
  const merged = mergeProgressForSidebar(lesson, liveById);
  const totalFromSp = Math.max(
    0,
    Number(merged.durationSeconds || lesson.sectionProgress?.durationSeconds || 0)
  );
  const totalFromStr =
    parseWatchtimeToSeconds(String(lesson.durationTime || '').trim()) ??
    parseWatchtimeToSeconds(String(lesson.duration || '').trim());
  let totalSec = Math.max(totalFromSp, totalFromStr || 0);

  if (playback && Number.isFinite(playback.durationSec) && playback.durationSec > 0) {
    totalSec = Math.max(totalSec, Math.round(playback.durationSec));
  }

  const watched = Math.max(0, Number(merged.watchedSeconds || 0));
  const lastPos = Math.max(0, Number(merged.lastPositionSeconds || 0));

  const liveCurrent =
    playback && Number.isFinite(playback.currentSec) ? Math.max(0, playback.currentSec) : null;
  const watchedLive =
    playback && Number.isFinite(playback.watchedCoverageSec)
      ? Math.max(watched, playback.watchedCoverageSec)
      : watched;

  const positionish =
    liveCurrent != null
      ? Math.max(watchedLive, lastPos, liveCurrent)
      : Math.max(watched, lastPos);

  const doneByBackend =
    lesson.sectionProgress?.isWatched === true ||
    lesson.sectionProgress?.isCompleted === true ||
    merged.isWatched === true ||
    merged.isCompleted === true;
  // UI must follow full video duration, not watchtime completion threshold.
  const doneByFullDuration = totalSec > 0 && positionish >= totalSec - 1;

  const pctRaw = merged.completionPercent;
  let pct;
  if (doneByFullDuration) {
    pct = 100;
  } else if (totalSec > 0) {
    const numer = Math.min(totalSec, positionish);
    pct = Math.min(100, Math.round((100 * numer) / totalSec));
  } else if (!doneByBackend && Number.isFinite(Number(pctRaw)) && Number(pctRaw) >= 0) {
    pct = Math.min(100, Math.round(Number(pctRaw)));
  } else if (doneByBackend) {
    pct = 100;
  } else {
    pct = 0;
  }

  if (totalSec <= 0) {
    const dt = String(lesson?.durationTime || '').trim();
    if (dt) return dt;
    const durField = String(lesson?.duration || '').trim();
    if (durField && durField !== '—') return durField;
    return null;
  }

  const left = doneByFullDuration
    ? totalSec
    : Math.min(totalSec, liveCurrent != null ? liveCurrent : positionish);
  return `${formatSecondsToClock(left)} / ${formatSecondsToClock(totalSec)} • ${pct}%`;
}

function getLessonVideoSidebarPercent(lesson, liveById, playback) {
  const merged = mergeProgressForSidebar(lesson, liveById);
  const totalFromSp = Math.max(
    0,
    Number(merged.durationSeconds || lesson.sectionProgress?.durationSeconds || 0)
  );
  const totalFromStr =
    parseWatchtimeToSeconds(String(lesson.durationTime || '').trim()) ??
    parseWatchtimeToSeconds(String(lesson.duration || '').trim());
  let totalSec = Math.max(totalFromSp, totalFromStr || 0);
  if (playback && Number.isFinite(playback.durationSec) && playback.durationSec > 0) {
    totalSec = Math.max(totalSec, Math.round(playback.durationSec));
  }

  const watched = Math.max(0, Number(merged.watchedSeconds || 0));
  const lastPos = Math.max(0, Number(merged.lastPositionSeconds || 0));
  const liveCurrent =
    playback && Number.isFinite(playback.currentSec) ? Math.max(0, playback.currentSec) : null;
  const watchedLive =
    playback && Number.isFinite(playback.watchedCoverageSec)
      ? Math.max(watched, playback.watchedCoverageSec)
      : watched;
  const positionish =
    liveCurrent != null
      ? Math.max(watchedLive, lastPos, liveCurrent)
      : Math.max(watched, lastPos);

  if (totalSec <= 0) return 0;
  return Math.min(100, Math.round((100 * Math.min(totalSec, positionish)) / totalSec));
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
      duration: s.durationTime || '—',
      videoUrl: s.videoUrl || null,
      description: s.description || null,
      content: s.content || null,
      watchtime: s.watchtime || null,
      durationTime: s.durationTime || null,
      images: Array.isArray(s.images) ? s.images : [],
      attachments: Array.isArray(s.attachments) ? s.attachments : [],
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

const FEEDBACK_LESSON_ID = '__feedback__';
const FEEDBACK_SECTION_ID = 'section-feedback';
/** Pseudo lesson id: `${MODULE_PRACTICE_PREFIX}${courseModuleUuid}` — main area shows module assessment flow. */
const MODULE_PRACTICE_PREFIX = '__mp__';

function getModuleIdFromPracticeLessonId(lessonId) {
  if (!lessonId || typeof lessonId !== 'string' || !lessonId.startsWith(MODULE_PRACTICE_PREFIX)) {
    return null;
  }
  const rest = lessonId.slice(MODULE_PRACTICE_PREFIX.length);
  return isUuid(rest) ? rest : null;
}
const swrOptions = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

const LESSON_FRAME_HEIGHT = { xs: 260, sm: 320, md: 580 };
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
  const urlSectionProcessedRef = useRef(null);
  const videoRef = useRef(null);
  const videoWatchedEnoughRef = useRef(null);
  const youtubePlayerRef = useRef(null);
  const youtubeContainerRef = useRef(null);
  const viewedSectionIdsRef = useRef(viewedSectionIds);
  const courseIdRef = useRef(course?.id || null);
  const flushSectionProgressRef = useRef(() => {});
  const lastProgressPayloadRef = useRef({ key: '', at: 0 });
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
  viewedSectionIdsRef.current = viewedSectionIds;
  completedSectionIdsRef.current = new Set([
    ...viewedSectionIds,
    ...Object.entries(liveSectionProgressMap || {})
      .filter(([, p]) => p?.isCompleted === true || p?.isWatched === true)
      .map(([id]) => id),
  ]);
  activeLessonIdRef.current = activeLessonId;
  courseIdRef.current = course?.id || null;

  const sendProgressUpdate = useCallback((courseId, sectionId, payload, useKeepalive = false, force = false) => {
    if (!courseId || !sectionId || !payload) return Promise.resolve(null);
    if (!force) {
      const live = liveSectionProgressMap?.[sectionId] || {};
      const knownDuration = Math.max(0, Number(live.durationSeconds || 0));
      const knownProgress = Math.max(
        0,
        Number(live.watchedSeconds || 0),
        Number(live.lastPositionSeconds || 0)
      );
      const payloadDuration = Math.max(0, Number(payload.durationSeconds || 0));
      const payloadProgress = Math.max(
        0,
        Number(payload.watchedSeconds || 0),
        Number(payload.lastPositionSeconds || 0)
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
      Number(payload.watchedDeltaSeconds || 0),
      Number(payload.watchedSeconds ?? -1),
      Number(payload.lastPositionSeconds || 0),
      Number(payload.durationSeconds || 0),
      Boolean(payload.markCompleted),
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
      courseService.updateSectionProgressOnUnload(courseId, sectionId, payload);
      return Promise.resolve(null);
    }
    return courseService
      .updateSectionProgress(courseId, sectionId, payload)
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
      })
      .catch(() => {
        fullDurationSyncRef.current.sent = false;
      });
  }, [sendProgressUpdate]);

  function markLessonCompletedOnly(lessonId) {
    if (
      !authenticated ||
      !course?.id ||
      !lessonId ||
      lessonId === FEEDBACK_LESSON_ID ||
      !isUuid(lessonId)
    ) {
      return;
    }
    if (viewedSectionIdsRef.current.includes(lessonId)) return;

    sendProgressUpdate(course.id, lessonId, {
      watchedDeltaSeconds: 1,
      durationSeconds: 1,
      markCompleted: true,
    });

    setViewedSectionIds((prev) => {
      if (prev.includes(lessonId)) return prev;
      const nextViewed = [...prev, lessonId];
      viewedSectionIdsRef.current = nextViewed;
      return nextViewed;
    });
  }

  const completeSection = useCallback(
    (lessonId) => {
      if (!lessonId || lessonId === FEEDBACK_LESSON_ID) return;
      markLessonCompletedOnly(lessonId);
    },
    [markLessonCompletedOnly],
  );

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
    const flushSectionProgress = (useKeepalive = false, force = false) => {
      const courseId = courseIdRef.current;
      const sectionId = activeLessonIdRef.current;
      if (!courseId || !sectionId || sectionId === FEEDBACK_LESSON_ID) return;
      if (getModuleIdFromPracticeLessonId(sectionId)) return;
      if (!force && viewedSectionIdsRef.current.includes(sectionId)) return;

      let lastPosition = 0;
      let duration = 0;

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

      const nativeProg = nativeVideoProgressRef.current;
      const ytProg = youtubeProgressRef.current;
      if (nativeProg?.isPlaying && nativeVideo) {
        appendCoverageSlicePlayer(
          videoCoverageRangesRef,
          nativeProg.lastTime,
          nativeVideo.currentTime,
          Math.round(duration || 0)
        );
      }
      if (ytProg?.isPlaying && ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
        try {
          appendCoverageSlicePlayer(
            videoCoverageRangesRef,
            ytProg.lastTime,
            ytPlayer.getCurrentTime(),
            Math.round(duration || 0)
          );
        } catch {
          // ignore
        }
      }

      const durRounded = Math.round(duration || 0);
      const payload = buildVideoCoveragePayloadFromRef(videoCoverageRangesRef, lastPosition, durRounded);
      if (payload.watchedSeconds <= 0 && payload.lastPositionSeconds <= 0) return;

      const req = sendProgressUpdate(courseId, sectionId, payload, useKeepalive, force);

      nativeVideoProgressRef.current.pendingDeltaSeconds = 0;
      youtubeProgressRef.current.pendingDeltaSeconds = 0;
      return req;
    };
    flushSectionProgressRef.current = flushSectionProgress;

    const handlePageHide = () => flushSectionProgress(true);
    const handleBeforeUnload = () => flushSectionProgress(true);

    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handleBeforeUnload);
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

  const questionCountByModuleId = useMemo(() => {
    const m = {};
    (questionBankList || []).forEach((q) => {
      if (!q?.moduleId) return;
      m[q.moduleId] = (m[q.moduleId] || 0) + 1;
    });
    return m;
  }, [questionBankList]);

  const modulePracticeModuleId = useMemo(
    () => getModuleIdFromPracticeLessonId(activeLessonId),
    [activeLessonId]
  );

  const modulePracticeQuestions = useMemo(() => {
    if (!modulePracticeModuleId) return [];
    return (questionBankList || []).filter((q) => q?.moduleId === modulePracticeModuleId);
  }, [questionBankList, modulePracticeModuleId]);

  useEffect(() => {
    if (!practiceQuizOn) return;
    if (!getModuleIdFromPracticeLessonId(activeLessonId)) {
      const sec = searchParams.get('section');
      if (sec) setSearchParams({ section: sec }, { replace: true });
    }
  }, [practiceQuizOn, activeLessonId, searchParams, setSearchParams]);

  useEffect(() => {
    setLiveSectionProgressMap({});
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

  const flatLessons = useMemo(
    () =>
      modules.flatMap((sec) =>
        (sec.lessons || []).map((lesson) => ({ ...lesson, sectionId: sec.id }))
      ),
    [modules]
  );

  useEffect(() => {
    if (!activeLessonId || activeLessonId === FEEDBACK_LESSON_ID) return undefined;
    if (getModuleIdFromPracticeLessonId(activeLessonId)) return undefined;
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

  // Guard: only allow access if user is enrolled (purchased). Redirect to course details if not.
  useEffect(() => {
    if (!course?.id || loading || playerLoading) return undefined;
    const paidCourse = isPaidCourse(course.freeOrPaid);
    if (!paidCourse) {
      setEnrollmentChecked(true);
      setEnrolled(true);
      return undefined;
    }
    if (!authenticated) {
      toast.error('Sign in and purchase this course to access content');
      navigate(paths.learningCourse.details(course.id), { replace: true });
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

  const sectionProgressData =
    authenticated &&
    activeLessonId &&
    activeLessonId !== FEEDBACK_LESSON_ID &&
    isUuid(activeLessonId) &&
    flatLessons.length > 0
      ? flatLessons.find((l) => l.id === activeLessonId)?.sectionProgress || null
      : null;

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
  const activePrevLessonId =
    activeLessonIndex > 0 ? flatLessons[activeLessonIndex - 1]?.id : null;
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
  // If previous lesson is already viewed/completed locally, do not treat this one as locked in UI.
  if (
    activeLessonContentLocked &&
    activePrevLessonId &&
    viewedSectionIds.includes(activePrevLessonId)
  ) {
    activeLessonContentLocked = false;
  }
  let activeLessonProgressPending = false;
  let activeLessonGateBlocked = activeLessonContentLocked;

  // Sync current section watched state from backend.
  useEffect(() => {
    if (!activeLessonId || activeLessonId === FEEDBACK_LESSON_ID) return;
    if (!sectionProgressData?.isWatched) return;
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
      .filter((lesson) => isUuid(lesson.id) && lesson.sectionProgress?.isWatched === true)
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
    nativeVideoProgressRef.current = {
      watchedSeconds: 0,
      pendingDeltaSeconds: 0,
      lastTime: 0,
      maxWatchedTimeline: 0,
      isPlaying: false,
      markedComplete: false,
    };
    fullDurationSyncRef.current = { sectionId: activeLessonId || null, sent: false };
    imageSectionMarkedRef.current = false;
  }, [activeLessonId]);

  // Hydrate timeline coverage when the lesson changes or server progress payload changes (not every SWR tick).
  useEffect(() => {
    if (!activeLessonId || activeLessonId === FEEDBACK_LESSON_ID || !isUuid(activeLessonId)) return;
    const lesson = flatLessons.find((l) => l.id === activeLessonId);
    if (!lesson) return;
    const sp = sectionProgressData;
    const watchtimeSec = parseWatchtimeToSeconds(lesson.watchtime || '');
    const d = Math.max(Number(sp?.durationSeconds || 0), watchtimeSec || 0);
    let ranges = [];
    if (sp && Array.isArray(sp.watchedCoverageRanges) && sp.watchedCoverageRanges.length > 0) {
      ranges = parseCoverageRangePairs(sp.watchedCoverageRanges);
    } else if (sp && (sp.watchedSeconds || 0) > 0 && d > 0) {
      ranges = [[0, Math.min(sp.watchedSeconds, d)]];
    }
    videoCoverageRangesRef.current =
      d > 0 ? clipCoverageRangesPlayer(mergeCoverageRangesPlayer(ranges), d) : mergeCoverageRangesPlayer(ranges);
    const covMax = maxCoverageEndPlayer(videoCoverageRangesRef.current);
    const lastPos = Number(sp?.lastPositionSeconds || 0);
    nativeVideoProgressRef.current.maxWatchedTimeline = Math.max(covMax, lastPos);
    nativeVideoProgressRef.current.markedComplete = Boolean(sp?.isCompleted);
  }, [activeLessonId, sectionProgressCoverageSig, flatLessons]);

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
          Boolean(getModuleIdFromPracticeLessonId(activeLessonId))
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
        activeLessonId === `${MODULE_PRACTICE_PREFIX}${s.id}`
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
  const embedVideoId =
    sectionVideoUrlForEmbed &&
    (sectionVideoUrlForEmbed.includes('youtube.com') ||
      sectionVideoUrlForEmbed.includes('youtu.be'))
      ? sectionVideoUrlForEmbed.match(
          /(?:youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/embed\/)([^&?]+)/
        )?.[1] ?? null
      : null;
  const watchtimeSeconds = activeLesson ? parseWatchtimeToSeconds(activeLesson.watchtime) : null;

  useEffect(() => {
    if (!sectionProgressData || !activeLessonId) return;
    const resumeSeconds = Number(sectionProgressData.lastPositionSeconds || 0);
    resumeSeekAppliedRef.current = {
      sectionId: activeLessonId,
      seconds: resumeSeconds > 2 ? resumeSeconds : 0,
      applied: false,
    };
  }, [sectionProgressData, activeLessonId]);



  // If section progress arrives after player mounted, seek immediately.
  useEffect(() => {
    if (!sectionProgressData || !activeLessonId) return;
    const resumeSeconds = Number(sectionProgressData.lastPositionSeconds || 0);
    if (!(resumeSeconds > 2)) return;

    const resumeMeta = resumeSeekAppliedRef.current;
    if (resumeMeta.sectionId !== activeLessonId || resumeMeta.applied) return;

    const nativeVideo = videoRef.current;
    if (nativeVideo && Number.isFinite(nativeVideo.duration) && nativeVideo.duration > 0) {
      try {
        nativeVideo.currentTime = Math.min(resumeSeconds, nativeVideo.duration);
        resumeMeta.applied = true;
        return;
      } catch {
        // ignore seek errors
      }
    }

    const ytPlayer = youtubePlayerRef.current;
    if (ytPlayer && typeof ytPlayer.seekTo === 'function') {
      try {
        ytPlayer.seekTo(resumeSeconds, true);
        resumeMeta.applied = true;
      } catch {
        // ignore seek errors
      }
    }
  }, [sectionProgressData, activeLessonId]);

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
      const payload = buildVideoCoveragePayloadFromRef(videoCoverageRangesRef, last, dur);
      sendProgressUpdate(courseId, sectionId, { ...payload, markCompleted: true }).then((data) => {
        if (data?.isCompleted || data?.isWatched) {
          nativeVideoProgressRef.current.markedComplete = true;
          youtubeProgressRef.current.markedComplete = true;
          setViewedSectionIds((prev) => {
            if (prev.includes(sectionId)) return prev;
            const next = [...prev, sectionId];
            viewedSectionIdsRef.current = next;
            return next;
          });
        }
      });
    };
    return () => {
      videoWatchedEnoughRef.current = null;
    };
  }, [course?.id, activeLessonId, sendProgressUpdate]);

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
      isPlaying: false,
      markedComplete: false,
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
      container.style.width = '100%';
      container.style.height = '100%';
      container.style.minHeight = '320px';
      wrapper.appendChild(container);

      if (window.YT && window.YT.Player) {
        player = new window.YT.Player(container, {
          videoId: embedVideoId,
          events: {
            onReady: () => {
              const resumeMeta = resumeSeekAppliedRef.current;
              if (
                resumeMeta.sectionId === activeLessonId &&
                !resumeMeta.applied &&
                resumeMeta.seconds > 2 &&
                player &&
                typeof player.seekTo === 'function'
              ) {
                try {
                  player.seekTo(resumeMeta.seconds, true);
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
                  const durRounded = Math.round(Number(d) || 0);
                  if (prog.isPlaying) {
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
              }, 300);
            },
            onStateChange: (e) => {
              const prog = youtubeProgressRef.current;
              if (e.data === 1) {
                prog.isPlaying = true;
                try {
                  prog.lastTime = player ? player.getCurrentTime() : 0;
                } catch {
                  // ignore player not ready
                }
                console.log('[Video] Play');
              } else if (e.data === 2) {
                prog.isPlaying = false;
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
                    // If already marked complete by watchtime, still allow full-duration sync above and stop here.
                    if (prog.markedComplete) return;
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

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (player && typeof player.destroy === 'function') player.destroy();
      youtubePlayerRef.current = null;
      const wrapper = youtubeContainerRef.current;
      if (wrapper) while (wrapper.firstChild) wrapper.removeChild(wrapper.firstChild);
    };
  }, [embedVideoId, watchtimeSeconds, course?.id, activeLessonId, activeLessonGateBlocked, modules, sendProgressUpdate, setSearchParams, startAutoNextCountdown]);

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
      if ((questionCountByModuleId[module.id] || 0) > 0) {
        steps.push({
          id: `${MODULE_PRACTICE_PREFIX}${module.id}`,
          sectionId: module.id,
          videoUrl: null,
          kind: 'practice',
        });
      }
    });
    return steps;
  }, [modules, questionCountByModuleId]);

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
      const prevId = flatLessons[idx - 1]?.id;
      const prevCompleted =
        prevId &&
        (viewedSectionIds.includes(prevId) ||
          flatLessons[idx - 1]?.sectionProgress?.isWatched === true ||
          flatLessons[idx - 1]?.sectionProgress?.isCompleted === true);
      if (!prevCompleted) return;
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
          if (currentFlatLesson?.videoUrl) {
            // Video lesson: flush latest playhead/coverage snapshot right before navigation.
            await flushSectionProgressRef.current?.(false, true);
          } else {
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
    !getModuleIdFromPracticeLessonId(activeLessonId) &&
    activeModuleLessons.length > 0 &&
    activeModuleLessons[activeModuleLessons.length - 1]?.id === activeLessonId;
  if (isOnLastLessonOfActiveModule) {
    // Keep bottom Next disabled at module boundary; user should use "Next Module" CTA.
    canGoNextLesson = false;
  }
  if (nextLesson && flatLessons.length > 0) {
    const nextPracticeModuleId = getModuleIdFromPracticeLessonId(nextLesson.id);
    if (nextPracticeModuleId) {
      const targetModule = modules.find((m) => m.id === nextPracticeModuleId);
      const targetLessons = targetModule?.lessons || [];
      const allDone =
        targetLessons.length > 0 &&
        targetLessons.every(
          (l) =>
            viewedSectionIds.includes(l.id) ||
            l.sectionProgress?.isWatched === true ||
            l.sectionProgress?.isCompleted === true
        );
      if (!allDone) {
        canGoNextLesson = false;
      }
    }
    const idx = flatLessons.findIndex((l) => l.id === nextLesson.id);
    if (idx > 0) {
      const prevId = flatLessons[idx - 1]?.id;
      const prevCompleted =
        prevId &&
        (viewedSectionIds.includes(prevId) ||
          flatLessons[idx - 1]?.sectionProgress?.isWatched === true ||
          flatLessons[idx - 1]?.sectionProgress?.isCompleted === true);
      if (!prevCompleted) {
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
    const completed = flatLessons.filter(
      (lesson) =>
        lesson.sectionProgress?.isWatched ||
        lesson.sectionProgress?.isCompleted ||
        viewedSectionIds.includes(lesson.id)
    );
    return Math.min(completed.length, totalLessons);
  }, [flatLessons, totalLessons, viewedSectionIds]);
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
      const completed = lessons.filter(
        (lesson) =>
          lesson.sectionProgress?.isWatched ||
          lesson.sectionProgress?.isCompleted ||
          viewedSectionIds.includes(lesson.id)
      ).length;
      const percent = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
      result[module.id] = { total, completed, percent };
    });
    return result;
  }, [modules, viewedSectionIds]);

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
  const isYouTube = videoSrc && (videoSrc.includes('youtube.com') || videoSrc.includes('youtu.be'));
  let embedUrl = null;
  if (isYouTube && videoSrc) {
    const match = videoSrc.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([^&?]+)/);
    embedUrl = match ? `https://www.youtube-nocookie.com/embed/${match[1]}` : null;
  }
  const hasVideo = !!(embedUrl || (videoSrc && !isYouTube));
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
    !getModuleIdFromPracticeLessonId(activeLessonId)
      ? flatLessons.find((l) => l.id === activeLessonId && l.videoUrl)
      : null;
  void sidebarPlaybackTick;
  const activeLessonSidebarPlayback = activeVideoLessonForSidebar
    ? computeSidebarPlaybackSnapshot(
        videoRef,
        youtubePlayerRef,
        videoCoverageRangesRef,
        lessonFallbackDurationSeconds(activeVideoLessonForSidebar, liveSectionProgressMap)
      )
    : null;

  const courseSidebar = (
    <Box
      sx={{
        width: 1,
        height: 1,
      }}
    >
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderRight: `1px solid ${theme.palette.divider}`,
        }}
      >
        {/* Progress always visible (open/close both) */}
        {totalLessons > 0 && (
          <Box sx={{ px: 2, py: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              spacing={1}
              sx={{ mb: 1 }}
            >
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                Your progress
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {completedCount} of {totalLessons}
              </Typography>
            </Stack>
            <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mb: 1 }}>
              {currentLessonNumber > 0
                ? `Current lesson ${currentLessonNumber} of ${totalLessons}`
                : `Current lesson 0 of ${totalLessons}`}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={Math.min(100, progressPercent)}
              sx={{
                height: 6,
                borderRadius: 1,
                bgcolor: 'grey.200',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 1,
                  bgcolor: 'secondary.main',
                },
              }}
            />
          </Box>
        )}

        <Box
          onClick={() => setCourseContentExpanded((prev) => !prev)}
          sx={{
            px: 2,
            py: 2.5,
            borderBottom: `1px solid ${theme.palette.divider}`,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            '&:hover': { bgcolor: alpha(theme.palette.grey[500], 0.08) },
          }}
        >
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
              Course content
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}
            >
              {totalLessons} lesson{totalLessons !== 1 ? 's' : ''}
            </Typography>
          </Box>
          <Iconify
            icon={courseContentExpanded ? 'eva:chevron-up-fill' : 'eva:chevron-down-fill'}
            width={20}
            sx={{ color: 'text.secondary' }}
          />
        </Box>

        {courseContentExpanded && (
        <>
          {modules.map((section) => {
            const modulePracticeRowId = `${MODULE_PRACTICE_PREFIX}${section.id}`;
            const sectionHasActiveLesson =
              (section.lessons || []).some((l) => l.id === activeLessonId) ||
              activeLessonId === modulePracticeRowId;
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
                sx={{
                  boxShadow: 'none',
                  '&:before': { display: 'none' },
                  borderBottom: `1px solid ${theme.palette.divider}`,
                }}
              >
                <AccordionSummary
                  expandIcon={<Iconify icon="eva:chevron-down-fill" width={20} />}
                  sx={{
                    minHeight: 48,
                    '& .MuiAccordionSummary-content': { my: 1.5 },
                    ...(sectionHasActiveLesson && {
                      bgcolor: alpha(theme.palette.secondary.main, 0.12),
                      color: 'secondary.main',
                      '& .MuiAccordionSummary-expandIconWrapper': { color: 'secondary.main' },
                    }),
                  }}
                >
                  <Box sx={{ width: 1, pr: 1 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }} noWrap>
                        {section.title}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', flexShrink: 0 }}>
                        {sectionStats.completed}/{sectionStats.total}
                      </Typography>
                    </Stack>
                    {sectionStats.total > 0 && (
                      <LinearProgress
                        variant="determinate"
                        value={sectionStats.percent}
                        sx={{
                          mt: 0.75,
                          height: 4,
                          borderRadius: 999,
                          bgcolor: alpha(theme.palette.grey[500], 0.24),
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 999,
                            bgcolor: sectionHasActiveLesson ? 'secondary.main' : 'primary.main',
                          },
                        }}
                      />
                    )}
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 1.5, pb: 1 }}>
                  <Stack spacing={1.25}>
                    {(section.lessons || []).map((lesson) => {
                      const isActive = activeLessonId === lesson.id;
                      const isViewed =
                        lesson.sectionProgress?.isWatched === true ||
                        lesson.sectionProgress?.isCompleted === true ||
                        viewedSectionIds.includes(lesson.id);
                      // Lock state: backend flag + local viewed list so next lesson unlocks immediately.
                      let isLocked = lesson.sectionProgress?.isLocked === true;
                      // If this is the first lesson, never lock.
                      const lessonFlatIndex = flatLessons.findIndex((l) => l.id === lesson.id);
                      const prevFlatId =
                        lessonFlatIndex > 0 ? flatLessons[lessonFlatIndex - 1]?.id : null;
                      if (lessonFlatIndex === 0) {
                        isLocked = false;
                      } else if (
                        isLocked &&
                        prevFlatId &&
                        viewedSectionIds.includes(prevFlatId)
                      ) {
                        isLocked = false;
                      }

                      const lessonHasVideo = Boolean(lesson.videoUrl);
                      const lessonHasImages = Array.isArray(lesson.images) && lesson.images.length > 0;
                      const isYouTubeLesson =
                        lessonHasVideo &&
                        (lesson.videoUrl.includes('youtube.com') || lesson.videoUrl.includes('youtu.be'));
                      const lessonPreviewImage = lessonHasImages
                        ? lesson.images[0]
                        : course?.image || '/assets/images/cover/cover-1.jpg';
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
                            setActiveLessonId(lesson.id);
                            setExpandedSection(section.id);
                            setSearchParams({ section: lesson.id }, { replace: true });
                            setSidebarOpen(false);
                          }}
                          sx={{
                            width: 1,
                            py: 1.25,
                            px: 1.5,
                            borderRadius: 1,
                            cursor: isLocked ? 'not-allowed' : 'pointer',
                            opacity: isLocked ? 0.55 : 1,
                            bgcolor: isActive
                              ? alpha(theme.palette.secondary.main, 0.12)
                              : isViewed
                                ? alpha(theme.palette.secondary.main, 0.06)
                                : 'transparent',
                            color: isActive
                              ? 'secondary.main'
                              : isViewed
                                ? 'secondary.darker'
                                : 'text.primary',
                            '&:hover': {
                              bgcolor: isActive
                                ? alpha(theme.palette.secondary.main, 0.16)
                                : isViewed
                                  ? alpha(theme.palette.secondary.main, 0.1)
                                  : alpha(theme.palette.grey[500], 0.08),
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
                                    ? theme.palette.secondary.main
                                    : isViewed
                                      ? alpha(theme.palette.secondary.main, 0.6)
                                      : theme.palette.divider
                                }`,
                                bgcolor: 'common.black',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              {lessonHasVideo && !isYouTubeLesson ? (
                                <Box
                                  component="video"
                                  src={lesson.videoUrl}
                                  muted
                                  preload="metadata"
                                  sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              ) : lessonHasVideo && isYouTubeLesson ? (
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
                              <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
                                {lesson.title}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
                                {(() => {
                                  if (lessonHasVideo) {
                                    return (
                                      getLessonVideoSidebarCaption(
                                        lesson,
                                        liveSectionProgressMap,
                                        lesson.id === activeLessonId
                                          ? activeLessonSidebarPlayback
                                          : null
                                      ) || 'Video lesson'
                                    );
                                  }
                                  return lessonHasImages
                                      ? `Images • ${lesson.images.length}`
                                      : Array.isArray(lesson.attachments) && lesson.attachments.length > 0
                                        ? `Files • ${lesson.attachments.length}`
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
                                      lesson.id === activeLessonId ? activeLessonSidebarPlayback : null
                                    )}
                                    sx={{
                                      flex: 1,
                                      height: 5,
                                      borderRadius: 999,
                                      bgcolor: alpha(theme.palette.grey[500], 0.22),
                                      '& .MuiLinearProgress-bar': {
                                        borderRadius: 999,
                                        bgcolor:
                                          isActive || isViewed
                                            ? 'secondary.main'
                                            : alpha(theme.palette.primary.main, 0.85),
                                      },
                                    }}
                                  />
                                </Stack>
                              )}
                            </Stack>
                            {isLocked && (
                              <Iconify
                                icon="solar:lock-keyhole-bold"
                                width={14}
                                sx={{ color: 'text.disabled', flexShrink: 0 }}
                              />
                            )}
                          </Stack>
                        </Stack>
                      );
                    })}

                    {(() => {
                      const modPracticeCount = questionCountByModuleId[section.id] || 0;
                      if (modPracticeCount === 0) return null;
                      const stats = moduleProgressById[section.id];
                      const moduleDone =
                        stats && stats.total > 0 && stats.completed >= stats.total;
                      const practiceUnlockedStyle = moduleDone;
                      return (
                        <Tooltip
                          title={
                            moduleDone
                              ? `Open ${modPracticeCount} practice question${modPracticeCount !== 1 ? 's' : ''} for this module`
                              : 'Complete every lesson in this module to unlock module practice'
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
                                  'Complete every lesson in this module to unlock module practice'
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
                              py: 1.25,
                              px: 1.5,
                              borderRadius: 1,
                              cursor: moduleDone ? 'pointer' : 'not-allowed',
                              opacity: moduleDone ? 1 : 0.55,
                              bgcolor:
                                moduleDone && activeLessonId === modulePracticeRowId
                                  ? alpha(theme.palette.secondary.main, 0.12)
                                  : practiceUnlockedStyle
                                    ? alpha(theme.palette.secondary.main, 0.08)
                                    : 'transparent',
                              color:
                                moduleDone && activeLessonId === modulePracticeRowId
                                  ? 'secondary.main'
                                  : practiceUnlockedStyle
                                    ? 'secondary.darker'
                                    : 'text.primary',
                              '&:hover': {
                                bgcolor: moduleDone
                                  ? activeLessonId === modulePracticeRowId
                                    ? alpha(theme.palette.secondary.main, 0.16)
                                    : alpha(theme.palette.secondary.main, 0.12)
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
                                      ? theme.palette.secondary.main
                                      : practiceUnlockedStyle
                                      ? alpha(theme.palette.secondary.main, 0.6)
                                      : theme.palette.divider
                                  }`,
                                  bgcolor: 'common.black',
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
                                <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
                                  {section.title}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{ color: 'secondary.dark', fontWeight: 600 }}
                                  noWrap
                                >
                                  Non-graded Assessment
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
                    <Typography variant="caption" sx={{ color: 'text.secondary', px: 1.5 }}>
                      No lessons in this section.
                    </Typography>
                  )}
                </AccordionDetails>
              </Accordion>
            );
          })}

        </>
      )}

      {/* Feedback section */}
      <Accordion
        expanded={expandedSection === FEEDBACK_SECTION_ID}
        onChange={() => {
          setExpandedSection(expandedSection === FEEDBACK_SECTION_ID ? '' : FEEDBACK_SECTION_ID);
        }}
        disableGutters
        sx={{
          boxShadow: 'none',
          '&:before': { display: 'none' },
          borderBottom: `1px solid ${theme.palette.divider}`,
          ...(progressPercent < 100 && { opacity: 0.85 }),
        }}
      >
        <AccordionSummary
          expandIcon={<Iconify icon="eva:chevron-down-fill" width={20} />}
          sx={{
            minHeight: 48,
            '& .MuiAccordionSummary-content': { my: 1.5 },
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Feedback
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 1.5, pb: 2, px: 2 }}>
          {progressPercent < 100 ? (
            <Box
              sx={{
                py: 2,
                px: 1.5,
                borderRadius: 1,
                bgcolor: alpha(theme.palette.grey[500], 0.08),
                border: `1px dashed ${theme.palette.divider}`,
                textAlign: 'center',
              }}
            >
              <Iconify icon="solar:lock-keyhole-bold" width={32} sx={{ color: 'text.disabled', mb: 1 }} />
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                Complete all lessons to unlock feedback
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 0.5 }}>
                {completedCount} of {totalLessons} completed
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
                  borderRadius: 1,
                  bgcolor:
                    expandedSection === FEEDBACK_SECTION_ID
                      ? alpha(theme.palette.secondary.main, 0.08)
                      : 'transparent',
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      border: `2px solid ${theme.palette.secondary.main}`,
                      bgcolor:
                        expandedSection === FEEDBACK_SECTION_ID
                          ? theme.palette.secondary.main
                          : 'transparent',
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
                  <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
                    Give feedback
                  </Typography>
                </Stack>
              </Stack>

              <Box
                sx={{
                  mt: 2,
                  bgcolor: 'background.paper',
                  boxShadow: theme.customShadows.z4,
                  p: 2,
                  border: `1px solid ${theme.palette.divider}`,
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                  Course feedback
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

  return (
    <DashboardContent
      disablePadding
      sx={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        bgcolor: 'grey.50',
      }}
    >
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        bgcolor: 'grey.50',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          alignItems: { xs: 'stretch', md: 'stretch' },
        }}
      >
        {/* Left: own scroll; height matches row (desktop). */}
        <Box
          sx={{
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            width: { md: 360, lg: 400 },
            flexShrink: 0,
            minHeight: 0,
            alignSelf: 'stretch',
            overflowY: 'auto',
            overflowX: 'hidden',
            bgcolor: 'transparent',
            borderRight: `1px solid ${theme.palette.divider}`,
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
            overscrollBehavior: 'contain',
          }}
        >
          {courseSidebar}
        </Box>

        {/* Mobile drawer sidebar */}
        <Drawer
          anchor="left"
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          ModalProps={{ keepMounted: true }}
          PaperProps={{
            sx: {
              width: 320,
              bgcolor: 'background.paper',
            },
          }}
        >
          {courseSidebar}
        </Drawer>

        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            order: { xs: 1, md: 2 },
            overflowY: 'auto',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
            p: { xs: 2, md: 3 },
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
            // Isolated scroll from the left column
            overscrollBehavior: 'contain',
          }}
        >
          <Box sx={{ display: { xs: 'flex', md: 'none' }, mb: 1.5 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<Iconify icon="solar:filter-bold" width={18} />}
              onClick={() => setSidebarOpen(true)}
              sx={{ fontWeight: 600 }}
            >
              Course content
            </Button>
          </Box>
          {activeLessonId === FEEDBACK_LESSON_ID ? null : modulePracticeModuleId && course?.id ? (
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
                  bgcolor: practiceQuizOn ? 'background.paper' : 'transparent',
                  borderRadius: 0,
                  overflow: 'visible',
                  boxShadow: 'none',
                  border: 'none',
                }}
              >
                {practiceQuizOn ? (
                  <LearningModulePracticeQuiz
                    key={modulePracticeModuleId}
                    courseId={course.id}
                    moduleId={modulePracticeModuleId}
                    moduleTitle={modulePracticeModuleMeta.title || 'Module'}
                    questions={modulePracticeQuestions}
                    onBackToIntro={() => {
                      setSearchParams({ section: activeLessonId }, { replace: true });
                    }}
                  />
                ) : (
                  <LearningModulePracticeIntro
                    frameHeight={LESSON_FRAME_HEIGHT}
                    moduleTitle={modulePracticeModuleMeta.title || 'Module'}
                    questionCount={modulePracticeQuestions.length}
                    onStartTest={() =>
                      setSearchParams({ section: activeLessonId, practiceQuiz: '1' }, { replace: true })
                    }
                  />
                )}
              </Box>
            )
          ) : !activeLesson ? (
            <Box
              sx={{
                // borderRadius: 2,
                overflow: 'hidden',
                bgcolor: 'background.paper',
                boxShadow: theme.customShadows.z8,
                width: '100%',
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Box sx={{ position: 'relative', aspectRatio: '16/9', bgcolor: 'grey.900' }}>
                <Box
                  component="img"
                  src={course.image || ''}
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
              frameHeight={LESSON_FRAME_HEIGHT}
            />
          ) : hasAttachments && !hasVideo ? (
            <LessonDocumentViewer
              lesson={activeLesson}
              lessonId={activeLessonId}
              locked={activeLessonGateBlocked}
              viewedSectionIds={viewedSectionIds}
              setViewedSectionIds={setViewedSectionIds}
              frameHeight={LESSON_FRAME_HEIGHT}
            />
          ) : hasTextContent && !hasVideo ? (
            <LessonTextViewer
              html={activeLesson?.content || ''}
              lockedOverlay={lessonLockOverlay}
              frameHeight={LESSON_FRAME_HEIGHT}
            />
          ) : hasVideo ? (
            <LessonVideoPlayer
              key={`video-${activeLessonId || ''}-${embedUrl || ''}-${videoSrc || ''}`}
              embedUrl={!activeLessonGateBlocked ? embedUrl : null}
              videoSrc={!embedUrl && !activeLessonGateBlocked ? videoSrc : null}
              videoPoster={videoPoster}
              videoRef={videoRef}
              youtubeContainerRef={youtubeContainerRef}
              lockedOverlay={lessonLockOverlay}
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
              frameHeight={LESSON_FRAME_HEIGHT}
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
                    v.currentTime = Math.min(
                      resumeMeta.seconds,
                      Number.isFinite(v.duration) ? v.duration : resumeMeta.seconds
                    );
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
                // If already marked complete by watchtime, still allow full-duration sync above and stop here.
                if (prog.markedComplete) return;
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
              onSeeked={(e) => {
                const v = e.target;
                if (!v || embedUrl) return;
                if (sectionProgressData?.isCompleted || nativeVideoProgressRef.current.markedComplete) return;
                const durRounded = Math.round(Number(v.duration) || 0);
                const merged = mergeCoverageRangesPlayer(parseCoverageRangePairs(videoCoverageRangesRef.current));
                let maxAllowed = maxCoverageEndPlayer(merged);
                if (durRounded > 0) maxAllowed = Math.min(maxAllowed, durRounded);
                const progMax = Number(nativeVideoProgressRef.current.maxWatchedTimeline || 0);
                maxAllowed = Math.max(maxAllowed, progMax);
                const slack = 0.5;
                if (v.currentTime > maxAllowed + slack) {
                  try {
                    const cap = durRounded > 0 ? Math.min(maxAllowed, durRounded) : maxAllowed;
                    v.currentTime = Math.max(0, cap);
                  } catch {
                    // ignore seek errors
                  }
                }
                nativeVideoProgressRef.current.lastTime = v.currentTime;
              }}
              onTimeUpdate={() => {
                const v = videoRef.current;
                if (!v) return;
                const prog = nativeVideoProgressRef.current;
                if (prog.markedComplete) return;
                const required = effectiveRequiredSeconds(watchtimeSeconds, v.duration);
                const durRounded = Math.round(Number(v.duration) || 0);
                if (prog.isPlaying) {
                  const delta = Math.abs(v.currentTime - prog.lastTime);
                  if (delta <= 2.5) {
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
                } else {
                  prog.lastTime = v.currentTime;
                }
              }}
            />
          ) : (
            <Box
              sx={{
                px: 3,
                // borderRadius: 2,
                bgcolor: 'background.paper',
                boxShadow: theme.customShadows.z4,
                textAlign: 'center',
                border: `1px dashed ${theme.palette.divider}`,
                height: LESSON_FRAME_HEIGHT,
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

          {/* Global Previous / Next lesson navigation */}
          {activeLesson && flatLessons.length > 1 && (
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              spacing={2}
              sx={{ mt: 2 }}
            >
              <Button
                variant="outlined"
                startIcon={<Iconify icon="eva:arrow-ios-back-fill" />}
                onClick={goToPrevLesson}
                disabled={!prevLesson}
                sx={{ minWidth: 120 }}
              >
                Previous
              </Button>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {currentIndex >= 0 ? `${currentIndex + 1} / ${flatLessons.length}` : ''}
              </Typography>
              <LoadingButton
                variant="contained"
                endIcon={<Iconify icon="eva:arrow-ios-forward-fill" />}
                onClick={goToNextLesson}
                loading={nextLoading}
                disabled={!canGoNextLesson}
                sx={{ minWidth: 120 }}
              >
                Next
              </LoadingButton>
            </Stack>
          )}

          {/* Lesson notes — tab format */}
          {activeLesson && (
            <Box sx={{ mt: 2 }}>
              <Tabs
                value={0}
                sx={{
                  px: 0,
                  minHeight: 44,
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  '& .MuiTab-root': { minHeight: 44, typography: 'body2', fontWeight: 600 },
                  '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0' },
                }}
              >
                <Tab
                  label="Lesson notes"
                  icon={<Iconify icon="solar:document-text-bold" width={18} />}
                  iconPosition="start"
                />
              </Tabs>
              <Box sx={{ pt: 2 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                  {activeLesson?.description
                    ? activeLesson.description
                    : activeLesson && course?.description
                      ? (() => {
                          const paras = htmlToPlainText(course.description || '')
                            .split(/\n\n+/)
                            .filter(Boolean);
                          const idx = modules
                            .flatMap((m) => m.lessons || [])
                            .findIndex((l) => l.id === activeLesson.id);
                          const text = paras[idx] || paras[0];
                          return text || `Notes for "${activeLesson.title}" can be added here.`;
                        })()
                      : activeLesson
                        ? `Notes for "${activeLesson.title}" can be added here. Participants can take notes during the lesson.`
                        : 'Select a lesson to view or add notes.'}
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
      </Stack>
    </Box>

    </DashboardContent>
  );
}

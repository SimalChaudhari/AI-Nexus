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
import { createCourseReview, createSpeakerReview } from 'src/services/review.service';
import { speakerService } from 'src/services/speaker.service';
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
      duration: '—',
      videoUrl: s.videoUrl || null,
      description: s.description || null,
      content: s.content || null,
      watchtime: s.watchtime || null,
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
    isPlaying: false,
    markedComplete: false,
  });
  const imageSectionMarkedRef = useRef(false);
  const resumeSeekAppliedRef = useRef({ sectionId: null, seconds: 0, applied: false });
  viewedSectionIdsRef.current = viewedSectionIds;
  activeLessonIdRef.current = activeLessonId;
  courseIdRef.current = course?.id || null;

  const sendProgressUpdate = useCallback((courseId, sectionId, payload, useKeepalive = false) => {
    if (!courseId || !sectionId || !payload) return;
    const key = [
      courseId,
      sectionId,
      Number(payload.watchedDeltaSeconds || 0),
      Number(payload.lastPositionSeconds || 0),
      Number(payload.durationSeconds || 0),
      Boolean(payload.markCompleted),
    ].join('|');
    const now = Date.now();
    if (
      lastProgressPayloadRef.current.key === key &&
      now - lastProgressPayloadRef.current.at < 1200
    ) {
      return;
    }
    lastProgressPayloadRef.current = { key, at: now };
    if (useKeepalive) {
      courseService.updateSectionProgressOnUnload(courseId, sectionId, payload);
    } else {
      courseService.updateSectionProgress(courseId, sectionId, payload).catch(() => {});
    }
  }, []);

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
          autoPlayNextRef.current = Boolean(nextLessonMeta.videoUrl);
          setActiveLessonId(nextLessonMeta.id);
          setExpandedSection(nextLessonMeta.sectionId);
          setSearchParams({ section: nextLessonMeta.id }, { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [setSearchParams]);

  useEffect(() => {
    const flushSectionProgress = (useKeepalive = false) => {
      const courseId = courseIdRef.current;
      const sectionId = activeLessonIdRef.current;
      if (!courseId || !sectionId || sectionId === FEEDBACK_LESSON_ID) return;
      if (viewedSectionIdsRef.current.includes(sectionId)) return;

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
      const nativePending = Number(nativeProg?.pendingDeltaSeconds || 0);
      const ytPending = Number(ytProg?.pendingDeltaSeconds || 0);
      let nativeLiveDelta = 0;
      let ytLiveDelta = 0;
      if (nativeProg?.isPlaying && nativeVideo) {
        nativeLiveDelta = Math.max(
          0,
          Number(nativeVideo.currentTime || 0) - Number(nativeProg.lastTime || 0)
        );
      }
      if (ytProg?.isPlaying && ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
        try {
          ytLiveDelta = Math.max(
            0,
            Number(ytPlayer.getCurrentTime() || 0) - Number(ytProg.lastTime || 0)
          );
        } catch {
          ytLiveDelta = 0;
        }
      }
      const watchedDeltaSeconds = Math.round(
        Math.max(0, nativePending + ytPending + nativeLiveDelta + ytLiveDelta)
      );

      if (watchedDeltaSeconds <= 0 && lastPosition <= 0) return;

      const payload = {
        watchedDeltaSeconds,
        lastPositionSeconds: Math.round(lastPosition),
        durationSeconds: Math.round(duration || 0),
      };
      sendProgressUpdate(courseId, sectionId, payload, useKeepalive);

      nativeVideoProgressRef.current.pendingDeltaSeconds = 0;
      youtubeProgressRef.current.pendingDeltaSeconds = 0;
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

  const apiModules = playerContext?.modules || [];

  const modules = useMemo(() => {
    const fromApi = getCourseModulesFromApi(apiModules);
    if (fromApi && fromApi.length > 0) return fromApi;
    return getFallbackModules(playerContext?.course || course);
  }, [apiModules, playerContext?.course, course]);

  const flatLessons = useMemo(
    () =>
      modules.flatMap((sec) =>
        (sec.lessons || []).map((lesson) => ({ ...lesson, sectionId: sec.id }))
      ),
    [modules]
  );

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

  // Load speaker names for feedback section when course has speakerIds
  useEffect(() => {
    const ids = Array.isArray(course?.speakerIds) ? course.speakerIds : [];
    if (ids.length === 0) {
      setCourseSpeakers([]);
      setSpeakerReviews({});
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
  }, [course?.speakerIds]);

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
        ? modules.some((s) => (s.lessons || []).some((l) => l.id === activeLessonId))
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
    const sectionWithActiveLesson = modules.find((s) =>
      (s.lessons || []).some((l) => l.id === activeLessonId)
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

  // Reset image index and video progress when switching to a different lesson
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
      isPlaying: false,
      markedComplete: false,
    };
    imageSectionMarkedRef.current = false;
  }, [activeLessonId]);

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

  // Callback for when user has watched video long enough (used by native video and YouTube player)
  useEffect(() => {
    if (!course?.id || !activeLessonId) {
      videoWatchedEnoughRef.current = null;
      return undefined;
    }
    const sectionId = activeLessonId;
    videoWatchedEnoughRef.current = () => {
      completeSection(sectionId);
      nativeVideoProgressRef.current.markedComplete = true;
      youtubeProgressRef.current.markedComplete = true;
    };
    return () => {
      videoWatchedEnoughRef.current = null;
    };
  }, [course?.id, activeLessonId, completeSection]);

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
                  if (prog.isPlaying) {
                    const delta = Math.max(0, t - prog.lastTime);
                    prog.watchedSeconds += delta;
                    prog.pendingDeltaSeconds += delta;
                    if (requiredSec > 0 && prog.watchedSeconds >= requiredSec) {
                      prog.markedComplete = true;
                      if (intervalId) clearInterval(intervalId);
                      intervalId = null;
                      console.log(
                        '[Video progress] Section marked complete (watched',
                        Math.round(prog.watchedSeconds),
                        's / required',
                        requiredSec,
                        's)'
                      );
                      videoWatchedEnoughRef.current?.();
                    }
                  }
                  prog.lastTime = t;
                  if (!prog.markedComplete && requiredSec > 0 && t >= requiredSec - 1) {
                    prog.markedComplete = true;
                    if (intervalId) clearInterval(intervalId);
                    intervalId = null;
                    console.log(
                      '[Video progress] Section marked complete (reached time, currentTime',
                      Math.round(t),
                      's)'
                    );
                    videoWatchedEnoughRef.current?.();
                  }
                } catch (e) {
                  // ignore
                }
              }, 1000);
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
                    sendProgressUpdate(course.id, activeLessonId, {
                      watchedDeltaSeconds: Math.round(prog.pendingDeltaSeconds || 0),
                      lastPositionSeconds: Math.round(current),
                      durationSeconds: Math.round(d || 0),
                    });
                    prog.pendingDeltaSeconds = 0;
                  } catch {
                    // ignore
                  }
                }
                console.log('[Video] Pause');
              } else if (e.data === 0) {
                prog.isPlaying = false;
                console.log('[Video] Ended');
                if (!prog.markedComplete && player && player.getCurrentTime) {
                  try {
                    const t = player.getCurrentTime();
                    const d = typeof player.getDuration === 'function' ? player.getDuration() : 0;
                    if (course?.id && activeLessonId) {
                      sendProgressUpdate(course.id, activeLessonId, {
                        watchedDeltaSeconds: Math.round(prog.pendingDeltaSeconds || 0),
                        lastPositionSeconds: Math.round(t),
                        durationSeconds: Math.round(d || 0),
                      });
                      prog.pendingDeltaSeconds = 0;
                    }
                    const requiredSec = effectiveRequiredSeconds(watchtimeSeconds, d);
                    const reachedRequired = requiredSec > 0 && t >= requiredSec - 2;
                    const watchedToEnd = d > 0 && t >= d - 2;
                    if (reachedRequired || watchedToEnd) {
                      prog.markedComplete = true;
                      if (intervalId) clearInterval(intervalId);
                      intervalId = null;
                      console.log('[Video progress] Section marked complete (video ended)', {
                        currentTime: Math.round(t),
                        required: requiredSec,
                        duration: d ? Math.round(d) : null,
                      });
                      videoWatchedEnoughRef.current?.();
                      if (watchedToEnd) {
                        const currentId = activeLessonIdRef.current;
                        if (currentId && currentId !== FEEDBACK_LESSON_ID) {
                          const next = getNextLessonFromModules(modules, currentId);
                          if (next?.id) startAutoNextCountdown(next);
                        }
                      }
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

  const currentIndex = activeLessonIndex;
  const prevLesson = currentIndex > 0 ? flatLessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex >= 0 && currentIndex < flatLessons.length - 1
      ? flatLessons[currentIndex + 1]
      : null;

  // Lock state is driven only by backend `sectionProgressData.isLocked`.
  activeLessonProgressPending = false;
  activeLessonGateBlocked = activeLessonContentLocked;

  const goToPrevLesson = () => {
    if (prevLesson) {
      setActiveLessonId(prevLesson.id);
      setExpandedSection(prevLesson.sectionId);
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
      // Ensure current lesson progress is saved as completed before moving on
      const currentId = activeLessonIdRef.current;
      const courseId = courseIdRef.current;
      if (authenticated && courseId && isUuid(currentId)) {
        await sendProgressUpdate(courseId, currentId, { markCompleted: true }, false);
      }

      autoPlayNextRef.current = Boolean(nextLesson.videoUrl);
      setActiveLessonId(nextLesson.id);
      setExpandedSection(nextLesson.sectionId);
    } finally {
      // no-op, kept for symmetry
    }
  };
  // Whether "Next" button should be enabled (respects locking/completion)
  let canGoNextLesson = Boolean(nextLesson);
  if (nextLesson && flatLessons.length > 0) {
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
            const sectionHasActiveLesson = (section.lessons || []).some((l) => l.id === activeLessonId);
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
                                {lessonHasVideo
                                  ? 'Video lesson'
                                  : lessonHasImages
                                    ? `Images • ${lesson.images.length}`
                                    : Array.isArray(lesson.attachments) && lesson.attachments.length > 0
                                      ? `Files • ${lesson.attachments.length}`
                                    : lesson.content
                                      ? 'Text lesson'
                                      : 'Lesson'}
                              </Typography>
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
    <DashboardContent sx={{ bgcolor: 'grey.50' }}>
    <Box
      sx={{
        minHeight: { xs: '100vh', md: '90vh' },
        bgcolor: 'grey.50',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        sx={{ flex: 1, minHeight: 0, alignItems: { md: 'flex-start' } }}
      >
        {/* Left filter-style sidebar (desktop) */}
        <Box
          sx={{
            display: { xs: 'none', md: 'block' },
            width: { md: 360, lg: 400 },
            flexShrink: 0,
            alignSelf: { md: 'flex-start' },
            minHeight: 0,
            maxHeight: courseContentExpanded ? { md: 'calc(100vh - 16px)' } : undefined,
            overflowY: courseContentExpanded ? 'auto' : 'visible',
            overflowX: 'hidden',
            bgcolor: 'transparent',
            borderRight: `1px solid ${theme.palette.divider}`,
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
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
            minHeight: { md: 0 },
            order: { xs: 1, md: 2 },
            overflowY: { md: 'auto' },
            p: { xs: 2, md: 3 },
            scrollbarWidth: { md: 'none' },
            msOverflowStyle: { md: 'none' },
            '&::-webkit-scrollbar': { display: 'none' },
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
          {activeLessonId === FEEDBACK_LESSON_ID ? null : !activeLesson ? (
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
                  sendProgressUpdate(course.id, activeLessonId, {
                    watchedDeltaSeconds: Math.round(prog.pendingDeltaSeconds || 0),
                    lastPositionSeconds: Math.round(v.currentTime || 0),
                    durationSeconds: Math.round(v.duration || 0),
                  });
                  prog.pendingDeltaSeconds = 0;
                }
                console.log('[Video] Pause');
              }}
              onEnded={() => {
                const v = videoRef.current;
                if (!v) return;
                const prog = nativeVideoProgressRef.current;
                if (prog.markedComplete) return;
                const required = effectiveRequiredSeconds(watchtimeSeconds, v.duration);
                const t = v.currentTime;
                const d = v.duration;
                if (course?.id && activeLessonId) {
                  sendProgressUpdate(course.id, activeLessonId, {
                    watchedDeltaSeconds: Math.round(prog.pendingDeltaSeconds || 0),
                    lastPositionSeconds: Math.round(t || 0),
                    durationSeconds: Math.round(d || 0),
                  });
                  prog.pendingDeltaSeconds = 0;
                }
                const reachedRequired = required > 0 && t >= required - 2;
                const watchedToEnd = Number.isFinite(d) && t >= d - 2;
                if (reachedRequired || watchedToEnd) {
                  prog.markedComplete = true;
                  console.log('[Video progress] Section marked complete (video ended)', {
                    currentTime: Math.round(t),
                    required,
                  });
                  videoWatchedEnoughRef.current?.();
                  if (watchedToEnd && nextLesson?.id) {
                    startAutoNextCountdown(nextLesson);
                  }
                }
              }}
              onTimeUpdate={() => {
                const v = videoRef.current;
                if (!v) return;
                const prog = nativeVideoProgressRef.current;
                if (prog.markedComplete) return;
                const required = effectiveRequiredSeconds(watchtimeSeconds, v.duration);
                if (prog.isPlaying) {
                  const delta = Math.max(0, v.currentTime - prog.lastTime);
                  prog.watchedSeconds += delta;
                  prog.pendingDeltaSeconds += delta;
                  prog.lastTime = v.currentTime;
                  if (required > 0 && prog.watchedSeconds >= required) {
                    prog.markedComplete = true;
                    console.log(
                      '[Video progress] Section marked complete (watched',
                      Math.round(prog.watchedSeconds),
                      's / required',
                      required,
                      's)'
                    );
                    videoWatchedEnoughRef.current?.();
                  }
                } else {
                  prog.lastTime = v.currentTime;
                }
                if (!prog.markedComplete && required > 0 && v.currentTime >= required - 1) {
                  prog.markedComplete = true;
                  console.log(
                    '[Video progress] Section marked complete (reached time, currentTime',
                    Math.round(v.currentTime),
                    's)'
                  );
                  videoWatchedEnoughRef.current?.();
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
              <Button
                variant="contained"
                endIcon={<Iconify icon="eva:arrow-ios-forward-fill" />}
                onClick={goToNextLesson}
                disabled={!canGoNextLesson}
                sx={{ minWidth: 120 }}
              >
                Next
              </Button>
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

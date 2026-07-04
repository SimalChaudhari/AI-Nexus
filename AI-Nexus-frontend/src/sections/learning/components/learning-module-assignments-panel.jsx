import { useCallback, useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { courseService } from 'src/services/course.service';
import { resolveAssetUrl } from 'src/utils/asset-url';
import {
  isSubmissionDraft,
  isSubmissionPassedLocked,
  mapSubmissionFromApi,
} from 'src/sections/dashboard/course/assignment-submissions/course-assignment-submissions-utils';
import { playerScrollPanelSx } from 'src/sections/learning/utils/player-responsive-type';
import {
  LearningAssessmentStepFlow,
} from 'src/sections/learning/components/learning-assessment-step-flow';

// ----------------------------------------------------------------------

export function LearningModuleAssignmentsPanel({
  courseId,
  moduleTitle,
  assignments,
  onAssignmentsChange,
  onAssessmentCompleted,
  fillContainer = false,
}) {
  const theme = useTheme();
  const [items, setItems] = useState(assignments || []);
  const singleItem = items.length === 1;

  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    setItems(assignments || []);
  }, [assignments]);

  useEffect(() => {
    if (!items.length) return;
    const openIds = items
      .filter((item) => !isSubmissionPassedLocked(item?.mySubmission))
      .map((item) => item.id);
    if (openIds.length === 1) {
      setExpandedId(openIds[0]);
      return;
    }
    if (items.every((item) => isSubmissionPassedLocked(item?.mySubmission))) {
      setExpandedId(null);
    }
  }, [items]);

  useEffect(() => {
    if (!courseId || !assignments?.length) return undefined;
    let active = true;

    courseService
      .getAssignmentSubmissions(courseId)
      .then((rows) => {
        if (!active) return;
        const byQuestionId = new Map(
          (rows || []).map((row) => [row.questionId, mapSubmissionFromApi(row)])
        );
        setItems((prev) => {
          const base = prev.length ? prev : assignments || [];
          const next = base.map((item) => ({
            ...item,
            mySubmission: byQuestionId.get(item.id) || null,
          }));
          onAssignmentsChange?.(next);
          return next;
        });
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [courseId, assignments, onAssignmentsChange]);

  useEffect(() => {
    if (!courseId) return undefined;
    const needsPoll = items.some(
      (item) =>
        item.mySubmission &&
        (item.mySubmission.evaluationStatus === 'pending' ||
          item.mySubmission.evaluationStatus === 'processing')
    );
    if (!needsPoll) return undefined;

    const timer = setInterval(() => {
      courseService
        .getAssignmentSubmissions(courseId)
        .then((rows) => {
          const byQuestionId = new Map(
            (rows || []).map((row) => [row.questionId, mapSubmissionFromApi(row)])
          );
          setItems((prev) => {
            const next = prev.map((item) => ({
              ...item,
              mySubmission: byQuestionId.get(item.id) || item.mySubmission || null,
            }));
            onAssignmentsChange?.(next);
            if (next.some((item) => isSubmissionPassedLocked(item.mySubmission))) {
              onAssessmentCompleted?.();
            }
            return next;
          });
        })
        .catch(() => undefined);
    }, 5000);

    return () => clearInterval(timer);
  }, [courseId, items, onAssignmentsChange, onAssessmentCompleted]);

  const handleUploaded = useCallback(
    (questionId, row) => {
      setItems((prev) => {
        const next = prev.map((item) =>
          item.id === questionId ? { ...item, mySubmission: mapSubmissionFromApi(row) } : item
        );
        onAssignmentsChange?.(next);
        return next;
      });
    },
    [onAssignmentsChange]
  );

  const handleDeleted = useCallback(
    (questionId) => {
      setItems((prev) => {
        const next = prev.map((item) =>
          item.id === questionId ? { ...item, mySubmission: null } : item
        );
        onAssignmentsChange?.(next);
        return next;
      });
    },
    [onAssignmentsChange]
  );

  const handleToggle = useCallback((id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  if (!items.length) return null;

  const submittedCount = items.filter((a) => a.mySubmission && !isSubmissionDraft(a.mySubmission)).length;
  const passedCount = items.filter((a) => isSubmissionPassedLocked(a.mySubmission)).length;
  const progressPercent = items.length > 0 ? Math.round((submittedCount / items.length) * 100) : 0;
  const allDone = submittedCount === items.length;
  const allPassed = passedCount === items.length;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        bgcolor: 'background.paper',
        ...(fillContainer
          ? { flex: 1, minHeight: 0, height: '100%', overflow: 'hidden' }
          : { minHeight: { xs: 300, sm: 360 } }),
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{
          flexShrink: 0,
          px: { xs: 1.5, md: 2 },
          py: 1,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: 0.75,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha(theme.palette.warning.main, 0.12),
            color: 'warning.dark',
            flexShrink: 0,
          }}
        >
          <Iconify icon="solar:document-add-bold" width={18} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
            {moduleTitle}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {submittedCount}/{items.length} submitted
          </Typography>
        </Box>
        <Chip
          size="small"
          label={`${progressPercent}%`}
          color={allPassed ? 'success' : allDone ? 'warning' : 'default'}
          variant="soft"
          sx={{ fontWeight: 700, height: 22 }}
        />
      </Stack>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          ...(fillContainer ? playerScrollPanelSx : { overflowY: 'auto', overflowX: 'hidden' }),
        }}
      >
        <Box sx={{ px: { xs: 1.5, md: 2 }, pt: 0.75, pb: 0.5 }}>
          <LinearProgress
            variant="determinate"
            value={progressPercent}
            color={allPassed ? 'success' : allDone ? 'warning' : 'primary'}
            sx={{ height: 4, borderRadius: 999, bgcolor: alpha(theme.palette.grey[500], 0.1) }}
          />
        </Box>

        <Box>
          {items.map((assignment, index) => {
            const assignmentGuideUrl = assignment.guideFileUrl || assignment.referenceFileUrl;
            const assignmentHasGuide = Boolean(assignmentGuideUrl);
            const assignmentGuideName =
              assignment.guideFileName || assignment.referenceFileName || 'Guideline';

            return (
            <LearningAssessmentStepFlow
              key={assignment.id}
              index={index}
              courseId={courseId}
              assignment={assignment}
              submission={assignment.mySubmission}
              guideFileUrl={assignmentHasGuide ? resolveAssetUrl(assignmentGuideUrl) : null}
              guideFileName={assignmentGuideName}
              singleItem={singleItem}
              expanded={expandedId === assignment.id}
              onToggle={() => handleToggle(assignment.id)}
              onUploaded={handleUploaded}
              onDeleted={handleDeleted}
            />
            );
          })}
        </Box>
      </Box>

      <Stack
        direction="row"
        alignItems="center"
        justifyContent="flex-end"
        sx={{
          flexShrink: 0,
          px: { xs: 1.5, md: 2 },
          py: 0.75,
          borderTop: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Chip
          size="small"
          label={allPassed ? 'All passed' : allDone ? 'All submitted' : `${items.length - submittedCount} pending`}
          color={allPassed ? 'success' : allDone ? 'warning' : 'default'}
          variant="soft"
          sx={{ fontWeight: 700, height: 22 }}
        />
      </Stack>
    </Box>
  );
}

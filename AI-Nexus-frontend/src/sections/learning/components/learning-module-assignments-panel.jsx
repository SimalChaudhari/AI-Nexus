import { useCallback, useEffect, useRef, useState } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { Upload } from 'src/components/upload';
import { LessonLearningMaterialsPanel } from './lesson-learning-materials-panel';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { toast } from 'src/components/snackbar';
import { courseService } from 'src/services/course.service';
import { resolveAssetUrl } from 'src/utils/asset-url';
import {
  canShowVerificationLog,
  formatSubmissionAttemptLabel,
  getSubmissionAttemptCount,
  getSubmissionEvaluationDisplay,
  isSubmissionPassedLocked,
  mapSubmissionFromApi,
} from 'src/sections/dashboard/course/assignment-submissions/course-assignment-submissions-utils';
import { CourseAssignmentVerificationLogDialog } from 'src/sections/dashboard/course/assignment-submissions/course-assignment-verification-log-dialog';
import {
  playerScrollPanelSx,
} from 'src/sections/learning/utils/player-responsive-type';

// ----------------------------------------------------------------------

const GRID_COLUMNS = {
  md: '52px minmax(280px, 1fr) minmax(168px, 200px)',
};

function formatDateTime(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function useAssignmentUpload(courseId, assignment, submission, onUploaded, onDeleted) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const openPicker = () => inputRef.current?.click();

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !courseId || !assignment?.id) return;
    if (isSubmissionPassedLocked(submission)) {
      toast.error('This assessment is already passed. You cannot replace the file.');
      return;
    }
    setUploading(true);
    try {
      const row = await courseService.uploadAssignmentSubmission(courseId, assignment.id, file);
      toast.success(submission ? 'Assessment file replaced' : 'Assessment uploaded');
      onUploaded?.(assignment.id, mapSubmissionFromApi(row));
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const performDelete = async () => {
    if (!courseId || !assignment?.id || !submission) return;
    if (isSubmissionPassedLocked(submission)) {
      toast.error('This assessment is already passed. You cannot delete the file.');
      return;
    }
    setDeleting(true);
    try {
      await courseService.deleteAssignmentSubmission(courseId, assignment.id);
      toast.success('Assessment file deleted');
      onDeleted?.(assignment.id);
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      hidden
      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.zip,.rar,.png,.jpg,.jpeg,.webp"
      onChange={handleFileChange}
    />
  );

  return { uploading, deleting, openPicker, performDelete, fileInput };
}

// ----------------------------------------------------------------------

function SubmissionSummary({ submission }) {
  const theme = useTheme();
  const submitted = Boolean(submission);
  const submittedAt = submitted ? formatDateTime(submission.uploadedAt) : null;
  const evaluation = submitted ? getSubmissionEvaluationDisplay(submission) : null;
  const statusColor =
    evaluation?.color === 'success'
      ? theme.palette.success.main
      : evaluation?.color === 'error'
        ? theme.palette.error.main
        : evaluation?.color === 'warning'
          ? theme.palette.warning.main
          : evaluation?.color === 'info'
            ? theme.palette.info.main
            : submitted
              ? theme.palette.success.main
              : theme.palette.warning.main;
  const statusLabel = submitted
    ? evaluation?.label || 'Submitted'
    : 'Pending';
  const attemptCount = submitted ? getSubmissionAttemptCount(submission) : 0;

  return (
    <Stack
      direction="row"
      spacing={0.75}
      alignItems="center"
      flexWrap="wrap"
      sx={{
        mt: 0.25,
        py: 0.5,
        px: 0.75,
        borderRadius: 1,
        width: 'fit-content',
        maxWidth: 1,
        bgcolor: alpha(statusColor, 0.06),
        borderLeft: `2px solid ${alpha(statusColor, 0.55)}`,
      }}
    >
      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 0 }}>
        <Box
          sx={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            flexShrink: 0,
            bgcolor: statusColor,
            boxShadow: `0 0 0 3px ${alpha(statusColor, 0.18)}`,
          }}
        />
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            color: statusColor,
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
          }}
        >
          {statusLabel}
        </Typography>
      </Stack>

      <Typography
        variant="caption"
        sx={{
          color: 'text.disabled',
          lineHeight: 1,
          userSelect: 'none',
        }}
      >
        ·
      </Typography>

      <Typography
        variant="caption"
        sx={{
          color: submitted ? 'text.secondary' : 'text.disabled',
          fontWeight: submitted ? 500 : 400,
          lineHeight: 1.3,
          wordBreak: 'break-word',
        }}
      >
        {submittedAt || 'Not submitted yet'}
      </Typography>

      {submitted && attemptCount > 0 ? (
        <>
          <Typography variant="caption" sx={{ color: 'text.disabled', lineHeight: 1 }}>
            ·
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontWeight: 600,
              lineHeight: 1.3,
              whiteSpace: 'nowrap',
            }}
          >
            {formatSubmissionAttemptLabel(submission)}
          </Typography>
        </>
      ) : null}

      {evaluation?.detail ? (
        <>
          <Typography variant="caption" sx={{ color: 'text.disabled', lineHeight: 1 }}>
            ·
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.3 }}>
            {evaluation.detail}
          </Typography>
        </>
      ) : null}
    </Stack>
  );
}

function ActionColumn({ submission, uploading, deleting, openPicker, onDeleteClick, fileInput }) {
  const theme = useTheme();
  const fileUrl = submission ? resolveAssetUrl(submission.fileUrl) : null;
  const fileName = submission?.originalFileName;
  const busy = uploading || deleting;
  const isLocked = isSubmissionPassedLocked(submission);

  const iconButtonSx = {
    width: 36,
    height: 36,
    borderRadius: 1.25,
    border: `1px solid ${alpha(theme.palette.grey[500], 0.22)}`,
    bgcolor: 'background.paper',
    '&:hover': {
      bgcolor: alpha(theme.palette.primary.main, 0.06),
      borderColor: alpha(theme.palette.primary.main, 0.35),
    },
  };

  const deleteButtonSx = {
    ...iconButtonSx,
    color: 'error.main',
    '&:hover': {
      bgcolor: alpha(theme.palette.error.main, 0.08),
      borderColor: alpha(theme.palette.error.main, 0.35),
    },
  };

  return (
    <Stack
      spacing={0.75}
      alignItems={{ xs: 'flex-start', md: 'flex-end' }}
      sx={{ minWidth: { md: 168 }, width: 1 }}
    >
      {!isLocked ? fileInput : null}
      <Stack direction="row" spacing={0.5} justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
        {submission ? (
          <Tooltip title="View file" arrow>
            <IconButton
              size="small"
              component="a"
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              disabled={busy}
              sx={{ ...iconButtonSx, color: 'primary.main' }}
            >
              <Iconify icon="solar:eye-bold" width={18} />
            </IconButton>
          </Tooltip>
        ) : null}
        {!isLocked ? (
          <>
            <Tooltip title={uploading ? 'Uploading…' : submission ? 'Replace file' : 'Upload file'} arrow>
              <span>
                <IconButton
                  size="small"
                  disabled={busy}
                  onClick={openPicker}
                  sx={{
                    ...iconButtonSx,
                    color: submission ? 'text.secondary' : 'primary.main',
                    ...(submission
                      ? {}
                      : {
                          bgcolor: alpha(theme.palette.primary.main, 0.08),
                          borderColor: alpha(theme.palette.primary.main, 0.28),
                        }),
                  }}
                >
                  {uploading ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    <Iconify icon={submission ? 'solar:refresh-bold' : 'solar:upload-bold'} width={18} />
                  )}
                </IconButton>
              </span>
            </Tooltip>
            {submission ? (
              <Tooltip title={deleting ? 'Deleting…' : 'Delete file'} arrow>
                <span>
                  <IconButton
                    size="small"
                    disabled={busy}
                    onClick={onDeleteClick}
                    sx={deleteButtonSx}
                  >
                    {deleting ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : (
                      <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                    )}
                  </IconButton>
                </span>
              </Tooltip>
            ) : null}
          </>
        ) : null}
      </Stack>

      {isLocked ? (
        <Typography variant="caption" color="success.main" sx={{ textAlign: { xs: 'left', md: 'right' }, width: 1 }}>
          Passed — file locked
        </Typography>
      ) : fileName ? (
        <Typography
          variant="caption"
          sx={{
            width: 1,
            fontWeight: 600,
            color: 'text.secondary',
            wordBreak: 'break-word',
            lineHeight: 1.4,
            textAlign: { xs: 'left', md: 'right' },
          }}
        >
          {fileName}
        </Typography>
      ) : (
        <Typography variant="caption" color="text.disabled" sx={{ textAlign: { xs: 'left', md: 'right' }, width: 1 }}>
          No file yet
        </Typography>
      )}
    </Stack>
  );
}

// ----------------------------------------------------------------------

function AssignmentListHeader() {
  return (
    <Box
      sx={{
        display: { xs: 'none', md: 'grid' },
        gridTemplateColumns: GRID_COLUMNS.md,
        gap: 2,
        px: 2.5,
        py: 1.25,
        bgcolor: (theme) => alpha(theme.palette.grey[500], 0.06),
        borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
      }}
    >
      {['#', 'Assessment', 'Action'].map((label) => (
        <Typography
          key={label}
          variant="caption"
          align={label === 'Action' ? 'right' : 'left'}
          sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}
        >
          {label}
        </Typography>
      ))}
    </Box>
  );
}

function AssignmentRow({ index, courseId, assignment, onUploaded, onDeleted }) {
  const theme = useTheme();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const submission = assignment.mySubmission;
  const { uploading, deleting, openPicker, performDelete, fileInput } = useAssignmentUpload(
    courseId,
    assignment,
    submission,
    onUploaded,
    onDeleted
  );

  const handleDropUpload = async (acceptedFiles) => {
    const file = Array.isArray(acceptedFiles) ? acceptedFiles[0] : acceptedFiles;
    if (!file) return;
    if (isSubmissionPassedLocked(submission)) {
      toast.error('This assessment is already passed. You cannot replace the file.');
      return;
    }
    try {
      // show local uploading state via toast and rely on onUploaded to update UI
      const row = await courseService.uploadAssignmentSubmission(courseId, assignment.id, file);
        toast.success(submission ? 'Assessment file replaced' : 'Assessment uploaded');
      onUploaded?.(assignment.id, mapSubmissionFromApi(row));
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Upload failed');
    }
  };

  const handleConfirmDelete = async () => {
    setDeleteOpen(false);
    await performDelete();
  };

  return (
    <>
      <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: GRID_COLUMNS.md },
        gap: { xs: 1.25, md: 2 },
        px: { xs: 2, md: 2.5 },
        py: { xs: 2, md: 1.75 },
        alignItems: { md: 'start' },
        bgcolor: submission ? alpha(theme.palette.success.main, 0.025) : 'background.paper',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: { md: 'center' } }}>
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            color: 'primary.main',
            fontWeight: 800,
            fontSize: '0.8125rem',
          }}
        >
          {index + 1}
        </Box>
      </Box>

      <Box sx={{ minWidth: 0, gridColumn: { xs: '1 / -1', md: 'auto' } }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5, display: { md: 'none' } }}>
          <Typography variant="caption" fontWeight={800} color="primary.main">
            Assessment {index + 1}
          </Typography>
        </Stack>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.45 }}>
          {assignment.prompt}
        </Typography>
        {!submission && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
               No file yet — use the upload button on the right to submit your assessment.
            </Typography>
          </Box>
        )}

        {submission ? (
          <Box sx={{ mt: 1.5 }}>
            <SubmissionSummary submission={submission} />
            {canShowVerificationLog(submission) ? (
              <Button
                size="small"
                variant="text"
                sx={{ mt: 0.75, px: 0.5 }}
                startIcon={<Iconify icon="solar:document-text-bold" width={16} />}
                onClick={() => setLogOpen(true)}
              >
                View AI verification log
              </Button>
            ) : null}
          </Box>
        ) : null}

        {submission ? (
          <Box sx={{ mt: 2 }}>
            <LessonLearningMaterialsPanel materials={[resolveAssetUrl(submission.fileUrl)]} />
          </Box>
        ) : null}
        {assignment.explanation ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.5, fontSize: '0.8125rem' }}>
            {assignment.explanation}
          </Typography>
        ) : null}
        {assignment.referenceFileUrl ? (
          <Box sx={{ mt: 1 }}>
            <Button
              size="small"
              component="a"
              href={resolveAssetUrl(assignment.referenceFileUrl)}
              target="_blank"
              rel="noopener noreferrer"
              startIcon={<Iconify icon="solar:download-bold" width={16} />}
            >
              {assignment.referenceFileName || 'Download reference'}
            </Button>
          </Box>
        ) : null}
      </Box>

      <Box sx={{ gridColumn: { xs: '1 / -1', md: 'auto' }, alignSelf: { md: 'start' }, pt: { md: 0.25 } }}>
        <ActionColumn
          submission={submission}
          uploading={uploading}
          deleting={deleting}
          openPicker={openPicker}
          onDeleteClick={() => setDeleteOpen(true)}
          fileInput={fileInput}
        />
      </Box>
    </Box>

      <CourseAssignmentVerificationLogDialog
        open={logOpen}
        submission={submission}
        onClose={() => setLogOpen(false)}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
          title="Delete assessment file"
        content="Remove your uploaded file? You can upload again later."
        action={
          <Button variant="contained" color="error" disabled={deleting} onClick={handleConfirmDelete}>
            Delete
          </Button>
        }
      />
    </>
  );
}

// ----------------------------------------------------------------------

export function LearningModuleAssignmentsPanel({
  courseId,
  moduleTitle,
  assignments,
  onAssignmentsChange,
  fillContainer = false,
}) {
  const theme = useTheme();
  const [items, setItems] = useState(assignments || []);

  useEffect(() => {
    setItems(assignments || []);
  }, [assignments]);

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
            return next;
          });
        })
        .catch(() => undefined);
    }, 5000);

    return () => clearInterval(timer);
  }, [courseId, items, onAssignmentsChange]);

  const handleUploaded = useCallback(
    (questionId, row) => {
      setItems((prev) => {
        const next = prev.map((item) =>
          item.id === questionId
            ? {
                ...item,
                mySubmission: mapSubmissionFromApi(row),
              }
            : item
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

  if (!items.length) return null;

  const submittedCount = items.filter((a) => a.mySubmission).length;
  const progressPercent = items.length > 0 ? Math.round((submittedCount / items.length) * 100) : 0;
  const allDone = submittedCount === items.length;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        bgcolor: 'background.paper',
        ...(fillContainer
          ? { flex: 1, minHeight: 0, height: '100%', overflow: 'hidden' }
          : { minHeight: { xs: 360, sm: 420 } }),
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{
          flexShrink: 0,
          px: { xs: 2, md: 3 },
          py: 1.5,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha(theme.palette.warning.main, 0.12),
            color: 'warning.dark',
            flexShrink: 0,
          }}
        >
          <Iconify icon="solar:document-add-bold" width={20} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 600, whiteSpace: 'normal', wordBreak: 'break-word' }}
          >
            {moduleTitle}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
            Assessment · {submittedCount} of {items.length} submitted
          </Typography>
        </Box>
        <Chip
          size="small"
          label={`${progressPercent}%`}
          color={allDone ? 'success' : 'default'}
          variant="soft"
          sx={{ fontWeight: 700, flexShrink: 0 }}
        />
      </Stack>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          ...(fillContainer ? playerScrollPanelSx : { overflowY: 'auto', overflowX: 'hidden' }),
        }}
      >
        <Box sx={{ px: { xs: 0, md: 0 } }}>
          <Box sx={{ px: { xs: 2, md: 3 }, pt: 1.5, pb: 1 }}>
            <LinearProgress
              variant="determinate"
              value={progressPercent}
              color={allDone ? 'success' : 'primary'}
              sx={{ height: 5, borderRadius: 999, bgcolor: alpha(theme.palette.grey[500], 0.1) }}
            />
          </Box>
          <Box
            sx={{
              position: 'sticky',
              top: 0,
              zIndex: 1,
              bgcolor: 'background.paper',
            }}
          >
            <AssignmentListHeader />
          </Box>
          <Stack divider={<Box sx={{ borderTop: `1px solid ${theme.palette.divider}` }} />}>
            {items.map((assignment, index) => (
              <AssignmentRow
                key={assignment.id}
                index={index}
                courseId={courseId}
                assignment={assignment}
                onUploaded={handleUploaded}
                onDeleted={handleDeleted}
              />
            ))}
          </Stack>
        </Box>
      </Box>

      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{
          flexShrink: 0,
          px: { xs: 2, sm: 3, md: 3 },
          py: { xs: 1.5, sm: 2 },
          borderTop: `1px solid ${theme.palette.divider}`,
          bgcolor: 'background.paper',
          boxShadow: (t) => `0 -4px 16px -4px ${alpha(t.palette.grey[500], 0.2)}`,
        }}
      >
        <Typography variant="caption" color="text.secondary">
          PDF, Word, Excel, PowerPoint, images, or ZIP
        </Typography>
        <Chip
          size="small"
          label={allDone ? 'All submitted' : `${items.length - submittedCount} pending`}
          color={allDone ? 'success' : 'warning'}
          variant="soft"
          sx={{ fontWeight: 700 }}
        />
      </Stack>
    </Box>
  );
}

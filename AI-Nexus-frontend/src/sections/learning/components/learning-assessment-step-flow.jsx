import { useCallback, useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Collapse from '@mui/material/Collapse';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { Upload } from 'src/components/upload';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { toast } from 'src/components/snackbar';
import { courseService } from 'src/services/course.service';
import { resolveAssetUrl } from 'src/utils/asset-url';
import {
  getSubmissionEvaluationDisplay,
  getSubmissionFileList,
  isSubmissionDraft,
  mapSubmissionFromApi,
} from 'src/sections/dashboard/course/assignment-submissions/course-assignment-submissions-utils';
import { LEARNER_SUBMISSION_ACCEPT } from 'src/sections/dashboard/course/question-bank/course-question-bank-utils';

// ----------------------------------------------------------------------

export const FULL_STEP_LABELS = ['Guidelines', 'Assessment', 'Submit'];
export const SHORT_STEP_LABELS = ['Assessment', 'Submit'];

function getStepConfig(hasGuide) {
  if (hasGuide) {
    return { labels: FULL_STEP_LABELS, guidelines: 0, assessment: 1, submit: 2 };
  }
  return { labels: SHORT_STEP_LABELS, guidelines: null, assessment: 0, submit: 1 };
}

function formatDateTime(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function guideAckStorageKey(courseId, assignmentId) {
  return `learning-assessment-guide-ack:${courseId}:${assignmentId}`;
}

function normalizeAssessmentResources(files, legacyUrl, legacyName, fallbackName) {
  const records = Array.isArray(files) && files.length
    ? files
    : legacyUrl
      ? [{ fileUrl: legacyUrl, originalFileName: legacyName || fallbackName }]
      : [];
  return records
    .filter((file) => file?.fileUrl)
    .map((file) => ({
      ...file,
      href: resolveAssetUrl(file.fileUrl),
      name: file.originalFileName || fallbackName,
    }));
}

function StepCard({ children, accentColor }) {
  const theme = useTheme();
  const color = accentColor || theme.palette.primary.main;
  return (
    <Box
      sx={{
        p: 1.25,
        borderRadius: 1.25,
        border: `1px solid ${alpha(color, 0.2)}`,
        bgcolor: alpha(color, 0.04),
      }}
    >
      {children}
    </Box>
  );
}

function ResourceDownloadLink({ href, label, icon, color = 'warning', fileName }) {
  const theme = useTheme();
  const main = theme.palette[color]?.main || theme.palette.primary.main;

  return (
    <Box
      component="a"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={fileName || undefined}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        px: 1.25,
        py: 0.5,
        borderRadius: 999,
        border: `1px solid ${alpha(main, 0.45)}`,
        color: main,
        textDecoration: 'none',
        fontWeight: 700,
        fontSize: '0.8125rem',
        lineHeight: 1.3,
        width: 'fit-content',
        maxWidth: '100%',
        '&:hover': {
          bgcolor: alpha(main, 0.08),
        },
      }}
    >
      <Iconify icon={icon} width={16} sx={{ flexShrink: 0 }} />
      {label}
    </Box>
  );
}

function StepInlineRow({ leading, actions }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1,
        flexWrap: 'wrap',
        width: 1,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1,
          flex: '1 1 auto',
          minWidth: 0,
        }}
      >
        {leading}
      </Box>
      {actions ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            flexWrap: 'nowrap',
            gap: 1,
            flexShrink: 0,
            ml: 'auto',
          }}
        >
          {actions}
        </Box>
      ) : null}
    </Box>
  );
}

function StepActionRow({ children }) {
  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      justifyContent="flex-end"
      flexWrap="wrap"
      useFlexGap
      sx={{ width: 1, pt: 0.25 }}
    >
      {children}
    </Stack>
  );
}

export function GuidelinesStepCard({
  guideFiles,
  checked,
  onCheckedChange,
  onContinue,
  alreadyAcknowledged = false,
}) {
  const theme = useTheme();

  return (
    <StepCard accentColor={theme.palette.warning.main}>
      <Stack spacing={1}>
        <StepInlineRow
          leading={
            guideFiles?.length ? (
              guideFiles.map((file, index) => (
                <ResourceDownloadLink
                  key={`${file.fileUrl}-${index}`}
                  href={file.href}
                  label={file.name}
                  icon="solar:download-bold"
                  color="warning"
                  fileName={file.name}
                />
              ))
            ) : (
              <Typography variant="caption" color="text.secondary">
                No guideline file
              </Typography>
            )
          }
          actions={
            <Button
              size="small"
              variant="contained"
              color="warning"
              onClick={onContinue}
              endIcon={<Iconify icon="solar:arrow-right-bold" width={16} />}
            >
              Continue
            </Button>
          }
        />

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.45 }}>
          Please read all the guidelines carefully before you continue.
        </Typography>

        {!alreadyAcknowledged ? (
          <FormControlLabel
            control={<Checkbox size="small" checked={checked} onChange={(e) => onCheckedChange(e.target.checked)} />}
            label={<Typography variant="caption">I have read all the guidelines</Typography>}
            sx={{ mx: 0, mt: -0.25 }}
          />
        ) : null}
      </Stack>
    </StepCard>
  );
}

function PassedCongratulationsCard({ submission }) {
  const theme = useTheme();
  const submittedAt = formatDateTime(submission?.submittedAt || submission?.uploadedAt);

  return (
    <StepCard accentColor={theme.palette.success.main}>
      <Stack spacing={1.25} alignItems="center" sx={{ textAlign: 'center', py: 0.5 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha(theme.palette.success.main, 0.12),
            color: 'success.main',
          }}
        >
          <Iconify icon="solar:cup-star-bold" width={28} />
        </Box>

        <Box sx={{ width: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'success.dark' }}>
            Congratulations!
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.35, lineHeight: 1.5 }}>
            You have successfully passed this assessment. No further submission is required.
          </Typography>
        </Box>

        <Stack direction="row" spacing={0.75} flexWrap="wrap" justifyContent="center" useFlexGap>
          <Chip size="small" color="success" variant="soft" label="Passed" sx={{ fontWeight: 700 }} />
          {submittedAt ? (
            <Chip size="small" variant="outlined" label={submittedAt} />
          ) : null}
        </Stack>
      </Stack>
    </StepCard>
  );
}

function isAwaitingManualGrading(submission) {
  if (!submission || isSubmissionDraft(submission)) return false;
  return submission.manualPassed == null;
}

function ResultStatus({ submission }) {
  const theme = useTheme();
  if (!submission || isSubmissionDraft(submission)) return null;

  const submittedAt = formatDateTime(submission.submittedAt || submission.uploadedAt);

  // Hide AI pass/fail UI until admin manually grades.
  if (isAwaitingManualGrading(submission)) {
    return (
      <Box
        sx={{
          mt: 1,
          py: 1,
          px: 1.25,
          borderRadius: 1,
          bgcolor: alpha(theme.palette.info.main, 0.06),
          borderLeft: `2px solid ${alpha(theme.palette.info.main, 0.6)}`,
        }}
      >
        <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
          <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: 'info.main' }} />
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'info.main' }}>
            Submitted
          </Typography>
          {submittedAt ? (
            <Typography variant="caption" color="text.secondary">
              {submittedAt}
            </Typography>
          ) : null}
        </Stack>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ display: 'block', mt: 0.75, lineHeight: 1.5 }}
        >
          Your assessment has been submitted successfully and is awaiting manual grading.
        </Typography>
      </Box>
    );
  }

  const evaluation = getSubmissionEvaluationDisplay(submission);

  const statusColor =
    evaluation.color === 'success'
      ? theme.palette.success.main
      : evaluation.color === 'error'
        ? theme.palette.error.main
        : evaluation.color === 'warning'
          ? theme.palette.warning.main
          : evaluation.color === 'info'
            ? theme.palette.info.main
            : theme.palette.grey[600];

  return (
    <Box
      sx={{
        mt: 1,
        py: 0.75,
        px: 1,
        borderRadius: 1,
        bgcolor: alpha(statusColor, 0.06),
        borderLeft: `2px solid ${alpha(statusColor, 0.6)}`,
      }}
    >
      <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
        <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: statusColor }} />
        <Typography variant="caption" sx={{ fontWeight: 700, color: statusColor }}>
          {evaluation.label}
        </Typography>
        {submittedAt ? (
          <Typography variant="caption" color="text.secondary">
            {submittedAt}
          </Typography>
        ) : null}
      </Stack>
      {submission.manualFeedback ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, lineHeight: 1.4 }}>
          {submission.manualFeedback}
        </Typography>
      ) : null}
    </Box>
  );
}

function useAssignmentUpload(courseId, assignment, submission, onUploaded, onDeleted) {
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const openPicker = () => {
    document.getElementById(`assessment-file-input-${assignment?.id}`)?.click();
  };

  const uploadFiles = async (fileList) => {
    const files = Array.from(fileList || []).filter(Boolean);
    if (!files.length || !courseId || !assignment?.id) return;
    if (submission?.manualPassed === true) {
      toast.error('Assessment already passed.');
      return;
    }
    setUploading(true);
    try {
      const row = await courseService.uploadAssignmentSubmission(courseId, assignment.id, files);
      onUploaded?.(assignment.id, mapSubmissionFromApi(row));
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!courseId || !assignment?.id) return;
    const hasFiles = submission && getSubmissionFileList(submission).length > 0;
    if (!hasFiles) {
      toast.error('Upload a file first.');
      return;
    }
    if (submission?.manualPassed === true) return;
    setSubmitting(true);
    try {
      const row = await courseService.submitAssignmentSubmission(courseId, assignment.id, {
        typedAnswers: [],
      });
      onUploaded?.(assignment.id, mapSubmissionFromApi(row));
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  const performDelete = async () => {
    if (!courseId || !assignment?.id || !submission) return;
    setDeleting(true);
    try {
      await courseService.deleteAssignmentSubmission(courseId, assignment.id);
      onDeleted?.(assignment.id);
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Delete failed');
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  const fileInput = (
    <input
      id={`assessment-file-input-${assignment?.id}`}
      type="file"
      hidden
      multiple
      accept=".png,.jpg,.jpeg,.pdf,.doc,.docx,.xlsx,.xlsm,.pptx,.txt,.zip"
      onChange={async (event) => {
        await uploadFiles(event.target.files);
        event.target.value = '';
      }}
    />
  );

  return { uploading, submitting, deleting, deleteOpen, setDeleteOpen, openPicker, uploadFiles, handleSubmit, performDelete, fileInput };
}

export function LearningAssessmentStepFlow({
  index,
  courseId,
  assignment,
  submission,
  onUploaded,
  onDeleted,
  guideFiles: guideFileRecords,
  expanded,
  onToggle,
  singleItem,
}) {
  const theme = useTheme();
  const [guideChecked, setGuideChecked] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [guidelinesAcknowledged, setGuidelinesAcknowledged] = useState(false);

  useEffect(() => {
    if (!assignment?.id || typeof window === 'undefined') return;
    setGuidelinesAcknowledged(
      window.localStorage.getItem(guideAckStorageKey(courseId, assignment.id)) === '1'
    );
  }, [courseId, assignment?.id]);

  const upload = useAssignmentUpload(
    courseId,
    assignment,
    submission,
    onUploaded,
    onDeleted
  );
  const questionFiles = normalizeAssessmentResources(
    assignment.questionFiles,
    assignment.questionFileUrl,
    assignment.questionFileName,
    'Assessment file'
  );
  const guideFiles = normalizeAssessmentResources(
    guideFileRecords || assignment.guideFiles,
    assignment.guideFileUrl || assignment.referenceFileUrl,
    assignment.guideFileName || assignment.referenceFileName,
    'Guideline'
  );
  const files = getSubmissionFileList(submission);
  const busy = upload.uploading || upload.deleting || upload.submitting;
  const isLocked = submission?.manualPassed === true;
  const isDraft = isSubmissionDraft(submission);
  const awaitingManual = isAwaitingManualGrading(submission);
  const canSubmit = isDraft && files.length > 0 && !busy;
  const evaluation = submission
    ? awaitingManual
      ? { label: 'Awaiting grading', color: 'info' }
      : getSubmissionEvaluationDisplay(submission)
    : null;
  const isOpen = Boolean(expanded);
  const hasGuide = guideFiles.length > 0;
  const steps = getStepConfig(hasGuide);

  useEffect(() => {
    if (!hasGuide) {
      setActiveStep(steps.assessment);
    }
  }, [hasGuide, steps.assessment]);

  useEffect(() => {
    if (isLocked) return;
    if (
      submission?.evaluationStatus === 'pending' ||
      submission?.evaluationStatus === 'processing' ||
      submission?.evaluationStatus === 'completed' ||
      submission?.evaluationStatus === 'manual_required' ||
      (submission && !isSubmissionDraft(submission) && submission.manualPassed == null)
    ) {
      setActiveStep(steps.submit);
    }
  }, [submission?.evaluationStatus, submission?.manualPassed, submission, steps.submit, isLocked]);

  const handleGuideContinue = useCallback(() => {
    if (!guidelinesAcknowledged && !guideChecked) {
      toast.error('Please confirm you have read the guidelines.');
      return;
    }
    if (!guidelinesAcknowledged && typeof window !== 'undefined' && assignment?.id) {
      window.localStorage.setItem(guideAckStorageKey(courseId, assignment.id), '1');
      setGuidelinesAcknowledged(true);
    }
    setActiveStep(steps.assessment);
  }, [courseId, guideChecked, guidelinesAcknowledged, assignment?.id, steps.assessment]);

  const handleStepClick = useCallback(
    (stepIndex) => {
      if (hasGuide && stepIndex > steps.guidelines && !guidelinesAcknowledged) {
        toast.error('Please complete the guidelines step first.');
        setActiveStep(steps.guidelines);
        return;
      }
      setActiveStep(stepIndex);
    },
    [guidelinesAcknowledged, hasGuide, steps.guidelines]
  );

  return (
    <>
      <Box
        sx={{
          borderBottom: singleItem ? 'none' : `1px solid ${theme.palette.divider}`,
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          onClick={onToggle}
          sx={{
            px: { xs: 1.5, md: 2 },
            py: 1,
            cursor: 'pointer',
            '&:hover': { bgcolor: alpha(theme.palette.grey[500], 0.04) },
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
              bgcolor: alpha(isLocked ? theme.palette.success.main : theme.palette.primary.main, 0.1),
              color: isLocked ? 'success.main' : 'primary.main',
              fontWeight: 800,
              fontSize: '0.75rem',
              flexShrink: 0,
            }}
          >
            {index + 1}
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 600, flex: 1, minWidth: 0 }} noWrap>
            {assignment.prompt || `Assessment ${index + 1}`}
          </Typography>
          {evaluation ? (
            <Chip size="small" variant="soft" color={evaluation.color} label={evaluation.label} sx={{ height: 22 }} />
          ) : null}
          <Iconify
            icon={isOpen ? 'eva:chevron-up-fill' : 'eva:chevron-down-fill'}
            width={20}
            sx={{ color: 'text.secondary', flexShrink: 0 }}
          />
        </Stack>

        <Collapse in={isOpen}>
          <Box sx={{ px: { xs: 1.5, md: 2 }, pb: 1.5, pt: singleItem ? 0.75 : 0 }}>
            {isLocked ? (
              <PassedCongratulationsCard submission={submission} />
            ) : (
              <>
            <Stepper
              activeStep={activeStep}
              orientation="horizontal"
              alternativeLabel
              sx={{
                mb: 1.25,
                width: '100%',
                '& .MuiStep-root': {
                  flex: 1,
                  minWidth: 0,
                  px: { xs: 0, sm: 0.5 },
                },
                '& .MuiStepLabel-root': {
                  padding: 0,
                },
                '& .MuiStepLabel-label': {
                  fontSize: { xs: '0.625rem', sm: '0.7rem', md: '0.75rem' },
                  fontWeight: 600,
                  mt: 0.5,
                  lineHeight: 1.2,
                },
                '& .MuiStepIcon-root': {
                  width: { xs: 22, sm: 26, md: 28 },
                  height: { xs: 22, sm: 26, md: 28 },
                },
                '& .MuiStepConnector-root': {
                  top: { xs: 11, sm: 13, md: 14 },
                  left: 'calc(-50% + 14px)',
                  right: 'calc(50% + 14px)',
                },
                '& .MuiStepConnector-line': {
                  borderTopWidth: 2,
                },
              }}
            >
              {steps.labels.map((label, i) => (
                <Step key={label} completed={activeStep > i}>
                  <StepLabel onClick={() => handleStepClick(i)} sx={{ cursor: 'pointer' }}>
                    {label}
                  </StepLabel>
                </Step>
              ))}
            </Stepper>

            {hasGuide ? (
              <Collapse in={activeStep === steps.guidelines}>
                <GuidelinesStepCard
                  guideFiles={guideFiles}
                  checked={guideChecked}
                  onCheckedChange={setGuideChecked}
                  onContinue={handleGuideContinue}
                  alreadyAcknowledged={guidelinesAcknowledged}
                />
              </Collapse>
            ) : null}

            <Collapse in={activeStep === steps.assessment}>
              <StepCard accentColor={theme.palette.info.main}>
                <Stack spacing={1}>
                  <StepInlineRow
                    leading={
                      questionFiles.length ? (
                        questionFiles.map((file, fileIndex) => (
                          <ResourceDownloadLink
                            key={`${file.fileUrl}-${fileIndex}`}
                            href={file.href}
                            label={file.name}
                            icon="solar:document-text-bold"
                            color="info"
                            fileName={file.name}
                          />
                        ))
                      ) : (
                        <Typography variant="caption" color="error.main">
                          No file
                        </Typography>
                      )
                    }
                    actions={
                      <>
                        {hasGuide ? (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => setActiveStep(steps.guidelines)}
                            startIcon={<Iconify icon="solar:arrow-left-bold" width={16} />}
                          >
                            Back
                          </Button>
                        ) : null}
                        <Button
                          size="small"
                          variant="contained"
                          disabled={!questionFiles.length}
                          onClick={() => setActiveStep(steps.submit)}
                          endIcon={<Iconify icon="solar:arrow-right-bold" width={16} />}
                        >
                          Upload answer
                        </Button>
                      </>
                    }
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.45 }}>
                    Please download the assessment, complete it, then upload your answer.
                  </Typography>
                </Stack>
              </StepCard>
            </Collapse>

            <Collapse in={activeStep === steps.submit}>
              <StepCard accentColor={theme.palette.primary.main}>
                <Stack spacing={1}>
                  {!isLocked ? upload.fileInput : null}

                  {!isLocked && files.length === 0 ? (
                    <Upload
                      multiple
                      value={[]}
                      accept={LEARNER_SUBMISSION_ACCEPT}
                      maxSize={52428800}
                      onDrop={upload.uploadFiles}
                      disabled={busy}
                    />
                  ) : null}

                  {files.map((file) => (
                    <Button
                      key={`${file.fileUrl}-${file.originalFileName}`}
                      size="small"
                      component="a"
                      href={resolveAssetUrl(file.fileUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      startIcon={<Iconify icon="solar:document-bold" width={16} />}
                      sx={{ justifyContent: 'flex-start', textTransform: 'none', fontWeight: 600 }}
                    >
                      {file.originalFileName}
                    </Button>
                  ))}

                  <StepActionRow>
                    {!isLocked ? (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setActiveStep(steps.assessment)}
                        startIcon={<Iconify icon="solar:arrow-left-bold" width={16} />}
                      >
                        Back
                      </Button>
                    ) : null}
                    {canSubmit ? (
                      <Button
                        size="small"
                        variant="contained"
                        disabled={busy}
                        onClick={upload.handleSubmit}
                        startIcon={
                          upload.submitting ? (
                            <CircularProgress size={14} color="inherit" />
                          ) : (
                            <Iconify icon="solar:cpu-bolt-bold" width={16} />
                          )
                        }
                      >
                        Submit
                      </Button>
                    ) : null}
                    {submission && !isLocked && files.length > 0 ? (
                      <Tooltip title="Clear">
                        <IconButton size="small" disabled={busy} onClick={() => upload.setDeleteOpen(true)} color="error">
                          <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                  </StepActionRow>

                  {submission ? <ResultStatus submission={submission} /> : null}
                </Stack>
              </StepCard>
            </Collapse>
              </>
            )}
          </Box>
        </Collapse>
      </Box>

      <ConfirmDialog
        open={upload.deleteOpen}
        onClose={() => upload.setDeleteOpen(false)}
        title="Clear submission"
        content="Remove uploaded files?"
        action={
          <Button variant="contained" color="error" disabled={upload.deleting} onClick={upload.performDelete}>
            Delete
          </Button>
        }
      />
    </>
  );
}

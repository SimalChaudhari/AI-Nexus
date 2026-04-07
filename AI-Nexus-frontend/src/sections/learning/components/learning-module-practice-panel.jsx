import { useCallback, useEffect, useMemo, useState } from 'react';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';
import { toast } from 'src/components/snackbar';
import { courseService } from 'src/services/course.service';

// ----------------------------------------------------------------------
const attemptStartInFlightByKey = new Map();

function questionTypeLabel(type) {
  if (type === 'mcq') return 'Single choice question';
  if (type === 'true_false') return 'True or false';
  if (type === 'short_text') return 'Short answer';
  return 'Question';
}

function hasAnswerForQuestion(q, st) {
  if (!st) return false;
  if (q.questionType === 'mcq') return st.selectedIndex != null;
  if (q.questionType === 'true_false') return Boolean(st.tf);
  return String(st.text || '').trim().length > 0;
}

function buildCheckPayload(q, st) {
  if (q.questionType === 'mcq') return { selectedIndex: st.selectedIndex };
  if (q.questionType === 'true_false') return { answer: st.tf };
  return { answer: String(st.text || '').trim() };
}

/** Same breakpoints as lesson video (`LESSON_FRAME_HEIGHT`) when parent does not pass `frameHeight`. */
const DEFAULT_PRACTICE_FRAME_HEIGHT = { xs: 260, sm: 320, md: 580 };

export function LearningModulePracticeIntro({
  moduleTitle,
  questionCount,
  onStartTest,
  /** Responsive height object — must match `LessonVideoPlayer` `frameHeight` for aligned layout. */
  frameHeight = DEFAULT_PRACTICE_FRAME_HEIGHT,
}) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        bgcolor: 'grey.900',
        width: '100%',
        height: frameHeight,
        boxShadow: (t) => t.customShadows.z8,
        border: (t) => `1px solid ${t.palette.divider}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box
        sx={{
          width: '100%',
          height: '100%',
          overflowY: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: { xs: 1.5, sm: 2 },
          px: { xs: 1.5, sm: 2 },
        }}
      >
        <Paper
          elevation={0}
          sx={{
            width: '100%',
            maxWidth: 520,
            p: { xs: 2, sm: 3 },
            borderRadius: 2,
            textAlign: 'center',
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: theme.customShadows.z16,
            bgcolor: 'background.paper',
          }}
        >
          <Stack spacing={1.5} alignItems="center">
            <Stack spacing={0.75} sx={{ width: '100%', alignItems: 'center' }}>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 700,
                  color: 'text.primary',
                  textAlign: 'center',
                  whiteSpace: 'normal',
                  wordBreak: 'break-word',
                }}
              >
                {moduleTitle}
              </Typography>
              <Chip
                label="Non-graded Assessment"
                size="small"
                sx={{
                  fontWeight: 600,
                  bgcolor: alpha(theme.palette.secondary.main, 0.12),
                  color: 'secondary.dark',
                }}
              />
            </Stack>
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                bgcolor: alpha(theme.palette.warning.main, 0.2),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Iconify icon="solar:clipboard-list-bold" width={34} sx={{ color: 'warning.dark' }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.dark' }}>
              Ready for a non-graded assessment?
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7, maxWidth: 400 }}>
              Refresh your knowledge on what you just learned.
              {questionCount > 0 ? (
                <>
                  {' '}
                  {questionCount} question{questionCount !== 1 ? 's' : ''} in this module.
                </>
              ) : null}
            </Typography>
            <Button
              variant="contained"
              color="secondary"
              size="large"
              onClick={onStartTest}
              sx={{ mt: 0.5, minWidth: 200, fontWeight: 700, py: 1.1 }}
            >
              Start Test
            </Button>
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}

// ----------------------------------------------------------------------

export function LearningModulePracticeQuiz({
  courseId,
  moduleId,
  moduleTitle,
  questions,
  onBackToIntro,
}) {
  const theme = useTheme();
  const [phase, setPhase] = useState('questions');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [attemptId, setAttemptId] = useState('');

  const total = questions.length;
  const q = questions[index];

  const setMcq = useCallback((qid, idx) => {
    setAnswers((prev) => ({
      ...prev,
      [qid]: { ...prev[qid], selectedIndex: idx },
    }));
  }, []);

  const setTf = useCallback((qid, v) => {
    setAnswers((prev) => ({
      ...prev,
      [qid]: { ...prev[qid], tf: v },
    }));
  }, []);

  const setShort = useCallback((qid, v) => {
    setAnswers((prev) => ({
      ...prev,
      [qid]: { ...prev[qid], text: v },
    }));
  }, []);

  const scoreSummary = useMemo(() => {
    let correct = 0;
    questions.forEach((item) => {
      const r = answers[item.id]?.result;
      if (r?.correct === true) correct += 1;
    });
    return { correct, total: questions.length };
  }, [answers, questions]);

  const startAttempt = useCallback(async () => {
    if (!courseId) return;
    const attemptKey = `${courseId}::${moduleId || 'course'}`;
    const existingReq = attemptStartInFlightByKey.get(attemptKey);
    if (existingReq) {
      try {
        const row = await existingReq;
        setAttemptId(row?.id || '');
      } catch {
        setAttemptId('');
      }
      return;
    }
    const req = courseService.startCourseQuestionAttempt(courseId, moduleId ? { moduleId } : {});
    attemptStartInFlightByKey.set(attemptKey, req);
    try {
      const row = await req;
      setAttemptId(row?.id || '');
    } catch {
      // Keep quiz usable even if attempt creation fails.
      setAttemptId('');
    } finally {
      attemptStartInFlightByKey.delete(attemptKey);
    }
  }, [courseId, moduleId]);

  useEffect(() => {
    let active = true;
    startAttempt().then(() => {
      if (!active) return;
    });
    return () => {
      active = false;
    };
  }, [startAttempt]);

  const submitAllAndShowSummary = useCallback(async () => {
    if (!courseId) return;
    const missing = questions.find((item) => !hasAnswerForQuestion(item, answers[item.id] || {}));
    if (missing) {
      toast.info('Please answer every question before finishing.');
      const i = questions.indexOf(missing);
      if (i >= 0) setIndex(i);
      return;
    }
    setSubmitting(true);
    try {
      const next = { ...answers };
      const attemptAnswers = [];
      for (const item of questions) {
        const st = next[item.id] || {};
        const payload = buildCheckPayload(item, st);
        attemptAnswers.push({
          questionId: item.id,
          selectedIndex: payload.selectedIndex,
          answer: payload.answer,
        });
      }
      let completeData = null;
      if (attemptId) {
        completeData = await courseService.completeCourseQuestionAttempt(courseId, attemptId, {
          answers: attemptAnswers,
        });
      } else {
        // Fallback path: create attempt first, then complete once.
        const started = await courseService.startCourseQuestionAttempt(
          courseId,
          moduleId ? { moduleId } : {}
        );
        if (started?.id) {
          completeData = await courseService.completeCourseQuestionAttempt(courseId, started.id, {
            answers: attemptAnswers,
          });
        }
      }
      const resultByQuestionId = new Map(
        Array.isArray(completeData?.answers)
          ? completeData.answers.map((r) => [
              r.questionId,
              { correct: Boolean(r.correct), explanation: r.explanation ?? null },
            ])
          : []
      );
      questions.forEach((item) => {
        const st = next[item.id] || {};
        next[item.id] = {
          ...st,
          result: resultByQuestionId.get(item.id) || { correct: false, explanation: null },
        };
      });
      if (completeData?.id) {
        setAttemptId(String(completeData.id));
      }
      setAnswers(next);
      setPhase('summary');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Could not submit answers');
    } finally {
      setSubmitting(false);
    }
  }, [answers, attemptId, courseId, moduleId, questions]);

  const goNext = useCallback(() => {
    if (index < total - 1) {
      if (!hasAnswerForQuestion(q, answers[q.id] || {})) {
        toast.info('Please select or type an answer before continuing.');
        return;
      }
      setIndex((i) => i + 1);
      return;
    }
    submitAllAndShowSummary();
  }, [answers, index, q, submitAllAndShowSummary, total]);

  const goPrev = useCallback(() => {
    if (index > 0) setIndex((i) => i - 1);
  }, [index]);

  const st = q ? answers[q.id] || {} : {};
  const currentAnswered = q ? hasAnswerForQuestion(q, st) : false;

  const nextLabel = useMemo(() => (index >= total - 1 ? 'Finish' : 'Next'), [index, total]);

  const handleHeaderBack = useCallback(() => {
    if (phase === 'summary') {
      setPhase('questions');
      setIndex(0);
      setAnswers({});
      startAttempt();
      return;
    }
    onBackToIntro?.();
  }, [onBackToIntro, phase, startAttempt]);

  if (!total) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">No questions for this module.</Typography>
        <Button sx={{ mt: 2 }} onClick={onBackToIntro}>
          Back
        </Button>
      </Box>
    );
  }

  if (phase === 'summary') {
    const { correct, total: totalQs } = scoreSummary;
    return (
      <Box
        sx={{
          width: '100%',
          mx: { xs: -2, md: -3 },
          mt: { xs: -2, md: -3 },
          bgcolor: 'background.paper',
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{
            px: { xs: 2, md: 3 },
            py: 1.5,
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <IconButton aria-label="Back" onClick={handleHeaderBack} size="small" edge="start">
            <Iconify icon="eva:arrow-ios-back-fill" width={22} />
          </IconButton>
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 600, flex: 1, minWidth: 0, whiteSpace: 'normal', wordBreak: 'break-word' }}
          >
            Results — {moduleTitle}
          </Typography>
        </Stack>

        <Box sx={{ px: { xs: 2, md: 4 }, py: 3 }}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              mb: 3,
              borderRadius: 2,
              border: `1px solid ${theme.palette.divider}`,
              bgcolor: alpha(theme.palette.secondary.main, 0.06),
            }}
          >
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'secondary.dark' }}>
              {correct} / {totalQs}
            </Typography>
            <Typography variant="subtitle1" sx={{ mt: 0.5, fontWeight: 600 }}>
              correct
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Below is a breakdown for each question, including explanations where available.
            </Typography>
          </Paper>

          <Stack spacing={2.5}>
            {questions.map((item, i) => {
              const r = answers[item.id]?.result;
              const ok = Boolean(r?.correct);
              return (
                <Box key={item.id}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Question {i + 1} · {questionTypeLabel(item.questionType)}
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mt: 0.5 }}>
                    {item.prompt}
                  </Typography>
                  <Alert severity={ok ? 'success' : 'error'} sx={{ mt: 1.5 }}>
                    <Typography variant="subtitle2" component="span" fontWeight={700}>
                      {ok ? 'Correct' : 'Incorrect'}
                    </Typography>
                    {r?.explanation ? (
                      <Typography variant="body2" sx={{ mt: 1, display: 'block' }}>
                        {r.explanation}
                      </Typography>
                    ) : (
                      <Typography variant="body2" sx={{ mt: 0.5, display: 'block' }} color="text.secondary">
                        {ok ? 'Nice work.' : 'Review the module material and try again anytime.'}
                      </Typography>
                    )}
                  </Alert>
                  {i < questions.length - 1 ? <Divider sx={{ mt: 2.5 }} /> : null}
                </Box>
              );
            })}
          </Stack>
        </Box>

        <Stack
          direction="row"
          justifyContent="flex-end"
          spacing={1.5}
          sx={{
            px: { xs: 2, md: 3 },
            py: 2,
            borderTop: `1px solid ${theme.palette.divider}`,
            bgcolor: 'background.paper',
          }}
        >
          <Button variant="outlined" color="inherit" onClick={handleHeaderBack}>
            Retake quiz
          </Button>
          <Button variant="contained" color="secondary" onClick={onBackToIntro}>
            Back to start
          </Button>
        </Stack>
      </Box>
    );
  }

  if (!q) {
    return null;
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        mx: { xs: -2, md: -3 },
        mt: { xs: -2, md: -3 },
        bgcolor: 'background.paper',
        // Fixed-height shell: only the middle scrolls; Previous/Next stay at the bottom.
        height: { xs: 'calc(100dvh - 168px)', md: 'calc(100dvh - 228px)' },
        maxHeight: { xs: 'calc(100dvh - 168px)', md: 'calc(100dvh - 228px)' },
        minHeight: { xs: 320, md: 380 },
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
        <IconButton aria-label="Back to start" onClick={onBackToIntro} size="small" edge="start">
          <Iconify icon="eva:arrow-ios-back-fill" width={22} />
        </IconButton>
        <Typography
          variant="subtitle1"
          sx={{ fontWeight: 600, flex: 1, minWidth: 0, whiteSpace: 'normal', wordBreak: 'break-word' }}
        >
          {moduleTitle}
        </Typography>
      </Stack>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            minHeight: '100%',
          }}
        >
          <Box
            sx={{
              flex: { md: '0 0 42%' },
              px: { xs: 2, md: 4 },
              py: { xs: 3, md: 4 },
              borderRight: { md: `1px solid ${theme.palette.divider}` },
            }}
          >
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              Question {index + 1} of {total}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.5 }}>
              {questionTypeLabel(q.questionType)}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, mt: 2, color: 'text.primary', lineHeight: 1.35 }}>
              {q.prompt}
            </Typography>
          </Box>

          <Box
            sx={{
              flex: 1,
              px: { xs: 2, md: 4 },
              py: { xs: 2, md: 4 },
              pb: { xs: 3, md: 4 },
              bgcolor: { md: alpha(theme.palette.grey[500], 0.08) },
            }}
          >
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              {q.questionType === 'mcq' ? 'Select the correct answer' : 'Your answer'}
            </Typography>

            <Stack spacing={1.5} sx={{ mt: 2 }}>
              {q.questionType === 'mcq' && Array.isArray(q.options) && (
                <RadioGroup
                  value={st.selectedIndex ?? ''}
                  onChange={(e) => setMcq(q.id, Number(e.target.value))}
                >
                  {q.options.map((opt, idx) => (
                    <Paper
                      key={idx}
                      variant="outlined"
                      sx={{
                        px: 2,
                        py: 1.25,
                        borderRadius: 1.5,
                        bgcolor: 'background.paper',
                        boxShadow: 'none',
                      }}
                    >
                      <FormControlLabel
                        value={idx}
                        control={<Radio />}
                        label={opt}
                        sx={{ m: 0, alignItems: 'flex-start', '& .MuiFormControlLabel-label': { pt: 0.25 } }}
                      />
                    </Paper>
                  ))}
                </RadioGroup>
              )}

              {q.questionType === 'true_false' && (
                <RadioGroup row value={st.tf || ''} onChange={(e) => setTf(q.id, e.target.value)}>
                  <FormControlLabel value="true" control={<Radio />} label="True" />
                  <FormControlLabel value="false" control={<Radio />} label="False" />
                </RadioGroup>
              )}

              {q.questionType === 'short_text' && (
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  label="Your answer"
                  value={st.text || ''}
                  onChange={(e) => setShort(q.id, e.target.value)}
                />
              )}
            </Stack>
          </Box>
        </Box>
      </Box>

      <Stack
        direction="row"
        justifyContent="flex-end"
        alignItems="center"
        spacing={1.5}
        sx={{
          flexShrink: 0,
          px: { xs: 2, md: 3 },
          py: 2,
          borderTop: `1px solid ${theme.palette.divider}`,
          bgcolor: 'background.paper',
          boxShadow: (t) => `0 -4px 16px -4px ${alpha(t.palette.grey[500], 0.2)}`,
          zIndex: 2,
        }}
      >
        <Button
          variant="outlined"
          color="inherit"
          disabled={index === 0 || submitting}
          onClick={goPrev}
          startIcon={<Iconify icon="eva:arrow-ios-back-fill" width={18} />}
        >
          Previous
        </Button>
        <Button
          variant="contained"
          color="secondary"
          disabled={
            submitting || (index < total - 1 && !currentAnswered)
          }
          onClick={goNext}
          startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : null}
          endIcon={submitting ? null : <Iconify icon="eva:arrow-ios-forward-fill" width={18} />}
        >
          {submitting ? 'Submitting…' : nextLabel}
        </Button>
      </Stack>
    </Box>
  );
}

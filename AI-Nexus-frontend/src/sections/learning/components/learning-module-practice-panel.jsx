import { useCallback, useEffect, useMemo, useState } from 'react';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
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
import {
  LESSON_FRAME_HEIGHT,
  playerScrollPanelSx,
} from 'src/sections/learning/utils/player-responsive-type';

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

/** Hidden scrollbar on phone; thin bar on laptop (touchpad) — matches course player panels. */
const quizScrollPanelSx = playerScrollPanelSx;

/** Side-by-side question/answers from md up (original layout). */
const QUIZ_SPLIT_BP = 'md';

export function LearningModulePracticeIntro({
  moduleTitle,
  questionCount,
  onStartTest,
  /** Same panel footprint as quiz (`fillContainer`) — no layout jump on Start Test. */
  fillContainer = false,
  /** Used when `fillContainer` is false — matches `LessonVideoPlayer` height. */
  frameHeight = LESSON_FRAME_HEIGHT,
}) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        position: 'relative',
        bgcolor: 'grey.900',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...(fillContainer
          ? { flex: '1 1 0%', minHeight: 0, alignSelf: 'stretch' }
          : {
              height: frameHeight,
              borderRadius: 0,
              boxShadow: (t) => `0 12px 40px ${alpha(t.palette.common.black, 0.14)}`,
              border: (t) => `1px solid ${alpha(t.palette.grey[500], 0.2)}`,
              overflow: 'hidden',
            }),
      }}
    >
      <Box
        sx={{
          width: '100%',
          flex: fillContainer ? '1 1 0%' : undefined,
          minHeight: fillContainer ? 0 : undefined,
          height: fillContainer ? undefined : '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 1, sm: 1.5, md: 1.5, lg: 2, xl: 2.5 },
        }}
      >
        <Paper
          elevation={0}
          sx={{
            width: '100%',
            maxWidth: { xs: 520, md: 440, xl: 520 },
            maxHeight: '100%',
            minHeight: 0,
            flexShrink: 1,
            p: { xs: 1.5, sm: 2, md: 1.75, lg: 2, xl: 3 },
            borderRadius: 2,
            textAlign: 'center',
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: theme.customShadows.z16,
            bgcolor: 'background.paper',
          }}
        >
          <Stack
            spacing={{ xs: 1, sm: 1.25, md: 0.875, lg: 1, xl: 1.5 }}
            alignItems="center"
            sx={{ minHeight: 0 }}
          >
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                color: 'text.primary',
                textAlign: 'center',
                whiteSpace: 'normal',
                wordBreak: 'break-word',
                fontSize: { xs: '0.9375rem', md: '0.875rem', xl: '1rem' },
                lineHeight: 1.3,
              }}
            >
              Quiz
            </Typography>
            <Box
              sx={{
                width: { xs: 56, sm: 60, md: 48, lg: 52, xl: 72 },
                height: { xs: 56, sm: 60, md: 48, lg: 52, xl: 72 },
                borderRadius: '50%',
                bgcolor: alpha(theme.palette.warning.main, 0.2),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Iconify
                icon="solar:clipboard-list-bold"
                sx={{
                  color: 'warning.dark',
                  width: { xs: 28, sm: 30, md: 24, lg: 26, xl: 34 },
                  height: { xs: 28, sm: 30, md: 24, lg: 26, xl: 34 },
                }}
              />
            </Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                color: 'primary.dark',
                fontSize: { xs: '1rem', md: '0.9375rem', lg: '1rem', xl: '1.125rem' },
                lineHeight: 1.3,
              }}
            >
              Ready for Quiz?
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                lineHeight: 1.5,
                maxWidth: 400,
                fontSize: { xs: '0.8125rem', md: '0.75rem', lg: '0.8125rem', xl: '0.875rem' },
              }}
            >
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
              size="medium"
              onClick={onStartTest}
              sx={{
                mt: { xs: 0.25, xl: 0.5 },
                minWidth: { xs: 160, md: 150, xl: 200 },
                fontWeight: 700,
                py: { xs: 0.75, md: 0.65, xl: 1.1 },
                fontSize: { xs: '0.8125rem', md: '0.75rem', xl: '0.875rem' },
              }}
            >
              Start Quiz
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
  onAttemptCompleted,
  /** When true, fill the course player panel (no viewport calc / double scroll). */
  fillContainer = false,
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
      const perfect =
        completeData?.isCompleted === true ||
        (Number(completeData?.scorePercent) >= 100 &&
          Number(completeData?.correctAnswers) >= Number(completeData?.totalQuestions));
      if (perfect) {
        onAttemptCompleted?.(completeData);
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Could not submit answers');
    } finally {
      setSubmitting(false);
    }
  }, [answers, attemptId, courseId, moduleId, onAttemptCompleted, questions]);

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
          display: 'flex',
          flexDirection: 'column',
          ...(fillContainer
            ? { flex: 1, minHeight: 0, height: '100%', overflow: 'hidden' }
            : { bgcolor: 'background.paper' }),
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

        <Box
          sx={{
            flex: fillContainer ? 1 : undefined,
            minHeight: fillContainer ? 0 : undefined,
            px: { xs: 2, sm: 3, md: 4 },
            py: 3,
            ...(fillContainer ? quizScrollPanelSx : {}),
          }}
        >
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
            {correct < totalQs ? (
              <Typography variant="body2" sx={{ mt: 1.5, color: 'warning.dark', fontWeight: 600 }}>
                Score 100% on this quiz to unlock the assessment.
              </Typography>
            ) : (
              <Typography variant="body2" sx={{ mt: 1.5, color: 'success.dark', fontWeight: 600 }}>
                Perfect score — the assessment is now unlocked.
              </Typography>
            )}
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
        bgcolor: 'background.paper',
        ...(fillContainer
          ? {
              flex: 1,
              minHeight: 0,
              height: '100%',
              overflow: 'hidden',
            }
          : {
              minHeight: { xs: 360, sm: 420 },
            }),
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
          ...(fillContainer ? quizScrollPanelSx : { overflowY: 'auto', overflowX: 'hidden' }),
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', [QUIZ_SPLIT_BP]: 'row' },
            alignItems: 'stretch',
          }}
        >
          <Box
            sx={{
              flex: { [QUIZ_SPLIT_BP]: '0 0 38%', xl: '0 0 40%' },
              px: { xs: 2, sm: 2.5, md: 3 },
              py: { xs: 2, sm: 2.5, md: 3 },
              borderBottom: {
                xs: `1px solid ${theme.palette.divider}`,
                [QUIZ_SPLIT_BP]: 'none',
              },
              borderRight: {
                [QUIZ_SPLIT_BP]: `1px solid ${theme.palette.divider}`,
              },
              bgcolor: 'background.paper',
            }}
          >
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              Question {index + 1} of {total}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.5 }}>
              {questionTypeLabel(q.questionType)}
            </Typography>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                mt: { xs: 1.25, md: 1.5 },
                color: 'text.primary',
                lineHeight: 1.35,
                fontSize: { xs: '1.1rem', sm: '1.2rem', md: '1.35rem', lg: '1.5rem' },
                wordBreak: 'break-word',
              }}
            >
              {q.prompt}
            </Typography>
          </Box>

          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              px: { xs: 2, sm: 2.5, md: 3 },
              py: { xs: 2, sm: 2.5, md: 3 },
              bgcolor: alpha(theme.palette.grey[500], 0.06),
            }}
          >
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              {q.questionType === 'mcq' ? 'Select the correct answer' : 'Your answer'}
            </Typography>

            <Stack spacing={1.25} sx={{ mt: { xs: 1.25, md: 1.5 } }}>
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
                        px: { xs: 1.5, sm: 2 },
                        py: { xs: 1, sm: 1.25 },
                        borderRadius: 1.5,
                        bgcolor: 'background.paper',
                        boxShadow: 'none',
                        borderColor:
                          st.selectedIndex === idx
                            ? theme.palette.secondary.main
                            : theme.palette.divider,
                      }}
                    >
                      <FormControlLabel
                        value={idx}
                        control={<Radio size="small" />}
                        label={opt}
                        sx={{
                          m: 0,
                          width: '100%',
                          alignItems: 'flex-start',
                          '& .MuiFormControlLabel-label': {
                            pt: 0.25,
                            fontSize: { xs: '0.9375rem', sm: '1rem' },
                            lineHeight: 1.5,
                          },
                        }}
                      />
                    </Paper>
                  ))}
                </RadioGroup>
              )}

              {q.questionType === 'true_false' && (
                <RadioGroup
                  row
                  value={st.tf || ''}
                  onChange={(e) => setTf(q.id, e.target.value)}
                  sx={{ flexWrap: 'wrap', gap: 1 }}
                >
                  <FormControlLabel value="true" control={<Radio size="small" />} label="True" />
                  <FormControlLabel value="false" control={<Radio size="small" />} label="False" />
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
        direction={{ xs: 'column-reverse', sm: 'row' }}
        justifyContent="flex-end"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={1.5}
        sx={{
          flexShrink: 0,
          px: { xs: 2, sm: 3, md: 3 },
          py: { xs: 1.5, sm: 2 },
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
          fullWidth={false}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          Previous
        </Button>
        <Button
          variant="contained"
          color="secondary"
          disabled={submitting || (index < total - 1 && !currentAnswered)}
          onClick={goNext}
          startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : null}
          endIcon={submitting ? null : <Iconify icon="eva:arrow-ios-forward-fill" width={18} />}
          fullWidth={false}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          {submitting ? 'Submitting…' : nextLabel}
        </Button>
      </Stack>
    </Box>
  );
}

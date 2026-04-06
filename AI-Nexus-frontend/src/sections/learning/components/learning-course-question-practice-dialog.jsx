import { useCallback, useEffect, useMemo, useState } from 'react';

import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import TextField from '@mui/material/TextField';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';

import { courseService } from 'src/services/course.service';
import { Iconify } from 'src/components/iconify';
import { toast } from 'src/components/snackbar';

// ----------------------------------------------------------------------

/**
 * One question bank per course module (not per lesson).
 * @param {Array<{ id: string, title?: string, lessons?: unknown[] }>} modulesForGrouping
 */
function buildPracticeGroups(questions, modulesForGrouping) {
  if (!modulesForGrouping?.length) {
    return {
      courseWide: questions.filter((q) => !q.moduleId),
      moduleGroups: [],
      orphaned: [],
    };
  }

  const knownModuleIds = new Set(modulesForGrouping.map((m) => m.id));
  const courseWide = [];
  const orphaned = [];

  questions.forEach((q) => {
    if (!q.moduleId) {
      courseWide.push(q);
      return;
    }
    if (!knownModuleIds.has(q.moduleId)) {
      orphaned.push(q);
    }
  });

  const moduleGroups = modulesForGrouping
    .map((mod) => {
      const qs = questions.filter((q) => q.moduleId === mod.id);
      if (!qs.length) return null;
      return {
        moduleId: mod.id,
        moduleTitle: mod.title || 'Module',
        questions: qs,
      };
    })
    .filter(Boolean);

  return { courseWide, moduleGroups, orphaned };
}

function QuestionItem({
  q,
  indexLabel,
  answers,
  setMcq,
  setTf,
  setShort,
  checkOne,
  showDividerTop,
}) {
  const st = answers[q.id] || {};
  const result = st.result;

  return (
    <Box>
      {showDividerTop && <Divider sx={{ my: 2 }} />}
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
        {indexLabel}. {q.prompt}
      </Typography>

      {q.questionType === 'mcq' && Array.isArray(q.options) && (
        <FormControl component="fieldset" variant="standard" sx={{ ml: 0 }}>
          <RadioGroup
            value={st.selectedIndex ?? ''}
            onChange={(e) => setMcq(q.id, Number(e.target.value))}
          >
            {q.options.map((opt, idx) => (
              <FormControlLabel key={idx} value={idx} control={<Radio />} label={opt} />
            ))}
          </RadioGroup>
        </FormControl>
      )}

      {q.questionType === 'true_false' && (
        <FormControl component="fieldset" variant="standard">
          <FormLabel component="legend" sx={{ typography: 'caption', mb: 0.5 }}>
            Your answer
          </FormLabel>
          <RadioGroup row value={st.tf || ''} onChange={(e) => setTf(q.id, e.target.value)}>
            <FormControlLabel value="true" control={<Radio />} label="True" />
            <FormControlLabel value="false" control={<Radio />} label="False" />
          </RadioGroup>
        </FormControl>
      )}

      {q.questionType === 'short_text' && (
        <TextField
          fullWidth
          size="small"
          label="Your answer"
          value={st.text || ''}
          onChange={(e) => setShort(q.id, e.target.value)}
        />
      )}

      <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
        <Button size="small" variant="contained" onClick={() => checkOne(q)}>
          Check answer
        </Button>
      </Stack>

      {result && (
        <Alert severity={result.correct ? 'success' : 'error'} sx={{ mt: 1.5 }}>
          {result.correct ? 'Correct.' : 'Not quite.'}
          {result.explanation ? (
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {result.explanation}
            </Typography>
          ) : null}
        </Alert>
      )}
    </Box>
  );
}

// ----------------------------------------------------------------------

export function LearningCourseQuestionPracticeDialog({
  open,
  onClose,
  courseId,
  modulesForGrouping,
  /** When set, dialog lists only questions for this course module. */
  moduleFilterId = null,
  /** When true, only questions not tied to a lesson (whole course). */
  courseWideOnly = false,
  /** Optional title line under main heading (e.g. lesson name). */
  subtitle = null,
  /** If provided, skips internal fetch (e.g. parent loads via SWR). */
  prefetchedQuestions,
}) {
  const useInternalFetch = prefetchedQuestions === undefined;

  const [loading, setLoading] = useState(false);
  const [internalQuestions, setInternalQuestions] = useState([]);
  const [answers, setAnswers] = useState({});

  const load = useCallback(async () => {
    if (!courseId || !open || !useInternalFetch) return;
    setLoading(true);
    try {
      const data = await courseService.getCourseQuestionBank(courseId);
      setInternalQuestions(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Could not load questions');
      setInternalQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [courseId, open, useInternalFetch]);

  useEffect(() => {
    load();
  }, [load]);

  const questions = useInternalFetch ? internalQuestions : prefetchedQuestions || [];

  useEffect(() => {
    if (open) setAnswers({});
  }, [open, moduleFilterId, courseWideOnly]);

  const visibleQuestions = useMemo(() => {
    if (moduleFilterId) return questions.filter((q) => q.moduleId === moduleFilterId);
    if (courseWideOnly) return questions.filter((q) => !q.moduleId);
    return questions;
  }, [questions, moduleFilterId, courseWideOnly]);

  const isFilteredView = Boolean(moduleFilterId || courseWideOnly);

  const { courseWide, moduleGroups, orphaned } = useMemo(
    () => buildPracticeGroups(visibleQuestions, modulesForGrouping),
    [visibleQuestions, modulesForGrouping]
  );

  const setMcq = useCallback(
    (qid, idx) =>
      setAnswers((prev) => ({
        ...prev,
        [qid]: { ...prev[qid], selectedIndex: idx, result: null },
      })),
    []
  );

  const setTf = useCallback(
    (qid, v) =>
      setAnswers((prev) => ({
        ...prev,
        [qid]: { ...prev[qid], tf: v, result: null },
      })),
    []
  );

  const setShort = useCallback(
    (qid, v) =>
      setAnswers((prev) => ({
        ...prev,
        [qid]: { ...prev[qid], text: v, result: null },
      })),
    []
  );

  const checkOne = useCallback(
    async (q) => {
      const st = answers[q.id] || {};
      try {
        let payload = {};
        if (q.questionType === 'mcq') {
          if (st.selectedIndex == null) {
            toast.info('Select an option');
            return;
          }
          payload = { selectedIndex: st.selectedIndex };
        } else if (q.questionType === 'true_false') {
          if (!st.tf) {
            toast.info('Select True or False');
            return;
          }
          payload = { answer: st.tf };
        } else {
          if (!String(st.text || '').trim()) {
            toast.info('Type your answer');
            return;
          }
          payload = { answer: st.text };
        }
        const res = await courseService.checkCourseQuestionAnswer(courseId, q.id, payload);
        setAnswers((prev) => ({
          ...prev,
          [q.id]: { ...prev[q.id], result: res },
        }));
      } catch (e) {
        toast.error(e?.response?.data?.message || 'Check failed');
      }
    },
    [answers, courseId]
  );

  const hasStructure =
    !isFilteredView &&
    modulesForGrouping?.length > 0 &&
    (courseWide.length > 0 || moduleGroups.length > 0 || orphaned.length > 0);

  const showLoading = useInternalFetch && loading;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle sx={{ pr: 6 }}>
        <Box component="div">
          <Typography variant="h6" component="div">
            Practice questions
          </Typography>
          {subtitle ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 400 }}>
              {subtitle}
            </Typography>
          ) : null}
        </Box>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <Iconify icon="solar:close-circle-bold" width={24} />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {showLoading ? (
          <Typography color="text.secondary">Loading…</Typography>
        ) : visibleQuestions.length === 0 ? (
          <Typography color="text.secondary">
            {isFilteredView
              ? courseWideOnly
                ? 'No whole-course practice questions yet.'
                : 'No practice questions for this module yet.'
              : 'No practice questions for this course yet.'}
          </Typography>
        ) : isFilteredView ? (
          <Stack spacing={0}>
            {visibleQuestions.map((q, i) => (
              <QuestionItem
                key={q.id}
                q={q}
                indexLabel={i + 1}
                answers={answers}
                setMcq={setMcq}
                setTf={setTf}
                setShort={setShort}
                checkOne={checkOne}
                showDividerTop={i > 0}
              />
            ))}
          </Stack>
        ) : !hasStructure ? (
          <Stack spacing={0}>
            {visibleQuestions.map((q, i) => (
              <QuestionItem
                key={q.id}
                q={q}
                indexLabel={i + 1}
                answers={answers}
                setMcq={setMcq}
                setTf={setTf}
                setShort={setShort}
                checkOne={checkOne}
                showDividerTop={i > 0}
              />
            ))}
          </Stack>
        ) : (
          <Stack spacing={1}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Questions are grouped by course module.
            </Typography>

            {courseWide.length > 0 && (
              <Accordion defaultExpanded disableGutters>
                <AccordionSummary expandIcon={<Iconify icon="eva:chevron-down-fill" width={20} />}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Iconify icon="solar:global-bold" width={20} />
                    <Typography variant="subtitle2" fontWeight={700}>
                      Whole course ({courseWide.length})
                    </Typography>
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={0}>
                    {courseWide.map((q, i) => (
                      <QuestionItem
                        key={q.id}
                        q={q}
                        indexLabel={i + 1}
                        answers={answers}
                        setMcq={setMcq}
                        setTf={setTf}
                        setShort={setShort}
                        checkOne={checkOne}
                        showDividerTop={i > 0}
                      />
                    ))}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            )}

            {moduleGroups.map((mg, mi) => (
              <Accordion key={mg.moduleId} defaultExpanded={mi === 0 && courseWide.length === 0} disableGutters>
                <AccordionSummary expandIcon={<Iconify icon="eva:chevron-down-fill" width={20} />}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                    <Iconify icon="solar:widget-5-bold" width={20} />
                    <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ flex: 1 }}>
                      {mg.moduleTitle}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                      {mg.questions.length} Q
                    </Typography>
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={0}>
                    {mg.questions.map((q, qi) => (
                      <QuestionItem
                        key={q.id}
                        q={q}
                        indexLabel={qi + 1}
                        answers={answers}
                        setMcq={setMcq}
                        setTf={setTf}
                        setShort={setShort}
                        checkOne={checkOne}
                        showDividerTop={qi > 0}
                      />
                    ))}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            ))}

            {orphaned.length > 0 && (
              <Accordion disableGutters>
                <AccordionSummary expandIcon={<Iconify icon="eva:chevron-down-fill" width={20} />}>
                    <Typography variant="subtitle2" fontWeight={700} color="warning.main">
                    Unlinked ({orphaned.length}) — module may have been removed
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={0}>
                    {orphaned.map((q, i) => (
                      <QuestionItem
                        key={q.id}
                        q={q}
                        indexLabel={i + 1}
                        answers={answers}
                        setMcq={setMcq}
                        setTf={setTf}
                        setShort={setShort}
                        checkOne={checkOne}
                        showDividerTop={i > 0}
                      />
                    ))}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            )}
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}

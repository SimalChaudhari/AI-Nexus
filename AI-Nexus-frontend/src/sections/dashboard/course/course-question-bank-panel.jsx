import { useCallback, useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import IconButton from '@mui/material/IconButton';
import Drawer from '@mui/material/Drawer';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import Chip from '@mui/material/Chip';
import LoadingButton from '@mui/lab/LoadingButton';
import Autocomplete from '@mui/material/Autocomplete';

import { courseService } from 'src/services/course.service';
import { userService } from 'src/services/user.service';
import { Iconify } from 'src/components/iconify';
import { toast } from 'src/components/snackbar';
import { ConfirmDialog } from 'src/components/custom-dialog';

// ----------------------------------------------------------------------

const QUESTION_TYPES = [
  { value: 'mcq', label: 'Multiple choice' },
  { value: 'true_false', label: 'True / False' },
  { value: 'short_text', label: 'Short text' },
  { value: 'assignment', label: 'Assignment (file upload)' },
];

function questionTypeChipLabel(type) {
  if (type === 'true_false') return 'T/F';
  if (type === 'short_text') return 'Text';
  if (type === 'assignment') return 'Assignment';
  return 'MCQ';
}

function truncate(str, n = 72) {
  const s = String(str || '');
  return s.length <= n ? s : `${s.slice(0, n)}…`;
}

export function CourseQuestionBankPanel({ courseId, sx }) {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [moduleChoices, setModuleChoices] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [formType, setFormType] = useState('mcq');
  const [formPrompt, setFormPrompt] = useState('');
  const [formModuleId, setFormModuleId] = useState('');
  const [formExplanation, setFormExplanation] = useState('');
  const [formOptions, setFormOptions] = useState(['', '']);
  const [formCorrectIndex, setFormCorrectIndex] = useState(0);
  const [formTfCorrect, setFormTfCorrect] = useState('true');
  const [formShortCorrect, setFormShortCorrect] = useState('');
  const [formAssignedUsers, setFormAssignedUsers] = useState([]);
  const [userOptions, setUserOptions] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const loadAll = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const [mods, qs] = await Promise.all([
        courseService.getCourseModulesWithSections(courseId),
        courseService.getCourseQuestionBank(courseId),
      ]);
      const modOpts = (mods || []).map((m) => ({
        id: m.id,
        label: m.title || 'Untitled module',
      }));
      setModuleChoices(modOpts);
      setQuestions(Array.isArray(qs) ? qs : []);
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || 'Failed to load question bank');
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!dialogOpen || formType !== 'assignment') return;
    let active = true;
    setUsersLoading(true);
    userService
      .getAllUsers({ limit: 200 })
      .then((result) => {
        if (!active) return;
        const list = Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : [];
        setUserOptions(list);
      })
      .catch(() => {
        if (active) setUserOptions([]);
      })
      .finally(() => {
        if (active) setUsersLoading(false);
      });
    return () => {
      active = false;
    };
  }, [dialogOpen, formType]);

  useEffect(() => {
    if (!editing || editing.questionType !== 'assignment') return;
    const ids = Array.isArray(editing.assignedUserIds) ? editing.assignedUserIds : [];
    if (!ids.length) {
      setFormAssignedUsers([]);
      return;
    }
    setFormAssignedUsers(
      ids.map((id) => userOptions.find((u) => u.id === id) || { id, name: id, email: '' })
    );
  }, [editing, userOptions]);

  const moduleLabelById = useMemo(() => {
    const m = new Map();
    moduleChoices.forEach((mod) => m.set(mod.id, mod.label));
    return m;
  }, [moduleChoices]);

  const openCreate = () => {
    setEditing(null);
    setFormType('mcq');
    setFormPrompt('');
    setFormModuleId('');
    setFormExplanation('');
    setFormOptions(['', '']);
    setFormCorrectIndex(0);
    setFormTfCorrect('true');
    setFormShortCorrect('');
    setFormAssignedUsers([]);
    setDialogOpen(true);
  };

  const resolveAssignedUsersFromRow = (row) => {
    const ids = Array.isArray(row.assignedUserIds) ? row.assignedUserIds : [];
    if (!ids.length) return [];
    return ids
      .map((id) => userOptions.find((u) => u.id === id) || { id, name: id, email: '' })
      .filter(Boolean);
  };

  const openEdit = (row) => {
    setEditing(row);
    const t = row.questionType || 'mcq';
    setFormType(t);
    setFormPrompt(row.prompt || '');
    setFormModuleId(row.moduleId || '');
    setFormExplanation(row.explanation || '');
    if (t === 'mcq') {
      const opts = Array.isArray(row.options) && row.options.length ? [...row.options] : ['', ''];
      setFormOptions(opts);
      setFormCorrectIndex(
        row.correctIndex != null ? Math.min(Number(row.correctIndex), opts.length - 1) : 0
      );
    } else if (t === 'true_false') {
      setFormTfCorrect(row.correctAnswer === 'false' ? 'false' : 'true');
    } else if (t === 'assignment') {
      setFormAssignedUsers(resolveAssignedUsersFromRow(row));
    } else {
      setFormShortCorrect(row.correctAnswer || '');
    }
    setDialogOpen(true);
  };

  const buildPayload = () => {
    const base = {
      prompt: formPrompt.trim(),
      explanation: formExplanation.trim() || undefined,
    };
    if (formModuleId) {
      base.moduleId = formModuleId;
    } else if (editing) {
      base.moduleId = null;
    }
    if (formType === 'mcq') {
      const opts = formOptions.map((o) => String(o).trim()).filter(Boolean);
      if (opts.length < 2) {
        toast.error('Add at least two non-empty options');
        return null;
      }
      if (formCorrectIndex < 0 || formCorrectIndex >= opts.length) {
        toast.error('Pick a valid correct option');
        return null;
      }
      return {
        ...base,
        questionType: 'mcq',
        options: opts,
        correctIndex: formCorrectIndex,
      };
    }
    if (formType === 'true_false') {
      return {
        ...base,
        questionType: 'true_false',
        correctAnswer: formTfCorrect,
      };
    }
    if (formType === 'assignment') {
      const assignedUserIds = formAssignedUsers.map((u) => u.id).filter(Boolean);
      return {
        ...base,
        questionType: 'assignment',
        assignedUserIds: assignedUserIds.length ? assignedUserIds : null,
      };
    }
    if (!formShortCorrect.trim()) {
      toast.error('Enter the expected answer for short text');
      return null;
    }
    return {
      ...base,
      questionType: 'short_text',
      correctAnswer: formShortCorrect.trim(),
    };
  };

  const handleSave = async () => {
    const payload = buildPayload();
    if (!payload) return;
    if (!payload.prompt) {
      toast.error('Question text is required');
      return;
    }
    setSaving(true);
    try {
      if (editing?.id) {
        await courseService.updateCourseQuestion(editing.id, payload);
        toast.success('Question updated');
      } else {
        await courseService.createCourseQuestion(courseId, payload);
        toast.success('Question added');
      }
      setDialogOpen(false);
      await loadAll();
    } catch (e) {
      toast.error(e?.response?.data?.message?.[0] || e?.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget?.id) return;
    try {
      await courseService.deleteCourseQuestion(deleteTarget.id);
      toast.success('Question removed');
      setDeleteTarget(null);
      await loadAll();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Delete failed');
    }
  };

  const addOption = () => setFormOptions((prev) => [...prev, '']);
  const setOptionAt = (i, v) =>
    setFormOptions((prev) => {
      const next = [...prev];
      next[i] = v;
      return next;
    });
  const removeOption = (i) =>
    setFormOptions((prev) => (prev.length <= 2 ? prev : prev.filter((_, j) => j !== i)));

  if (!courseId) return null;

  return (
    <Card sx={{ p: 3, ...sx }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Iconify icon="solar:clipboard-list-bold" width={24} />
          <Typography variant="h6">Question bank</Typography>
        </Stack>
        <Button
          variant="contained"
          size="small"
          startIcon={<Iconify icon="mingcute:add-line" />}
          onClick={openCreate}
        >
          Add question
        </Button>
      </Stack>

      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
        Link questions to a <strong>module</strong> (one bank per module). Learners use “Module practice” after
        finishing all lessons in that module. Use <strong>Assignment</strong> for file uploads assigned to specific
        learners (or all enrolled learners if none are selected).
      </Typography>

      {loading ? (
        <Typography variant="body2" color="text.secondary">
          Loading…
        </Typography>
      ) : questions.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No questions yet. Add MCQ, true/false, short-text, or assignment items.
        </Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Type</TableCell>
              <TableCell>Question</TableCell>
              <TableCell>Module</TableCell>
              <TableCell align="right" width={100}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {questions.map((q) => (
              <TableRow key={q.id}>
                <TableCell>
                  <Chip
                    size="small"
                    label={questionTypeChipLabel(q.questionType)}
                    variant="soft"
                  />
                </TableCell>
                <TableCell>{truncate(q.prompt)}</TableCell>
                <TableCell sx={{ color: 'text.secondary', maxWidth: 220 }} noWrap>
                  {q.moduleId ? moduleLabelById.get(q.moduleId) || q.moduleId : '—'}
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" color="default" onClick={() => openEdit(q)}>
                    <Iconify icon="solar:pen-bold" width={18} />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => setDeleteTarget(q)}>
                    <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Drawer
        anchor="right"
        open={dialogOpen}
        onClose={() => !saving && setDialogOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: 1, sm: 480 },
            maxWidth: '100%',
            p: 0,
            height: '100%',
            maxHeight: '100%',
          },
        }}
      >
        <Stack sx={{ height: 1 }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ px: 2.5, py: 2, borderBottom: (theme) => `1px solid ${theme.palette.divider}` }}
          >
            <Typography variant="h6">{editing ? 'Edit question' : 'New question'}</Typography>
            <IconButton
              onClick={() => !saving && setDialogOpen(false)}
              aria-label="Close question drawer"
              disabled={saving}
            >
              <Iconify icon="solar:close-circle-bold" width={22} />
            </IconButton>
          </Stack>

          <Box sx={{ flex: 1, overflow: 'auto', px: 2.5, py: 2 }}>
            <Stack spacing={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Type</InputLabel>
                <Select
                  label="Type"
                  value={formType}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFormType(v);
                    if (v === 'mcq' && (!formOptions.length || formOptions.every((x) => !String(x).trim()))) {
                      setFormOptions(['', '']);
                    }
                  }}
                >
                  {QUESTION_TYPES.map((t) => (
                    <MenuItem key={t.value} value={t.value}>
                      {t.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Question"
                value={formPrompt}
                onChange={(e) => setFormPrompt(e.target.value)}
                multiline
                minRows={3}
                fullWidth
                required
              />

              <FormControl fullWidth size="small">
                <InputLabel>Module (optional)</InputLabel>
                <Select
                  label="Module (optional)"
                  value={formModuleId || ''}
                  onChange={(e) => setFormModuleId(e.target.value)}
                >
                  <MenuItem value="">Not linked to a module</MenuItem>
                  {moduleChoices.map((mod) => (
                    <MenuItem key={mod.id} value={mod.id}>
                      {mod.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
                Pick a module here for “Module practice” — no need to open the modules panel first.
              </Typography>

              {formType === 'mcq' && (
                <>
                  <Typography variant="caption" color="text.secondary">
                    Options
                  </Typography>
                  {formOptions.map((opt, i) => (
                    <Stack key={i} direction="row" spacing={1} alignItems="center">
                      <TextField
                        size="small"
                        fullWidth
                        label={`Option ${i + 1}`}
                        value={opt}
                        onChange={(e) => setOptionAt(i, e.target.value)}
                      />
                      <IconButton
                        size="small"
                        disabled={formOptions.length <= 2}
                        onClick={() => removeOption(i)}
                      >
                        <Iconify icon="solar:minus-circle-bold" />
                      </IconButton>
                    </Stack>
                  ))}
                  <Button size="small" onClick={addOption} startIcon={<Iconify icon="mingcute:add-line" />}>
                    Add option
                  </Button>
                  <FormControl fullWidth size="small">
                    <InputLabel>Correct option</InputLabel>
                    <Select
                      label="Correct option"
                      value={Math.min(formCorrectIndex, Math.max(0, formOptions.length - 1))}
                      onChange={(e) => setFormCorrectIndex(Number(e.target.value))}
                    >
                      {formOptions.map((_, i) => (
                        <MenuItem key={i} value={i}>
                          #{i + 1}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </>
              )}

              {formType === 'true_false' && (
                <FormControl fullWidth size="small">
                  <InputLabel>Correct answer</InputLabel>
                  <Select
                    label="Correct answer"
                    value={formTfCorrect}
                    onChange={(e) => setFormTfCorrect(e.target.value)}
                  >
                    <MenuItem value="true">True</MenuItem>
                    <MenuItem value="false">False</MenuItem>
                  </Select>
                </FormControl>
              )}

              {formType === 'short_text' && (
                <TextField
                  label="Expected answer (matched case-insensitive)"
                  value={formShortCorrect}
                  onChange={(e) => setFormShortCorrect(e.target.value)}
                  fullWidth
                  required
                />
              )}

              {formType === 'assignment' && (
                <>
                  <Typography variant="caption" color="text.secondary">
                    Assign to specific learners (optional). Leave empty to allow all enrolled learners.
                  </Typography>
                  <Autocomplete
                    multiple
                    loading={usersLoading}
                    options={userOptions}
                    value={formAssignedUsers}
                    onChange={(_e, value) => setFormAssignedUsers(value)}
                    getOptionLabel={(option) =>
                      option?.name
                        ? `${option.name}${option.email ? ` (${option.email})` : ''}`
                        : option?.email || option?.id || ''
                    }
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    renderInput={(params) => (
                      <TextField {...params} label="Assigned learners" placeholder="Search learners" />
                    )}
                  />
                </>
              )}

              <TextField
                label={
                  formType === 'assignment'
                    ? 'Instructions (optional)'
                    : 'Explanation (shown after check)'
                }
                value={formExplanation}
                onChange={(e) => setFormExplanation(e.target.value)}
                multiline
                minRows={2}
                fullWidth
              />
            </Stack>
          </Box>

          <Stack
            direction="row"
            spacing={1}
            justifyContent="flex-end"
            sx={{ px: 2.5, py: 2, borderTop: (theme) => `1px solid ${theme.palette.divider}` }}
          >
            <Button onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <LoadingButton variant="contained" loading={saving} onClick={handleSave}>
              Save
            </LoadingButton>
          </Stack>
        </Stack>
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete question"
        content="Remove this question from the bank?"
        action={
          <Button variant="contained" color="error" onClick={handleConfirmDelete}>
            Delete
          </Button>
        }
      />
    </Card>
  );
}

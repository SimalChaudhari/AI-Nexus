import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Drawer from '@mui/material/Drawer';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';
import Autocomplete from '@mui/material/Autocomplete';

import { Iconify } from 'src/components/iconify';
import { Upload } from 'src/components/upload';

import {
  ASSIGNMENT_REFERENCE_ACCEPT,
  QUESTION_TYPES,
} from './course-question-bank-utils';

// ----------------------------------------------------------------------

export function CourseQuestionBankQuestionFormDrawer({
  open,
  saving,
  editing,
  moduleChoices,
  formType,
  formTypeOptions = QUESTION_TYPES,
  formTypeLocked = false,
  formPrompt,
  formModuleId,
  formExplanation,
  formOptions,
  formCorrectIndex,
  formTfCorrect,
  formShortCorrect,
  formAssignedUsers,
  userOptions,
  usersLoading,
  referenceMaterials,
  onClose,
  onSave,
  onFormTypeChange,
  onFormPromptChange,
  onFormModuleIdChange,
  onFormExplanationChange,
  onFormCorrectIndexChange,
  onFormTfCorrectChange,
  onFormShortCorrectChange,
  onFormAssignedUsersChange,
  onReferenceMaterialsChange,
  onAddOption,
  onSetOptionAt,
  onRemoveOption,
}) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={() => !saving && onClose()}
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
          <Typography variant="h6">
            {editing
              ? formType === 'assignment'
                ? 'Edit assessment'
                : 'Edit question'
              : formType === 'assignment'
                ? 'New assessment'
                : 'New question'}
          </Typography>
          <IconButton
            onClick={() => !saving && onClose()}
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
                disabled={formTypeLocked}
                onChange={onFormTypeChange}
              >
                {formTypeOptions.map((t) => (
                  <MenuItem key={t.value} value={t.value}>
                    {t.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {formType !== 'assignment' && (
              <TextField
                label="Question"
                value={formPrompt}
                onChange={onFormPromptChange}
                multiline
                minRows={3}
                fullWidth
                required
              />
            )}

            <FormControl fullWidth size="small">
              <InputLabel>Module (optional)</InputLabel>
              <Select
                label="Module (optional)"
                value={formModuleId || ''}
                onChange={onFormModuleIdChange}
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
                      onChange={(e) => onSetOptionAt(i, e.target.value)}
                    />
                    <IconButton
                      size="small"
                      disabled={formOptions.length <= 2}
                      onClick={() => onRemoveOption(i)}
                    >
                      <Iconify icon="solar:minus-circle-bold" />
                    </IconButton>
                  </Stack>
                ))}
                <Button size="small" onClick={onAddOption} startIcon={<Iconify icon="mingcute:add-line" />}>
                  Add option
                </Button>
                <FormControl fullWidth size="small">
                  <InputLabel>Correct option</InputLabel>
                  <Select
                    label="Correct option"
                    value={Math.min(formCorrectIndex, Math.max(0, formOptions.length - 1))}
                    onChange={onFormCorrectIndexChange}
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
                <Select label="Correct answer" value={formTfCorrect} onChange={onFormTfCorrectChange}>
                  <MenuItem value="true">True</MenuItem>
                  <MenuItem value="false">False</MenuItem>
                </Select>
              </FormControl>
            )}

            {formType === 'short_text' && (
              <TextField
                label="Expected answer (matched case-insensitive)"
                value={formShortCorrect}
                onChange={onFormShortCorrectChange}
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
                  onChange={(_e, value) => onFormAssignedUsersChange(value)}
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
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Reference file (optional)
                  </Typography>
                  <Upload
                    multiple
                    value={referenceMaterials}
                    showViewButton
                    accept={ASSIGNMENT_REFERENCE_ACCEPT}
                    maxSize={52428800}
                    onDrop={(acceptedFiles) => {
                      if (acceptedFiles?.length) {
                        onReferenceMaterialsChange([acceptedFiles[0]]);
                      }
                    }}
                    onRemove={(item) =>
                      onReferenceMaterialsChange(referenceMaterials.filter((i) => i !== item))
                    }
                    helperText="PDF, Word, Excel, PowerPoint, CSV, TXT, or ZIP — uploaded when you save (max 50MB each)"
                  />
                </Box>
              </>
            )}

            <TextField
              label={
                formType === 'assignment'
                  ? 'Instructions (optional)'
                  : 'Explanation (shown after check)'
              }
              value={formExplanation}
              onChange={onFormExplanationChange}
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
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <LoadingButton variant="contained" loading={saving} onClick={onSave}>
            Save
          </LoadingButton>
        </Stack>
      </Stack>
    </Drawer>
  );
}

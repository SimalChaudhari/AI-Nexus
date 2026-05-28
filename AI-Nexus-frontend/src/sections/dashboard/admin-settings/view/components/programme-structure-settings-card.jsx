import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import Collapse from '@mui/material/Collapse';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import LoadingButton from '@mui/lab/LoadingButton';
import { alpha } from '@mui/material/styles';

import { toast } from 'src/components/snackbar';
import { Editor } from 'src/components/editor';
import { RichTextContent } from 'src/components/html-content';
import { Iconify } from 'src/components/iconify';
import { categoryIcons } from 'src/_mock/_category-icons';
import { isEffectivelyEmptyHtml } from 'src/utils/html-plain-text';
import {
  PROGRAMME_STRUCTURE_PHASES_MAX,
  createProgrammePhaseId,
  normalizeProgrammeStructureContent,
} from 'src/sections/home/programme-structure-defaults';
import { IconPickerDrawer } from './icon-picker-drawer';

const NAVY = '#0f2744';
const RED = '#e63946';

const emptyPhase = () => ({ id: '', label: '', title: '', description: '', icon: '' });

function isLikelyImagePath(value) {
  const s = String(value || '').trim();
  if (!s) return false;
  if (/^https?:\/\//i.test(s) || s.startsWith('/')) return true;
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(s);
}

function resolvePhaseIconPreview(icon) {
  const custom = String(icon || '').trim();
  if (custom) return custom;
  return 'solar:star-bold';
}

function PhaseIconPreview({ icon, index, size = 18 }) {
  const value = resolvePhaseIconPreview(icon, index);
  if (isLikelyImagePath(value)) {
    return (
      <Box component="img" src={value} alt="" sx={{ width: size, height: size, objectFit: 'contain' }} />
    );
  }
  return (
    <Iconify icon={value} width={size} sx={{ color: index % 2 === 0 ? RED : NAVY }} />
  );
}

function PhaseListRow({
  stepNumber,
  label,
  subtitle,
  icon,
  iconIndex,
  previewHtml,
  isExpanded,
  onToggleExpand,
  onEdit,
  disabled,
}) {
  return (
    <Box
      sx={{
        p: 1.1,
        borderRadius: 2,
        border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.14)}`,
        bgcolor: (theme) => alpha(theme.palette.background.paper, 0.92),
        boxShadow: (theme) => `0 4px 14px ${alpha(theme.palette.common.black, 0.05)}`,
        transition: (theme) =>
          theme.transitions.create(['border-color', 'box-shadow'], { duration: 180 }),
        '&:hover': {
          borderColor: (theme) => alpha(theme.palette.primary.main, 0.32),
          boxShadow: (theme) => `0 6px 18px ${alpha(theme.palette.primary.dark, 0.1)}`,
        },
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'common.white',
            border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
          }}
        >
          <PhaseIconPreview icon={icon} index={iconIndex} size={16} />
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Typography
              component="span"
              variant="caption"
              sx={{
                fontWeight: 700,
                color: NAVY,
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                px: 0.75,
                py: 0.15,
                borderRadius: 0.75,
                lineHeight: 1.4,
                flexShrink: 0,
              }}
            >
              {stepNumber}
            </Typography>
            <Typography
              variant="body2"
              noWrap
              sx={{ fontWeight: 600, color: NAVY, minWidth: 0 }}
            >
              {label}
            </Typography>
          </Stack>
          {subtitle ? (
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }} noWrap>
              {subtitle}
            </Typography>
          ) : null}
        </Box>

        <Stack direction="row" spacing={0} sx={{ flexShrink: 0 }}>
          <Tooltip title={isExpanded ? 'Hide preview' : 'Preview'}>
            <IconButton size="small" onClick={onToggleExpand} color={isExpanded ? 'primary' : 'default'}>
              <Iconify icon="solar:eye-bold" width={18} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit step">
            <IconButton size="small" onClick={onEdit} disabled={disabled}>
              <Iconify icon="solar:pen-bold" width={18} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
        <Box
          sx={{
            mt: 1,
            pt: 1,
            borderTop: (theme) => `1px dashed ${alpha(theme.palette.divider, 0.9)}`,
          }}
        >
          {previewHtml && !isEffectivelyEmptyHtml(previewHtml) ? (
            <RichTextContent
              html={previewHtml}
              sx={{
                typography: 'caption',
                color: 'text.secondary',
                lineHeight: 1.55,
                '& p': { m: 0, mb: 0.35, '&:last-child': { mb: 0 } },
              }}
            />
          ) : (
            <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
              No description yet.
            </Typography>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}

export function ProgrammeStructureSettingsCard({
  content,
  setContent,
  submitting,
  onSave,
  onUploadPhaseIcon,
  uploadingPhaseIconId = null,
}) {
  const phases = Array.isArray(content?.phases) ? content.phases : [];
  const fileInputRef = useRef(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState('add');
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(emptyPhase());
  const [expandedPhaseId, setExpandedPhaseId] = useState(null);
  const [iconToolOpen, setIconToolOpen] = useState(false);
  const [iconSearchQuery, setIconSearchQuery] = useState('');

  const availableCategoryIcons = useMemo(() => [...new Set(categoryIcons)], []);
  const filteredCategoryIcons = useMemo(
    () =>
      availableCategoryIcons.filter((iconName) =>
        iconName.toLowerCase().includes(iconSearchQuery.toLowerCase())
      ),
    [availableCategoryIcons, iconSearchQuery]
  );

  const activePhaseId = String(editingId || draft.id || '').trim();
  const canUploadPhaseIcon = drawerMode === 'edit' && Boolean(activePhaseId) && Boolean(onUploadPhaseIcon);
  const draftIconIndex = editingId ? phases.findIndex((p) => p.id === editingId) : phases.length;

  const persistContent = async (nextContent) => {
    setContent(nextContent);
    const updated = await onSave(nextContent);
    if (updated) {
      setContent(normalizeProgrammeStructureContent(updated?.homeProgrammeStructureContent));
    }
    return updated;
  };

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setEditingId(null);
    setDraft(emptyPhase());
  }, []);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeDrawer();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen, closeDrawer]);

  const openAddDrawer = () => {
    if (phases.length >= PROGRAMME_STRUCTURE_PHASES_MAX) return;
    setDrawerMode('add');
    setEditingId(null);
    setDraft({
      ...emptyPhase(),
      label: `Step ${phases.length + 1}`,
    });
    setDrawerOpen(true);
  };

  const openEditDrawer = (itemId) => {
    if (!itemId) return;
    const row = phases.find((p) => p.id === itemId);
    if (!row) return;
    setDrawerMode('edit');
    setEditingId(itemId);
    setDraft({
      id: String(row.id || ''),
      label: String(row.label || ''),
      title: String(row.title || ''),
      description: String(row.description || ''),
      icon: String(row.icon || ''),
    });
    setDrawerOpen(true);
  };

  const handlePhaseIconUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !onUploadPhaseIcon || !activePhaseId) {
      toast.error('Save the step first, then upload an image');
      return;
    }
    try {
      const updated = await onUploadPhaseIcon(activePhaseId, file);
      if (updated) {
        const next = normalizeProgrammeStructureContent(updated?.homeProgrammeStructureContent);
        setContent(next);
        const row = next.phases.find((p) => p.id === activePhaseId);
        if (row) {
          setDraft((prev) => ({ ...prev, icon: String(row.icon || '') }));
        }
      }
    } catch {
      // Parent toast
    }
  };

  const handleDrawerApply = async () => {
    const title = String(draft.title || '').trim();
    if (!title) {
      toast.error('Step title is required');
      return;
    }
    const entry = {
      id: drawerMode === 'add' ? createProgrammePhaseId() : String(editingId || ''),
      label: String(draft.label || '').trim() || `Step ${phases.length + 1}`,
      title,
      description: String(draft.description || ''),
      icon: String(draft.icon || '').trim(),
    };
    if (!entry.id) {
      toast.error('Missing step id — refresh and try again');
      return;
    }

    const rows = [...phases];
    let nextContent;
    if (drawerMode === 'add') {
      nextContent = { ...content, phases: [...rows, entry] };
    } else if (editingId) {
      const index = rows.findIndex((row) => row.id === editingId);
      if (index < 0) return;
      rows[index] = entry;
      nextContent = { ...content, phases: rows };
    } else {
      return;
    }

    try {
      await persistContent(nextContent);
      toast.success(drawerMode === 'add' ? 'Step added' : 'Step updated');
      closeDrawer();
    } catch {
      // Parent toast
    }
  };

  const handleDrawerDelete = async () => {
    if (drawerMode !== 'edit' || !editingId) return;
    const nextContent = {
      ...content,
      phases: phases.filter((row) => row.id !== editingId),
    };
    try {
      await persistContent(nextContent);
      toast.success('Step removed');
      closeDrawer();
    } catch {
      // Parent toast
    }
  };

  return (
    <>
      <Card
        sx={{
          p: { xs: 1.5, md: 2 },
          borderRadius: 2.5,
          overflow: 'hidden',
          border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.16)}`,
          boxShadow: (theme) => `0 10px 28px ${alpha(theme.palette.primary.dark, 0.12)}`,
          background: (theme) =>
            `linear-gradient(180deg, ${alpha(theme.palette.primary.light, 0.08)} 0%, ${theme.palette.background.paper} 38%)`,
        }}
      >
        <Stack spacing={1.75}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
            <Stack spacing={0.25} sx={{ minWidth: 0 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: NAVY }}>
                AI Fluency Journey
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.45 }}>
                Timeline heading, step icons, titles & descriptions
              </Typography>
            </Stack>
            <LoadingButton
              variant="contained"
              size="small"
              loading={submitting}
              onClick={() => onSave()}
              sx={{ borderRadius: 999, flexShrink: 0, px: 2 }}
            >
              Save
            </LoadingButton>
          </Stack>

          <Box
            sx={{
              p: 1.25,
              borderRadius: 2,
              border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.9)}`,
              bgcolor: (theme) => alpha(theme.palette.background.paper, 0.7),
            }}
          >
            <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 1, fontSize: '0.65rem' }}>
              Section copy
            </Typography>
            <Grid container spacing={1} sx={{ mt: 0.5 }}>
              <Grid item xs={12} md={4}>
                <TextField
                  size="small"
                  label="Eyebrow"
                  value={content?.eyebrow || ''}
                  onChange={(e) => setContent((prev) => ({ ...prev, eyebrow: e.target.value }))}
                  fullWidth
                  placeholder="Optional"
                />
              </Grid>
              <Grid item xs={12} md={5}>
                <TextField
                  size="small"
                  label="Heading"
                  value={content?.heading || ''}
                  onChange={(e) => setContent((prev) => ({ ...prev, heading: e.target.value }))}
                  fullWidth
                  placeholder="Your AI Fluency Journey"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  size="small"
                  label="Underline word"
                  value={content?.headingUnderlineWord || ''}
                  onChange={(e) =>
                    setContent((prev) => ({ ...prev, headingUnderlineWord: e.target.value }))
                  }
                  fullWidth
                  placeholder="Fluency"
                />
              </Grid>
            </Grid>
          </Box>

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: NAVY }}>
                Journey steps
              </Typography>
              <Box
                sx={{
                  px: 1,
                  py: 0.2,
                  borderRadius: 999,
                  typography: 'caption',
                  fontWeight: 700,
                  color: NAVY,
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                }}
              >
                {phases.length}/{PROGRAMME_STRUCTURE_PHASES_MAX}
              </Box>
            </Stack>
            <Button
              variant="contained"
              size="small"
              startIcon={<Iconify icon="mingcute:add-line" width={16} />}
              onClick={openAddDrawer}
              disabled={phases.length >= PROGRAMME_STRUCTURE_PHASES_MAX || submitting}
              sx={{ borderRadius: 999 }}
            >
              Add step
            </Button>
          </Stack>

          {phases.length === 0 ? (
            <Box
              sx={{
                py: 3,
                px: 2,
                textAlign: 'center',
                borderRadius: 2,
                border: (theme) => `1px dashed ${alpha(theme.palette.divider, 0.9)}`,
                bgcolor: (theme) => alpha(theme.palette.background.neutral, 0.4),
              }}
            >
              <Iconify icon="solar:map-arrow-right-bold-duotone" width={32} sx={{ color: 'text.disabled', mb: 1 }} />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                No steps yet. Add up to {PROGRAMME_STRUCTURE_PHASES_MAX} timeline steps.
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={1}>
              {phases.map((row, index) => {
                const rowId = String(row?.id || '').trim();
                const title =
                  String(row?.title || '').trim() ||
                  String(row?.label || '').trim() ||
                  `Step ${index + 1}`;
                const subtitle = String(row?.label || '').trim();
                return (
                  <Grid item xs={12} sm={6} lg={4} key={rowId || `phase-list-${index}`}>
                    <PhaseListRow
                      stepNumber={index + 1}
                      label={title}
                      subtitle={subtitle && subtitle !== title ? subtitle : ''}
                      icon={row?.icon}
                      iconIndex={index}
                      previewHtml={row?.description}
                      isExpanded={expandedPhaseId === rowId}
                      onToggleExpand={() =>
                        setExpandedPhaseId((prev) => (prev === rowId ? null : rowId))
                      }
                      onEdit={() => openEditDrawer(rowId)}
                      disabled={submitting || !rowId}
                    />
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Stack>
      </Card>

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={closeDrawer}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 420 },
            p: 0,
            borderLeft: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
          },
        }}
      >
        <Stack sx={{ height: '100%' }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{
              px: 2,
              py: 1.5,
              background: (theme) =>
                `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.06)} 0%, transparent 100%)`,
            }}
          >
            <Stack spacing={0}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: NAVY }}>
                {drawerMode === 'add' ? 'Add journey step' : 'Edit journey step'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Icon, title & description
              </Typography>
            </Stack>
            <IconButton size="small" onClick={closeDrawer} aria-label="Close">
              <Iconify icon="mingcute:close-line" width={20} />
            </IconButton>
          </Stack>
          <Divider />

          <Stack spacing={1.5} sx={{ flex: 1, overflow: 'auto', p: 2 }}>
            <Box
              sx={{
                p: 1.25,
                borderRadius: 2,
                border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.14)}`,
                bgcolor: (theme) => alpha(theme.palette.primary.light, 0.06),
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 700, color: NAVY, display: 'block', mb: 1 }}>
                Step icon
              </Typography>
              <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'common.white',
                    border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
                    flexShrink: 0,
                  }}
                >
                  <PhaseIconPreview icon={draft.icon} index={draftIconIndex >= 0 ? draftIconIndex : 0} size={20} />
                </Box>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    setIconSearchQuery('');
                    setIconToolOpen(true);
                  }}
                  disabled={submitting}
                  sx={{ borderRadius: 999 }}
                >
                  Icon
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={submitting || !canUploadPhaseIcon || uploadingPhaseIconId === activePhaseId}
                  sx={{ borderRadius: 999 }}
                >
                  {uploadingPhaseIconId === activePhaseId ? '…' : 'Image'}
                </Button>
                <Button
                  size="small"
                  color="error"
                  variant="soft"
                  onClick={() => setDraft((prev) => ({ ...prev, icon: '' }))}
                  disabled={submitting || !draft.icon}
                  sx={{ borderRadius: 999, minWidth: 0, px: 1.25 }}
                >
                  Clear
                </Button>
              </Stack>
              {!canUploadPhaseIcon ? (
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.75 }}>
                  Save once to enable image upload.
                </Typography>
              ) : null}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handlePhaseIconUpload}
              />
            </Box>

            <Grid container spacing={1}>
              <Grid item xs={4}>
                <TextField
                  size="small"
                  label="Step #"
                  value={draft.label || ''}
                  onChange={(e) => setDraft((prev) => ({ ...prev, label: e.target.value }))}
                  placeholder={`${phases.length + 1}`}
                  fullWidth
                />
              </Grid>
              <Grid item xs={8}>
                <TextField
                  size="small"
                  label="Title"
                  value={draft.title || ''}
                  onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
                  required
                  fullWidth
                  autoFocus
                />
              </Grid>
            </Grid>

            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, color: NAVY, mb: 0.75, display: 'block' }}>
                Description
              </Typography>
              <Editor
                value={draft.description || ''}
                onChange={(value) => setDraft((prev) => ({ ...prev, description: value }))}
                sx={{ minHeight: 140, '& .ql-editor': { minHeight: 100 } }}
              />
            </Box>
          </Stack>

          <Stack
            direction="row"
            spacing={1}
            justifyContent="space-between"
            sx={{
              p: 2,
              borderTop: (theme) => `1px solid ${theme.palette.divider}`,
              bgcolor: 'background.paper',
            }}
          >
            {drawerMode === 'edit' ? (
              <Button
                size="small"
                color="error"
                variant="outlined"
                onClick={handleDrawerDelete}
                disabled={submitting}
              >
                Delete
              </Button>
            ) : (
              <Box />
            )}
            <Stack direction="row" spacing={1}>
              <Button size="small" color="inherit" variant="outlined" onClick={closeDrawer} disabled={submitting}>
                Cancel
              </Button>
              <Button
                size="small"
                variant="contained"
                onClick={handleDrawerApply}
                disabled={submitting || !String(draft.title || '').trim()}
              >
                {drawerMode === 'add' ? 'Add' : 'Save'}
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </Drawer>

      <IconPickerDrawer
        open={iconToolOpen}
        onClose={() => setIconToolOpen(false)}
        contextLabel={drawerMode === 'add' ? 'new journey step' : String(draft.title || 'step')}
        searchQuery={iconSearchQuery}
        onSearchQueryChange={(event) => setIconSearchQuery(event.target.value)}
        filteredIcons={filteredCategoryIcons}
        selectedIcon={draft.icon || resolvePhaseIconPreview('', phases.length)}
        onSelectIcon={(iconName) => {
          setDraft((prev) => ({ ...prev, icon: iconName }));
          setIconToolOpen(false);
        }}
      />
    </>
  );
}

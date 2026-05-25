import { useCallback, useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
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

import { toast } from 'src/components/snackbar';
import { Editor } from 'src/components/editor';
import { RichTextContent } from 'src/components/html-content';
import { Iconify } from 'src/components/iconify';
import { HERO_TYPOGRAPHY } from 'src/theme/hero-typography';
import { isEffectivelyEmptyHtml } from 'src/utils/html-plain-text';
import {
  PROGRAMME_STRUCTURE_PHASES_MAX,
  createProgrammePhaseId,
  normalizeProgrammeStructureContent,
} from 'src/sections/home/programme-structure-defaults';

const emptyPhase = () => ({ id: '', label: '', title: '', description: '' });

function PhaseListRow({ label, previewHtml, previewFallback, isExpanded, onToggleExpand, onEdit, disabled }) {
  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="flex-start"
      sx={{
        pt: { xs: 1.5, sm: 2 },
        pb: isExpanded ? 0.5 : { xs: 1.5, sm: 2 },
      }}
    >
      <Box
        sx={{
          mt: 0.15,
          width: 36,
          height: 36,
          borderRadius: '50%',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 48%, #eab308 100%)',
        }}
      >
        <Iconify icon="solar:map-arrow-right-bold" width={18} sx={{ color: 'common.white' }} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            lineHeight: 1.5,
            ...(isExpanded
              ? { wordBreak: 'break-word' }
              : {
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }),
          }}
        >
          {label}
        </Typography>
        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <Box sx={{ pt: 0.75, pb: 0.25 }}>
            {previewHtml && !isEffectivelyEmptyHtml(previewHtml) ? (
              <RichTextContent
                html={previewHtml}
                sx={{
                  typography: 'body2',
                  color: 'text.secondary',
                  lineHeight: 1.65,
                  '& p': { m: 0, mb: 0.5, '&:last-child': { mb: 0 } },
                }}
              />
            ) : previewFallback ? (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {previewFallback}
              </Typography>
            ) : (
              <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                No description yet.
              </Typography>
            )}
          </Box>
        </Collapse>
      </Box>
      <Stack direction="row" spacing={0} sx={{ flexShrink: 0 }}>
        <Tooltip title={isExpanded ? 'Hide preview' : 'View preview'}>
          <IconButton size="small" onClick={onToggleExpand} color={isExpanded ? 'primary' : 'default'}>
            <Iconify icon="solar:eye-bold" width={20} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Edit in sidebar">
          <IconButton size="small" onClick={onEdit} disabled={disabled}>
            <Iconify icon="solar:pen-bold" width={20} />
          </IconButton>
        </Tooltip>
      </Stack>
    </Stack>
  );
}

export function ProgrammeStructureSettingsCard({ content, setContent, submitting, onSave }) {
  const phases = Array.isArray(content?.phases) ? content.phases : [];

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState('add');
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(emptyPhase());
  const [expandedPhaseId, setExpandedPhaseId] = useState(null);

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
      label: `Phase ${phases.length + 1}`,
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
    });
    setDrawerOpen(true);
  };

  const handleDrawerApply = async () => {
    const title = String(draft.title || '').trim();
    if (!title) {
      toast.error('Phase title is required');
      return;
    }
    const entry = {
      id: drawerMode === 'add' ? createProgrammePhaseId() : String(editingId || ''),
      label: String(draft.label || '').trim() || `Phase ${phases.length + 1}`,
      title,
      description: String(draft.description || ''),
    };
    if (!entry.id) {
      toast.error('Missing phase id — refresh and try again');
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
      toast.success(drawerMode === 'add' ? 'Phase added' : 'Phase updated');
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
      toast.success('Phase removed');
      closeDrawer();
    } catch {
      // Parent toast
    }
  };

  return (
    <>
      <Card sx={{ p: 3, overflow: 'hidden' }}>
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="h6" sx={{ mb: 1, ...HERO_TYPOGRAPHY.adminCardTitle }}>
              Programme structure
            </Typography>
            <Typography variant="body2" sx={HERO_TYPOGRAPHY.adminCardDescription}>
              Timeline on the home page — eyebrow, heading, and phases (rich text descriptions).
            </Typography>
          </Box>

          <TextField
            label="Eyebrow (e.g. PROGRAMME STRUCTURE)"
            value={content?.eyebrow || ''}
            onChange={(e) => setContent((prev) => ({ ...prev, eyebrow: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Section heading"
            value={content?.heading || ''}
            onChange={(e) => setContent((prev) => ({ ...prev, heading: e.target.value }))}
            fullWidth
          />

          <Divider />

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
            spacing={1}
          >
            <Stack spacing={0.25}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Phases
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {phases.length} / {PROGRAMME_STRUCTURE_PHASES_MAX}
              </Typography>
            </Stack>
            <Button
              variant="outlined"
              onClick={openAddDrawer}
              disabled={phases.length >= PROGRAMME_STRUCTURE_PHASES_MAX || submitting}
            >
              Add phase
            </Button>
          </Stack>

          <Box sx={{ borderTop: (theme) => `1px solid ${theme.palette.divider}` }}>
            {phases.length === 0 ? (
              <Typography variant="body2" sx={{ py: 3, color: 'text.secondary', textAlign: 'center' }}>
                No phases yet. Add phases to build the learning journey timeline.
              </Typography>
            ) : (
              phases.map((row, index) => {
                const rowId = String(row?.id || '').trim();
                const label = String(row?.title || '').trim() || String(row?.label || '').trim() || `Phase ${index + 1}`;
                const isLast = index === phases.length - 1;
                return (
                  <Box key={rowId || `phase-list-${index}`}>
                    <PhaseListRow
                      label={label}
                      previewHtml={row?.description}
                      previewFallback={row?.label}
                      isExpanded={expandedPhaseId === rowId}
                      onToggleExpand={() =>
                        setExpandedPhaseId((prev) => (prev === rowId ? null : rowId))
                      }
                      onEdit={() => openEditDrawer(rowId)}
                      disabled={submitting || !rowId}
                    />
                    {!isLast ? <Divider /> : null}
                  </Box>
                );
              })
            )}
          </Box>

          <LoadingButton variant="contained" loading={submitting} onClick={() => onSave()} sx={{ alignSelf: 'flex-start' }}>
            Save programme structure
          </LoadingButton>
        </Stack>
      </Card>

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={closeDrawer}
        PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, p: 0 } }}
      >
        <Stack sx={{ height: '100%' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 2.5, pb: 2 }}>
            <Typography variant="h6">
              {drawerMode === 'add' ? 'Add phase' : 'Edit phase'}
            </Typography>
            <IconButton onClick={closeDrawer} aria-label="Close">
              <Iconify icon="mingcute:close-line" width={22} />
            </IconButton>
          </Stack>
          <Divider />
          <Stack spacing={2} sx={{ flex: 1, overflow: 'auto', p: 2.5 }}>
            <TextField
              label="Phase label"
              value={draft.label || ''}
              onChange={(e) => setDraft((prev) => ({ ...prev, label: e.target.value }))}
              placeholder="Phase 1"
              fullWidth
            />
            <TextField
              label="Phase title"
              value={draft.title || ''}
              onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
              required
              fullWidth
            />
            <Typography variant="subtitle2">Description</Typography>
            <Editor
              value={draft.description || ''}
              onChange={(value) => setDraft((prev) => ({ ...prev, description: value }))}
              sx={{ minHeight: 200 }}
            />
          </Stack>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            justifyContent="space-between"
            sx={{ p: 2.5, borderTop: (theme) => `1px solid ${theme.palette.divider}` }}
          >
            {drawerMode === 'edit' ? (
              <Button color="error" variant="outlined" onClick={handleDrawerDelete} disabled={submitting}>
                Delete phase
              </Button>
            ) : (
              <Box sx={{ display: { xs: 'none', sm: 'block' } }} />
            )}
            <Stack direction="row" spacing={1.5} justifyContent="flex-end">
              <Button color="inherit" variant="outlined" onClick={closeDrawer} disabled={submitting}>
                Cancel
              </Button>
              <Button variant="contained" onClick={handleDrawerApply} disabled={submitting || !String(draft.title || '').trim()}>
                {drawerMode === 'add' ? 'Add' : 'Save'}
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </Drawer>
    </>
  );
}

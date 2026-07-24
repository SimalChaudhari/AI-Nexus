import { useCallback, useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import MenuItem from '@mui/material/MenuItem';
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
import { Iconify } from 'src/components/iconify';
import { categoryIcons } from 'src/_mock/_category-icons';
import { HERO_TYPOGRAPHY } from 'src/theme/hero-typography';
import {
  ENROL_OPTIONS_CARDS_MAX,
  createEnrolOptionCardId,
  normalizeEnrolOptionsContent,
} from 'src/sections/home/enrol-options-defaults';
import { IconPickerDrawer } from './icon-picker-drawer';

const ACTION_OPTIONS = [
  { value: 'isca', label: 'ISCA member (SSO login)' },
  { value: 'eligibility', label: 'Eligibility (fee-waiver modal)' },
  { value: 'register', label: 'Register (paid sign-up page)' },
];

const emptyCard = () => ({
  id: '',
  title: '',
  description: '',
  ctaLabel: '',
  icon: 'solar:user-rounded-bold-duotone',
  accentColor: '#3D2A7A',
  action: 'eligibility',
  href: '',
});

export function EnrolOptionsSettingsCard({ content, setContent, submitting, onSave }) {
  const cards = Array.isArray(content?.cards) ? content.cards : [];

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState('add');
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(emptyCard());
  const [expandedId, setExpandedId] = useState(null);
  const [iconToolOpen, setIconToolOpen] = useState(false);
  const [iconSearchQuery, setIconSearchQuery] = useState('');

  const canAddMore = cards.length < ENROL_OPTIONS_CARDS_MAX;

  const availableCategoryIcons = useMemo(() => [...new Set(categoryIcons)], []);
  const filteredCategoryIcons = useMemo(
    () =>
      availableCategoryIcons.filter((iconName) =>
        iconName.toLowerCase().includes(iconSearchQuery.toLowerCase())
      ),
    [availableCategoryIcons, iconSearchQuery]
  );

  const persistContent = async (nextContent) => {
    setContent(nextContent);
    const updated = await onSave(nextContent);
    if (updated) {
      setContent(normalizeEnrolOptionsContent(updated?.homeEnrolOptionsContent));
    }
    return updated;
  };

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setEditingId(null);
    setDraft(emptyCard());
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
    if (!canAddMore) return;
    setDrawerMode('add');
    setEditingId(null);
    setDraft(emptyCard());
    setDrawerOpen(true);
  };

  const openEditDrawer = (cardId) => {
    if (!cardId) return;
    const row = cards.find((p) => p.id === cardId);
    if (!row) return;
    setDrawerMode('edit');
    setEditingId(cardId);
    setDraft({
      id: String(row.id || ''),
      title: String(row.title || ''),
      description: String(row.description || ''),
      ctaLabel: String(row.ctaLabel || ''),
      icon: String(row.icon || emptyCard().icon),
      accentColor: String(row.accentColor || emptyCard().accentColor),
      action: String(row.action || 'eligibility'),
      href: String(row.href || ''),
    });
    setDrawerOpen(true);
  };

  const handleDrawerApply = async () => {
    const title = String(draft.title || '').trim();
    if (!title) {
      toast.error('Title is required');
      return;
    }
    const entry = {
      id: drawerMode === 'add' ? createEnrolOptionCardId() : String(editingId || ''),
      title,
      description: String(draft.description || ''),
      ctaLabel: String(draft.ctaLabel || '').trim(),
      icon: String(draft.icon || '').trim() || emptyCard().icon,
      accentColor: String(draft.accentColor || '').trim() || emptyCard().accentColor,
      action: String(draft.action || 'eligibility'),
      href: String(draft.href || '').trim(),
    };
    if (!entry.id) {
      toast.error('Missing card id — refresh and try again');
      return;
    }

    const rows = [...cards];
    let nextContent;
    if (drawerMode === 'add') {
      nextContent = { ...content, cards: [...rows, entry] };
    } else if (editingId) {
      const index = rows.findIndex((row) => row.id === editingId);
      if (index < 0) return;
      rows[index] = entry;
      nextContent = { ...content, cards: rows };
    } else {
      return;
    }

    try {
      await persistContent(nextContent);
      toast.success(drawerMode === 'add' ? 'Card added' : 'Card updated');
      closeDrawer();
    } catch {
      // Parent toast
    }
  };

  const handleDrawerDelete = async () => {
    if (drawerMode !== 'edit' || !editingId) return;
    const nextContent = {
      ...content,
      cards: cards.filter((row) => row.id !== editingId),
    };
    try {
      await persistContent(nextContent);
      toast.success('Card removed');
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
              Enrol options
            </Typography>
            <Typography variant="body2" sx={HERO_TYPOGRAPHY.adminCardDescription}>
              “How would you like to enrol?” cards under the hero — icon, title, description, CTA,
              and action (up to {ENROL_OPTIONS_CARDS_MAX}).
            </Typography>
          </Box>

          <TextField
            label="Section heading"
            value={content?.heading || ''}
            onChange={(e) => setContent((prev) => ({ ...prev, heading: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Subtitle"
            value={content?.subtitle || ''}
            onChange={(e) => setContent((prev) => ({ ...prev, subtitle: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Compare prompt"
            value={content?.comparePrompt || ''}
            onChange={(e) => setContent((prev) => ({ ...prev, comparePrompt: e.target.value }))}
            fullWidth
            helperText='Shown before the compare link, e.g. “Not sure which option…”'
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Compare link label"
              value={content?.compareLinkLabel || ''}
              onChange={(e) => setContent((prev) => ({ ...prev, compareLinkLabel: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Compare link URL / #hash"
              value={content?.compareHref || ''}
              onChange={(e) => setContent((prev) => ({ ...prev, compareHref: e.target.value }))}
              fullWidth
              placeholder="#eligibility-membership"
            />
          </Stack>

          <Divider />

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
            spacing={1}
          >
            <Stack spacing={0.25}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Cards
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {cards.length} / {ENROL_OPTIONS_CARDS_MAX}
              </Typography>
            </Stack>
            <Button
              variant="outlined"
              startIcon={<Iconify icon="mingcute:add-line" />}
              onClick={openAddDrawer}
              disabled={!canAddMore || submitting}
            >
              Add card
            </Button>
          </Stack>

          <Stack spacing={1.25}>
            {cards.map((row, index) => {
              const isExpanded = expandedId === row.id;
              return (
                <Box
                  key={row.id || `enrol-card-${index}`}
                  sx={(theme) => ({
                    borderRadius: 2,
                    border: `1px solid ${theme.palette.divider}`,
                    bgcolor: theme.palette.background.neutral,
                    overflow: 'hidden',
                  })}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1.25}
                    sx={{ px: 1.5, py: 1.25 }}
                  >
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: row.accentColor || '#3D2A7A',
                        color: '#fff',
                        flexShrink: 0,
                      }}
                    >
                      <Iconify icon={row.icon || emptyCard().icon} width={18} />
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
                        {row.title || `Card ${index + 1}`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {row.ctaLabel || row.action || '—'}
                      </Typography>
                    </Box>
                    <Tooltip title={isExpanded ? 'Collapse' : 'Preview'}>
                      <IconButton
                        size="small"
                        onClick={() => setExpandedId(isExpanded ? null : row.id)}
                      >
                        <Iconify
                          icon={isExpanded ? 'eva:arrow-ios-upward-fill' : 'eva:arrow-ios-downward-fill'}
                        />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => openEditDrawer(row.id)}>
                        <Iconify icon="solar:pen-bold" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                  <Collapse in={isExpanded}>
                    <Box sx={{ px: 1.5, pb: 1.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        {row.description || 'No description'}
                      </Typography>
                    </Box>
                  </Collapse>
                </Box>
              );
            })}
            {!cards.length ? (
              <Typography variant="body2" color="text.secondary">
                No cards yet. Add up to {ENROL_OPTIONS_CARDS_MAX} enrolment options.
              </Typography>
            ) : null}
          </Stack>

          <Stack direction="row" justifyContent="flex-end">
            <LoadingButton
              variant="contained"
              loading={submitting}
              onClick={async () => {
                try {
                  await onSave();
                } catch {
                  // Parent toast
                }
              }}
            >
              Save section
            </LoadingButton>
          </Stack>
        </Stack>
      </Card>

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={closeDrawer}
        PaperProps={{ sx: { width: { xs: 1, sm: 420 }, p: 2.5 } }}
      >
        <Stack spacing={2} sx={{ height: 1 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">{drawerMode === 'add' ? 'Add card' : 'Edit card'}</Typography>
            <IconButton onClick={closeDrawer}>
              <Iconify icon="mingcute:close-line" />
            </IconButton>
          </Stack>

          <TextField
            label="Title"
            value={draft.title}
            onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
            fullWidth
            required
          />
          <TextField
            label="Description"
            value={draft.description}
            onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
            fullWidth
            multiline
            minRows={2}
          />
          <TextField
            label="Button label"
            value={draft.ctaLabel}
            onChange={(e) => setDraft((prev) => ({ ...prev, ctaLabel: e.target.value }))}
            fullWidth
          />
          <TextField
            select
            label="Action"
            value={draft.action || 'eligibility'}
            onChange={(e) => setDraft((prev) => ({ ...prev, action: e.target.value }))}
            fullWidth
          >
            {ACTION_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Custom URL (optional override)"
            value={draft.href}
            onChange={(e) => setDraft((prev) => ({ ...prev, href: e.target.value }))}
            fullWidth
            helperText="If set, this URL is used instead of the action above."
          />
          <TextField
            label="Accent colour"
            value={draft.accentColor}
            onChange={(e) => setDraft((prev) => ({ ...prev, accentColor: e.target.value }))}
            fullWidth
            placeholder="#3D2A7A"
            InputProps={{
              startAdornment: (
                <Box
                  sx={{
                    width: 18,
                    height: 18,
                    borderRadius: 0.75,
                    bgcolor: draft.accentColor || '#3D2A7A',
                    border: '1px solid',
                    borderColor: 'divider',
                    mr: 1,
                    flexShrink: 0,
                  }}
                />
              ),
            }}
          />
          <Button
            variant="outlined"
            startIcon={<Iconify icon={draft.icon || emptyCard().icon} />}
            onClick={() => {
              setIconSearchQuery('');
              setIconToolOpen(true);
            }}
          >
            Choose icon
          </Button>

          <Box sx={{ flexGrow: 1 }} />

          <Stack direction="row" spacing={1} justifyContent="space-between">
            {drawerMode === 'edit' ? (
              <Button color="error" onClick={handleDrawerDelete} disabled={submitting}>
                Delete
              </Button>
            ) : (
              <span />
            )}
            <Stack direction="row" spacing={1}>
              <Button onClick={closeDrawer}>Cancel</Button>
              <LoadingButton variant="contained" loading={submitting} onClick={handleDrawerApply}>
                {drawerMode === 'add' ? 'Add' : 'Save'}
              </LoadingButton>
            </Stack>
          </Stack>
        </Stack>
      </Drawer>

      <IconPickerDrawer
        open={iconToolOpen}
        onClose={() => setIconToolOpen(false)}
        contextLabel="enrol option card"
        searchQuery={iconSearchQuery}
        onSearchQueryChange={(event) => setIconSearchQuery(event.target.value)}
        filteredIcons={filteredCategoryIcons}
        selectedIcon={draft.icon || emptyCard().icon}
        onSelectIcon={(iconName) => {
          setDraft((prev) => ({ ...prev, icon: iconName }));
          setIconToolOpen(false);
        }}
      />
    </>
  );
}

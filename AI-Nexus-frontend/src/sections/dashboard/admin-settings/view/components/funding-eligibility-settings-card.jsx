import { useCallback, useEffect, useMemo, useState } from 'react';

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
import { categoryIcons } from 'src/_mock/_category-icons';
import { HERO_TYPOGRAPHY } from 'src/theme/hero-typography';
import { isEffectivelyEmptyHtml } from 'src/utils/html-plain-text';
import {
  FUNDING_ELIGIBILITY_ITEMS_MAX,
  createFundingEligibilityCardId,
  normalizeFundingEligibilityContent,
} from 'src/sections/home/funding-eligibility-defaults';
import { IconPickerDrawer } from './icon-picker-drawer';

const emptyItem = () => ({
  id: '',
  icon: 'solar:flag-bold-duotone',
  title: '',
  description: '',
});

export function FundingEligibilitySettingsCard({ content, setContent, submitting, onSave }) {
  const items = Array.isArray(content?.items) ? content.items : [];

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState('add');
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(emptyItem());
  const [expandedId, setExpandedId] = useState(null);
  const [iconToolOpen, setIconToolOpen] = useState(false);
  const [iconSearchQuery, setIconSearchQuery] = useState('');

  const canAddMore = items.length < FUNDING_ELIGIBILITY_ITEMS_MAX;
  const editingIndex = editingId ? items.findIndex((row) => row.id === editingId) : -1;

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
      setContent(normalizeFundingEligibilityContent(updated?.homeFundingEligibilityContent));
    }
    return updated;
  };

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setEditingId(null);
    setDraft(emptyItem());
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
    setDraft(emptyItem());
    setDrawerOpen(true);
  };

  const openEditDrawer = (itemId) => {
    if (!itemId) return;
    const row = items.find((p) => p.id === itemId);
    if (!row) return;
    setDrawerMode('edit');
    setEditingId(itemId);
    setDraft({
      id: String(row.id || ''),
      icon: String(row.icon || emptyItem().icon),
      title: String(row.title || ''),
      description: String(row.description || ''),
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
      id: drawerMode === 'add' ? createFundingEligibilityCardId() : String(editingId || ''),
      icon: String(draft.icon || '').trim() || emptyItem().icon,
      title,
      description: String(draft.description || ''),
    };
    if (!entry.id) {
      toast.error('Missing item id — refresh and try again');
      return;
    }

    const rows = [...items];
    let nextContent;
    if (drawerMode === 'add') {
      nextContent = { ...content, items: [...rows, entry] };
    } else if (editingId) {
      const index = rows.findIndex((row) => row.id === editingId);
      if (index < 0) return;
      rows[index] = entry;
      nextContent = { ...content, items: rows };
    } else {
      return;
    }

    try {
      await persistContent(nextContent);
      toast.success(drawerMode === 'add' ? 'Item added' : 'Item updated');
      closeDrawer();
    } catch {
      // Parent toast
    }
  };

  const handleDrawerDelete = async () => {
    if (drawerMode !== 'edit' || !editingId) return;
    const nextContent = {
      ...content,
      items: items.filter((row) => row.id !== editingId),
    };
    try {
      await persistContent(nextContent);
      toast.success('Item removed');
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
              Funding & eligibility
            </Typography>
            <Typography variant="body2" sx={HERO_TYPOGRAPHY.adminCardDescription}>
              Card grid on the home page — each item has an icon, title, and description (up to{' '}
              {FUNDING_ELIGIBILITY_ITEMS_MAX}).
            </Typography>
          </Box>

          <TextField
            label="Eyebrow (e.g. FUNDING & ELIGIBILITY)"
            value={content?.eyebrow || ''}
            onChange={(e) => setContent((prev) => ({ ...prev, eyebrow: e.target.value }))}
            fullWidth
          />
          <TextField
            label="Section heading"
            value={content?.heading || ''}
            onChange={(e) => setContent((prev) => ({ ...prev, heading: e.target.value }))}
            fullWidth
            placeholder="Accessible AI Learning for Everyone"
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
                Items
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {items.length} / {FUNDING_ELIGIBILITY_ITEMS_MAX}
              </Typography>
            </Stack>
            <Button variant="outlined" onClick={openAddDrawer} disabled={!canAddMore || submitting}>
              Add item
            </Button>
          </Stack>

          <Box sx={{ borderTop: (theme) => `1px solid ${theme.palette.divider}` }}>
            {items.length === 0 ? (
              <Typography variant="body2" sx={{ py: 3, color: 'text.secondary', textAlign: 'center' }}>
                No items yet. Add cards for funding and eligibility options.
              </Typography>
            ) : (
              items.map((row, index) => {
                const rowId = String(row?.id || '').trim();
                const label = String(row?.title || '').trim() || `Item ${index + 1}`;
                const isLast = index === items.length - 1;
                return (
                  <Box key={rowId || `fe-list-${index}`}>
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="flex-start"
                      sx={{
                        pt: { xs: 1.5, sm: 2 },
                        pb: expandedId === rowId ? 0.5 : { xs: 1.5, sm: 2 },
                      }}
                    >
                      <Box
                        sx={{
                          mt: 0.15,
                          width: 36,
                          height: 36,
                          borderRadius: 1,
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: 'background.neutral',
                          border: (theme) => `1px solid ${theme.palette.divider}`,
                          color: '#e63946',
                        }}
                      >
                        <Iconify icon={row?.icon || emptyItem().icon} width={20} />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            lineHeight: 1.5,
                            ...(expandedId === rowId
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
                        <Collapse in={expandedId === rowId} timeout="auto" unmountOnExit>
                          <Box sx={{ pt: 0.75, pb: 0.25 }}>
                            {row?.description && !isEffectivelyEmptyHtml(row.description) ? (
                              <RichTextContent
                                html={row.description}
                                sx={{
                                  typography: 'body2',
                                  color: 'text.secondary',
                                  lineHeight: 1.65,
                                  '& p': { m: 0, mb: 0.5, '&:last-child': { mb: 0 } },
                                }}
                              />
                            ) : (
                              <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                                No description yet.
                              </Typography>
                            )}
                          </Box>
                        </Collapse>
                      </Box>
                      <Stack direction="row" spacing={0} sx={{ flexShrink: 0 }}>
                        <Tooltip title={expandedId === rowId ? 'Hide preview' : 'View preview'}>
                          <IconButton
                            size="small"
                            onClick={() => setExpandedId((prev) => (prev === rowId ? null : rowId))}
                            color={expandedId === rowId ? 'primary' : 'default'}
                          >
                            <Iconify icon="solar:eye-bold" width={20} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit in sidebar">
                          <IconButton
                            size="small"
                            onClick={() => openEditDrawer(rowId)}
                            disabled={submitting || !rowId}
                          >
                            <Iconify icon="solar:pen-bold" width={20} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Stack>
                    {!isLast ? <Divider /> : null}
                  </Box>
                );
              })
            )}
          </Box>

          <LoadingButton variant="contained" loading={submitting} onClick={() => onSave()} sx={{ alignSelf: 'flex-start' }}>
            Save funding & eligibility
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
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{
              px: 2.5,
              py: 2,
              borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
            }}
          >
            <Typography variant="h6" sx={HERO_TYPOGRAPHY.adminCardTitle}>
              {drawerMode === 'add' ? 'Add item' : 'Edit item'}
            </Typography>
            <IconButton onClick={closeDrawer} aria-label="Close">
              <Iconify icon="mingcute:close-line" />
            </IconButton>
          </Stack>

          <Stack spacing={2.5} sx={{ flex: 1, overflow: 'auto', p: 2.5 }}>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={(theme) => ({
                p: 1.25,
                borderRadius: 1.5,
                border: `1px solid ${theme.palette.divider}`,
                bgcolor: 'background.neutral',
              })}
            >
              <Box
                component="button"
                type="button"
                onClick={() => {
                  setIconSearchQuery('');
                  setIconToolOpen(true);
                }}
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 1.25,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'background.paper',
                  border: (theme) => `1px solid ${theme.palette.divider}`,
                  color: '#e63946',
                  flexShrink: 0,
                  cursor: 'pointer',
                  p: 0,
                }}
                aria-label="Pick icon"
              >
                <Iconify icon={draft.icon || emptyItem().icon} width={24} />
              </Box>
              <Button
                variant="outlined"
                onClick={() => {
                  setIconSearchQuery('');
                  setIconToolOpen(true);
                }}
                sx={{ flex: 1 }}
              >
                Pick icon
              </Button>
            </Stack>

            <TextField
              label="Title"
              value={draft.title || ''}
              onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
              required
              fullWidth
              autoFocus
            />

            <Typography variant="subtitle2">Description</Typography>
            <Editor
              value={draft.description || ''}
              onChange={(value) => setDraft((prev) => ({ ...prev, description: value }))}
              sx={{ minHeight: 160 }}
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
                Delete item
              </Button>
            ) : (
              <Box sx={{ display: { xs: 'none', sm: 'block' } }} />
            )}
            <Stack direction="row" spacing={1.5} justifyContent="flex-end">
              <Button color="inherit" variant="outlined" onClick={closeDrawer} disabled={submitting}>
                Cancel
              </Button>
              <Button
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
        contextLabel={
          drawerMode === 'add'
            ? 'new funding item'
            : `funding item ${editingIndex >= 0 ? editingIndex + 1 : ''}`
        }
        searchQuery={iconSearchQuery}
        onSearchQueryChange={(event) => setIconSearchQuery(event.target.value)}
        filteredIcons={filteredCategoryIcons}
        selectedIcon={draft.icon || emptyItem().icon}
        onSelectIcon={(iconName) => {
          setDraft((prev) => ({ ...prev, icon: iconName }));
          setIconToolOpen(false);
        }}
      />
    </>
  );
}

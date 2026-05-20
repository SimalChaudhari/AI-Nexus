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
import { Iconify } from 'src/components/iconify';
import { HERO_TYPOGRAPHY } from 'src/theme/hero-typography';
import { ViewHtmlContent } from 'src/components/html-content/view-html-content';

const emptyFaqItem = () => ({ question: '', answer: '' });

export function FaqSettingsCard({
  faqContent,
  setFaqContent,
  faqContentSubmitting,
  onSave,
  maxItems = 50,
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState('add');
  const [editingIndex, setEditingIndex] = useState(null);
  const [draft, setDraft] = useState(emptyFaqItem());
  const [expandedIndex, setExpandedIndex] = useState(null);

  const items = Array.isArray(faqContent?.items) ? faqContent.items : [];
  const canAddMore = items.length < maxItems;

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setEditingIndex(null);
    setDraft(emptyFaqItem());
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
    setEditingIndex(null);
    setDraft(emptyFaqItem());
    setDrawerOpen(true);
  };

  const toggleExpand = (index) => {
    setExpandedIndex((prev) => (prev === index ? null : index));
  };

  const openEditDrawer = (index) => {
    const row = items[index];
    if (!row) return;
    setDrawerMode('edit');
    setEditingIndex(index);
    setDraft({
      question: String(row.question || ''),
      answer: String(row.answer || ''),
    });
    setDrawerOpen(true);
  };

  const buildNextContent = (nextItems) => ({
    pageHeading: faqContent?.pageHeading || '',
    items: nextItems,
  });

  const persistContent = async (nextContent) => {
    setFaqContent(nextContent);
    await onSave(nextContent);
  };

  const handleSaveHeading = async () => {
    try {
      await persistContent(buildNextContent(items));
      toast.success('Page heading saved');
    } catch {
      // Parent shows error toast
    }
  };

  const handleDrawerSave = async () => {
    const question = String(draft.question || '').trim();
    if (!question) {
      toast.error('Question is required');
      return;
    }

    const entry = { question, answer: String(draft.answer || '') };
    let nextItems;

    if (drawerMode === 'add') {
      nextItems = [...items, entry];
    } else if (editingIndex != null && editingIndex >= 0) {
      nextItems = items.map((row, i) => (i === editingIndex ? entry : row));
    } else {
      return;
    }

    try {
      await persistContent(buildNextContent(nextItems));
      toast.success(drawerMode === 'add' ? 'FAQ added' : 'FAQ updated');
      closeDrawer();
    } catch {
      // Parent shows error toast
    }
  };

  const handleDrawerDelete = async () => {
    if (drawerMode !== 'edit' || editingIndex == null) return;
    const nextItems = items.filter((_, i) => i !== editingIndex);
    try {
      await persistContent(buildNextContent(nextItems));
      toast.success('FAQ removed');
      closeDrawer();
    } catch {
      // Parent shows error toast
    }
  };

  return (
    <>
      <Card sx={{ p: 3, overflow: 'hidden' }}>
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="h6" sx={{ mb: 1, ...HERO_TYPOGRAPHY.adminCardTitle }}>
              FAQs Page
            </Typography>
            <Typography variant="body2" sx={HERO_TYPOGRAPHY.adminCardDescription}>
              Configure FAQs on the home page and the public /faqs page.
            </Typography>
          </Box>

          <Box
            sx={(theme) => ({
              p: 1.5,
              borderRadius: 2,
              border: `1px solid ${theme.palette.divider}`,
              bgcolor: theme.palette.background.neutral,
            })}
          >
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={1.5}
              alignItems={{ xs: 'stretch', md: 'center' }}
            >
              <TextField
                label="Page heading"
                value={faqContent?.pageHeading || ''}
                onChange={(event) =>
                  setFaqContent((prev) => ({ ...prev, pageHeading: event.target.value }))
                }
                fullWidth
                sx={{ flex: { md: 1 }, minWidth: 0 }}
              />
              <LoadingButton
                variant="contained"
                loading={faqContentSubmitting}
                onClick={handleSaveHeading}
                sx={{
                  flexShrink: 0,
                  minWidth: 'unset',
                  whiteSpace: 'nowrap',
                  alignSelf: { xs: 'flex-end', md: 'auto' },
                }}
              >
                Save heading
              </LoadingButton>
            </Stack>
          </Box>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
            spacing={1}
          >
            <Stack spacing={0.25}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                FAQ items
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {items.length} / {maxItems} items
              </Typography>
            </Stack>
            <Button
              variant="outlined"
              onClick={openAddDrawer}
              disabled={!canAddMore || faqContentSubmitting}
            >
              Add FAQ
            </Button>
          </Stack>

          <Box sx={{ borderTop: (theme) => `1px solid ${theme.palette.divider}` }}>
            {items.length === 0 ? (
              <Typography variant="body2" sx={{ py: 4, color: 'text.secondary', textAlign: 'center' }}>
                No FAQs yet. Click Add FAQ to create your first question.
              </Typography>
            ) : (
              items.map((row, index) => {
                const label = String(row?.question || '').trim() || 'Untitled question';
                const isExpanded = expandedIndex === index;
                const answer = String(row?.answer || '').trim();
                const isLast = index === items.length - 1;

                return (
                  <Box key={`faq-row-${index}`}>
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="flex-start"
                      sx={{
                        pt: { xs: 1.5, sm: 2 },
                        pb: isExpanded ? 0.5 : { xs: 1.5, sm: 2 },
                      }}
                    >
                      <Typography
                        component="span"
                        variant="body2"
                        sx={{
                          width: 24,
                          flexShrink: 0,
                          pt: 0.15,
                          fontWeight: 700,
                          color: 'text.secondary',
                        }}
                      >
                        {index + 1}.
                      </Typography>

                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            color: 'text.primary',
                            fontWeight: 500,
                            lineHeight: 1.5,
                            pr: 0.5,
                            ...(isExpanded
                              ? { wordBreak: 'break-word' }
                              : {
                                  display: '-webkit-box',
                                  WebkitLineClamp: { xs: 3, sm: 2 },
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                }),
                          }}
                        >
                          {label}
                        </Typography>

                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Box sx={{ pt: 0.75, pb: 0.25 }}>
                            {answer ? (
                              <ViewHtmlContent
                                html={answer}
                                sx={{
                                  '& p': { mb: 0.5, mt: 0 },
                                  '& p:first-of-type': { mt: 0 },
                                  '& p:last-child': { mb: 0 },
                                  '& > *:first-of-type': { mt: '0 !important' },
                                }}
                              />
                            ) : (
                              <Typography
                                variant="body2"
                                sx={{ color: 'text.secondary', fontStyle: 'italic' }}
                              >
                                No answer yet.
                              </Typography>
                            )}
                          </Box>
                        </Collapse>
                      </Box>

                      <Stack direction="row" spacing={0} sx={{ flexShrink: 0 }}>
                        <Tooltip title={isExpanded ? 'Hide answer' : 'View answer'}>
                          <IconButton
                            size="small"
                            onClick={() => toggleExpand(index)}
                            aria-label={isExpanded ? 'Hide answer' : 'View answer'}
                            color={isExpanded ? 'primary' : 'default'}
                          >
                            <Iconify icon="solar:eye-bold" width={20} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit FAQ">
                          <IconButton
                            size="small"
                            onClick={() => openEditDrawer(index)}
                            disabled={faqContentSubmitting}
                            aria-label="Edit FAQ"
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
              {drawerMode === 'add' ? 'Add FAQ' : 'Edit FAQ'}
            </Typography>
            <IconButton onClick={closeDrawer} aria-label="Close FAQ form">
              <Iconify icon="mingcute:close-line" />
            </IconButton>
          </Stack>

          <Stack spacing={2.5} sx={{ flex: 1, overflow: 'auto', p: 2.5 }}>
            <TextField
              label="Question"
              value={draft.question}
              onChange={(event) => setDraft((prev) => ({ ...prev, question: event.target.value }))}
              fullWidth
              autoFocus
            />

            <Stack spacing={0.75}>
              <Typography variant="subtitle2">Answer</Typography>
              <Editor
                value={draft.answer}
                onChange={(value) => setDraft((prev) => ({ ...prev, answer: value }))}
                placeholder="Write the answer..."
                editable
                slotProps={{
                  wrap: {
                    sx: {
                      minHeight: 220,
                      borderRadius: 1.5,
                      border: (theme) => `1px solid ${theme.palette.divider}`,
                      bgcolor: 'background.paper',
                    },
                  },
                }}
              />
            </Stack>
          </Stack>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            justifyContent="space-between"
            alignItems={{ xs: 'stretch', sm: 'center' }}
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderTop: (theme) => `1px solid ${theme.palette.divider}`,
            }}
          >
            {drawerMode === 'edit' ? (
              <Button
                color="error"
                variant="outlined"
                onClick={handleDrawerDelete}
                disabled={faqContentSubmitting}
                fullWidth={false}
                sx={{ alignSelf: { xs: 'stretch', sm: 'auto' } }}
              >
                Delete
              </Button>
            ) : (
              <Box sx={{ display: { xs: 'none', sm: 'block' } }} />
            )}

            <Stack direction="row" spacing={1.5} justifyContent="flex-end">
              <Button
                color="inherit"
                variant="outlined"
                onClick={closeDrawer}
                disabled={faqContentSubmitting}
                sx={{ flex: { xs: 1, sm: 'none' } }}
              >
                Cancel
              </Button>
              <LoadingButton
                variant="contained"
                loading={faqContentSubmitting}
                onClick={handleDrawerSave}
                sx={{ flex: { xs: 1, sm: 'none' } }}
              >
                {drawerMode === 'add' ? 'Add' : 'Save'}
              </LoadingButton>
            </Stack>
          </Stack>
        </Stack>
      </Drawer>
    </>
  );
}

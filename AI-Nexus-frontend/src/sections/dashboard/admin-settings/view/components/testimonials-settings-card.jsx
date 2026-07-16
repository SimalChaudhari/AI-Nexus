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
import { Upload } from 'src/components/upload';
import { Editor } from 'src/components/editor';
import { RichTextContent } from 'src/components/html-content';
import { Iconify } from 'src/components/iconify';
import { isEffectivelyEmptyHtml } from 'src/utils/html-plain-text';
import { CONFIG } from 'src/config-global';
import { HERO_TYPOGRAPHY } from 'src/theme/hero-typography';
import { appSettingsService } from 'src/services/app-settings.service';
import {
  TESTIMONIALS_MAX,
  INDUSTRY_QUOTES_MAX,
  createTestimonialsItemId,
  normalizeTestimonialsContent,
} from 'src/sections/home/testimonials-defaults';

const emptyTestimonial = () => ({ id: '', quote: '', name: '', role: '', avatarUrl: '', rating: 5 });
const emptyIndustryQuote = () => ({ id: '', quote: '', organisation: '', logoUrl: '' });

function findTestimonialRow(rows, id) {
  return (rows || []).find((row) => String(row?.id || '') === String(id || ''));
}

function findIndustryRow(rows, id) {
  return (rows || []).find((row) => String(row?.id || '') === String(id || ''));
}

function resolvePreviewUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  const base = CONFIG.site.serverUrl.replace(/\/api\/?$/, '');
  return `${base}${raw.startsWith('/') ? raw : `/${raw}`}`;
}

function ItemListRow({
  icon,
  label,
  previewHtml,
  previewFallback,
  isExpanded,
  onToggleExpand,
  onEdit,
  disabled,
}) {
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
      <Box sx={{ mt: 0.15, flexShrink: 0 }}>{icon}</Box>
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
                  typography: 'body1',
                  fontSize: '1rem',
                  lineHeight: 1.8,
                  color: 'text.secondary',
                  overflow: 'visible',
                  '& img': {
                    maxWidth: '100%',
                    height: 'auto',
                    maxHeight: 'min(560px, 78vh)',
                    objectFit: 'contain',
                    verticalAlign: 'middle',
                    borderRadius: 1.5,
                  },
                  '& figure': {
                    maxWidth: '100%',
                  },
                }}
              />
            ) : previewFallback ? (
              <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                {previewFallback}
              </Typography>
            ) : (
              <Typography
                variant="body2"
                sx={{ color: 'text.secondary', fontStyle: 'italic', lineHeight: 1.6 }}
              >
                No details yet.
              </Typography>
            )}
          </Box>
        </Collapse>
      </Box>
      <Stack direction="row" spacing={0} sx={{ flexShrink: 0 }}>
        <Tooltip title={isExpanded ? 'Hide preview' : 'View preview'}>
          <IconButton
            size="small"
            onClick={onToggleExpand}
            color={isExpanded ? 'primary' : 'default'}
            aria-label={isExpanded ? 'Hide preview' : 'View preview'}
          >
            <Iconify icon="solar:eye-bold" width={20} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Edit in sidebar">
          <IconButton size="small" onClick={onEdit} disabled={disabled} aria-label="Edit">
            <Iconify icon="solar:pen-bold" width={20} />
          </IconButton>
        </Tooltip>
      </Stack>
    </Stack>
  );
}

function DrawerImageUpload({
  label,
  file,
  storedUrl,
  uploading,
  onDrop,
  onUpload,
  onDeleteImage,
}) {
  const preview = file || (storedUrl ? resolvePreviewUrl(storedUrl) : null);
  const hasStored = Boolean(String(storedUrl || '').trim());

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2">{label}</Typography>
      <Upload
        value={preview}
        onDrop={onDrop}
        onDelete={preview ? onDeleteImage : undefined}
        accept={{ 'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'] }}
        maxSize={5 * 1024 * 1024}
        disabled={uploading}
        helperText="JPG, PNG, GIF, WEBP. Max 5 MB. Use X on the preview or Delete image to remove."
        sx={{
          '& > .MuiBox-root:first-of-type': {
            minHeight: 120,
            p: 2,
          },
        }}
      />
      <Stack direction="row" spacing={1} flexWrap="wrap">
        <LoadingButton
          size="small"
          variant="contained"
          loading={uploading}
          onClick={onUpload}
          disabled={!file}
        >
          Save image
        </LoadingButton>
        <Button
          size="small"
          color="error"
          variant="outlined"
          onClick={onDeleteImage}
          disabled={uploading || (!file && !hasStored)}
        >
          {file && !hasStored ? 'Clear selected' : 'Delete image'}
        </Button>
      </Stack>
    </Stack>
  );
}

export function TestimonialsSettingsCard({ content, setContent, submitting, onSave }) {
  const testimonials = Array.isArray(content?.testimonials) ? content.testimonials : [];
  const industryQuotes = Array.isArray(content?.industryQuotes) ? content.industryQuotes : [];

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerKind, setDrawerKind] = useState('testimonial');
  const [drawerMode, setDrawerMode] = useState('add');
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(emptyTestimonial());
  const [expandedTestimonialId, setExpandedTestimonialId] = useState(null);
  const [expandedIndustryId, setExpandedIndustryId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageRemovingKey, setImageRemovingKey] = useState(null);

  const applyFromSettings = useCallback(
    (settings) => {
      setContent(normalizeTestimonialsContent(settings?.homeTestimonialsContent));
    },
    [setContent]
  );

  const persistContent = async (nextContent) => {
    setContent(nextContent);
    const updated = await onSave(nextContent);
    if (updated) {
      applyFromSettings(updated);
    }
    return updated;
  };

  const patchImageRemovedLocally = useCallback(
    (kind, itemId) => {
      if (!itemId) return;
      setContent((prev) => {
        if (kind === 'testimonial') {
          const rows = [...(prev.testimonials || [])];
          const index = rows.findIndex((row) => row.id === itemId);
          if (index < 0) return prev;
          rows[index] = { ...rows[index], avatarUrl: '' };
          return { ...prev, testimonials: rows };
        }
        const rows = [...(prev.industryQuotes || [])];
        const index = rows.findIndex((row) => row.id === itemId);
        if (index < 0) return prev;
        rows[index] = { ...rows[index], logoUrl: '' };
        return { ...prev, industryQuotes: rows };
      });
    },
    [setContent]
  );

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setEditingId(null);
    setDraft(emptyTestimonial());
    setImageFile(null);
  }, []);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeDrawer();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen, closeDrawer]);

  const openAddDrawer = (kind) => {
    const max = kind === 'testimonial' ? TESTIMONIALS_MAX : INDUSTRY_QUOTES_MAX;
    const count = kind === 'testimonial' ? testimonials.length : industryQuotes.length;
    if (count >= max) return;
    setDrawerKind(kind);
    setDrawerMode('add');
    setEditingId(null);
    setDraft(kind === 'testimonial' ? emptyTestimonial() : emptyIndustryQuote());
    setImageFile(null);
    setDrawerOpen(true);
  };

  const openEditDrawer = (kind, itemId) => {
    if (!itemId) return;
    const row =
      kind === 'testimonial'
        ? findTestimonialRow(testimonials, itemId)
        : findIndustryRow(industryQuotes, itemId);
    if (!row) return;
    setDrawerKind(kind);
    setDrawerMode('edit');
    setEditingId(itemId);
    setImageFile(null);
    if (kind === 'testimonial') {
      setDraft({
        id: String(row.id || ''),
        quote: String(row.quote || ''),
        name: String(row.name || ''),
        role: String(row.role || ''),
        avatarUrl: String(row.avatarUrl || ''),
        rating: row.rating != null ? Number(row.rating) : 5,
      });
    } else {
      setDraft({
        id: String(row.id || ''),
        quote: String(row.quote || ''),
        organisation: String(row.organisation || ''),
        logoUrl: String(row.logoUrl || ''),
      });
    }
    setDrawerOpen(true);
  };

  const uploadItemId = drawerMode === 'add' ? null : editingId;

  const removeImageById = async (kind, itemId) => {
    if (!itemId) return;
    const key = `${kind}-${itemId}`;
    try {
      setImageRemovingKey(key);
      const updated =
        kind === 'testimonial'
          ? await appSettingsService.removeHomeTestimonialsAvatar(itemId)
          : await appSettingsService.removeHomeTestimonialsIndustryLogo(itemId);
      applyFromSettings(updated);
      patchImageRemovedLocally(kind, itemId);
      if (drawerOpen && drawerKind === kind && editingId === itemId) {
        setDraft((prev) => ({
          ...prev,
          ...(kind === 'testimonial' ? { avatarUrl: '' } : { logoUrl: '' }),
        }));
        setImageFile(null);
      }
      toast.success(kind === 'testimonial' ? 'Avatar deleted' : 'Logo deleted');
    } catch (error) {
      toast.error(error?.message || 'Failed to delete image');
    } finally {
      setImageRemovingKey(null);
    }
  };

  const clearImageInDraftOnly = (kind) => {
    setImageFile(null);
    setDraft((prev) => ({
      ...prev,
      ...(kind === 'testimonial' ? { avatarUrl: '' } : { logoUrl: '' }),
    }));
    if (!uploadItemId) {
      toast.success('Image removed');
      return;
    }
    setContent((prev) => {
      if (kind === 'testimonial') {
        const rows = [...(prev.testimonials || [])];
        const index = rows.findIndex((row) => row.id === uploadItemId);
        if (index < 0) return prev;
        rows[index] = { ...rows[index], avatarUrl: '' };
        return { ...prev, testimonials: rows };
      }
      const rows = [...(prev.industryQuotes || [])];
      const index = rows.findIndex((row) => row.id === uploadItemId);
      if (index < 0) return prev;
      rows[index] = { ...rows[index], logoUrl: '' };
      return { ...prev, industryQuotes: rows };
    });
    toast.success('Image removed');
  };

  const handleUploadImage = async () => {
    if (!uploadItemId || !imageFile) {
      toast.error('Save the item first, then upload an image');
      return;
    }
    try {
      setImageUploading(true);
      const updated =
        drawerKind === 'testimonial'
          ? await appSettingsService.uploadHomeTestimonialsAvatar(uploadItemId, imageFile)
          : await appSettingsService.uploadHomeTestimonialsIndustryLogo(uploadItemId, imageFile);
      applyFromSettings(updated);
      setImageFile(null);
      const normalized = normalizeTestimonialsContent(updated?.homeTestimonialsContent);
      const row =
        drawerKind === 'testimonial'
          ? findTestimonialRow(normalized.testimonials, uploadItemId)
          : findIndustryRow(normalized.industryQuotes, uploadItemId);
      if (row) {
        setDraft((prev) => ({
          ...prev,
          ...(drawerKind === 'testimonial'
            ? { avatarUrl: row.avatarUrl || '' }
            : { logoUrl: row.logoUrl || '' }),
        }));
      }
      toast.success('Image saved');
    } catch (error) {
      toast.error(error?.message || 'Failed to upload image');
    } finally {
      setImageUploading(false);
    }
  };

  const handleDeleteImage = async () => {
    const kind = drawerKind;
    const stored = kind === 'testimonial' ? draft.avatarUrl : draft.logoUrl;

    if (imageFile) {
      setImageFile(null);
      return;
    }

    if (!String(stored || '').trim()) return;

    if (!uploadItemId) {
      clearImageInDraftOnly(kind);
      return;
    }

    await removeImageById(kind, uploadItemId);
  };

  const handleDrawerApply = async () => {
    let nextContent;
    let targetId = editingId;

    if (drawerKind === 'testimonial') {
      const name = String(draft.name || '').trim();
      if (!name) {
        toast.error('Name is required');
        return;
      }
      const entry = {
        id: drawerMode === 'add' ? createTestimonialsItemId() : String(editingId || ''),
        quote: String(draft.quote || ''),
        name,
        role: String(draft.role || ''),
        avatarUrl: String(draft.avatarUrl || ''),
        rating: Math.min(5, Math.max(1, Number(draft.rating) || 5)),
      };
      if (!entry.id) {
        toast.error('Missing testimonial id — refresh and try again');
        return;
      }
      const rows = [...(content.testimonials || [])];
      if (drawerMode === 'add') {
        targetId = entry.id;
        nextContent = { ...content, testimonials: [...rows, entry] };
      } else if (editingId) {
        targetId = editingId;
        const index = rows.findIndex((row) => row.id === editingId);
        if (index < 0) return;
        rows[index] = entry;
        nextContent = { ...content, testimonials: rows };
      } else {
        return;
      }
    } else {
      const organisation = String(draft.organisation || '').trim();
      if (!organisation) {
        toast.error('Organisation name is required');
        return;
      }
      const entry = {
        id: drawerMode === 'add' ? createTestimonialsItemId() : String(editingId || ''),
        quote: String(draft.quote || ''),
        organisation,
        logoUrl: String(draft.logoUrl || ''),
      };
      if (!entry.id) {
        toast.error('Missing industry quote id — refresh and try again');
        return;
      }
      const rows = [...(content.industryQuotes || [])];
      if (drawerMode === 'add') {
        targetId = entry.id;
        nextContent = { ...content, industryQuotes: [...rows, entry] };
      } else if (editingId) {
        targetId = editingId;
        const index = rows.findIndex((row) => row.id === editingId);
        if (index < 0) return;
        rows[index] = entry;
        nextContent = { ...content, industryQuotes: rows };
      } else {
        return;
      }
    }

    try {
      await persistContent(nextContent);
      if (imageFile && targetId) {
        try {
          setImageUploading(true);
          const updated =
            drawerKind === 'testimonial'
              ? await appSettingsService.uploadHomeTestimonialsAvatar(targetId, imageFile)
              : await appSettingsService.uploadHomeTestimonialsIndustryLogo(targetId, imageFile);
          applyFromSettings(updated);
          setImageFile(null);
        } catch (error) {
          toast.error(
            error?.message ||
              (drawerKind === 'testimonial'
                ? 'Saved but avatar upload failed'
                : 'Saved but logo upload failed')
          );
        } finally {
          setImageUploading(false);
        }
      }
      toast.success(
        drawerMode === 'add'
          ? drawerKind === 'testimonial'
            ? 'Testimonial added'
            : 'Industry quote added'
          : drawerKind === 'testimonial'
            ? 'Testimonial updated'
            : 'Industry quote updated'
      );
      closeDrawer();
    } catch {
      // Parent shows error toast
    }
  };

  const handleDrawerDelete = async () => {
    if (drawerMode !== 'edit' || !editingId) return;

    let nextContent;
    if (drawerKind === 'testimonial') {
      nextContent = {
        ...content,
        testimonials: (content.testimonials || []).filter((row) => row.id !== editingId),
      };
    } else {
      nextContent = {
        ...content,
        industryQuotes: (content.industryQuotes || []).filter((row) => row.id !== editingId),
      };
    }

    try {
      await persistContent(nextContent);
      toast.success(drawerKind === 'testimonial' ? 'Testimonial removed' : 'Industry quote removed');
      closeDrawer();
    } catch {
      // Parent shows error toast
    }
  };

  const drawerTitle =
    drawerKind === 'testimonial'
      ? drawerMode === 'add'
        ? 'Add testimonial'
        : 'Edit testimonial'
      : drawerMode === 'add'
        ? 'Add industry quote'
        : 'Edit industry quote';

  return (
    <>
      <Card sx={{ p: 3, overflow: 'hidden' }}>
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="h6" sx={{ mb: 1, ...HERO_TYPOGRAPHY.adminCardTitle }}>
              Testimonials & industry quotes
            </Typography>
            <Typography variant="body2" sx={HERO_TYPOGRAPHY.adminCardDescription}>
              Manage learner testimonials and industry quotes. Use Add — the editor opens in a right
              sidebar with rich text and image upload.
            </Typography>
          </Box>

          <TextField
            label="Section heading"
            value={content?.heading || ''}
            onChange={(e) => setContent((prev) => ({ ...prev, heading: e.target.value }))}
            fullWidth
          />

          <Stack spacing={0.75}>
            <Typography variant="subtitle2">Section subtitle</Typography>
            <Editor
              value={content?.subtitle || ''}
              onChange={(value) => setContent((prev) => ({ ...prev, subtitle: value }))}
              placeholder="Optional intro under the heading..."
              editable
              slotProps={{
                wrap: {
                  sx: {
                    minHeight: 120,
                    borderRadius: 1.5,
                    border: (theme) => `1px solid ${theme.palette.divider}`,
                  },
                },
              }}
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
                Testimonials
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {testimonials.length} / {TESTIMONIALS_MAX}
              </Typography>
            </Stack>
            <Button
              variant="outlined"
              onClick={() => openAddDrawer('testimonial')}
              disabled={testimonials.length >= TESTIMONIALS_MAX || submitting}
            >
              Add testimonial
            </Button>
          </Stack>

          <Box sx={{ borderTop: (theme) => `1px solid ${theme.palette.divider}` }}>
            {testimonials.length === 0 ? (
              <Typography variant="body2" sx={{ py: 3, color: 'text.secondary', textAlign: 'center' }}>
                No testimonials yet.
              </Typography>
            ) : (
              testimonials.map((row, index) => {
                const rowId = String(row?.id || '').trim();
                const label = String(row?.name || '').trim() || `Testimonial ${index + 1}`;
                const isLast = index === testimonials.length - 1;
                const avatarSrc = resolvePreviewUrl(row?.avatarUrl);
                return (
                  <Box key={rowId || `admin-testimonial-list-${index}`}>
                    <ItemListRow
                      icon={
                        avatarSrc ? (
                          <Box
                            component="img"
                            src={avatarSrc}
                            alt=""
                            sx={{
                              width: 36,
                              height: 36,
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: (theme) => `1px solid ${theme.palette.divider}`,
                            }}
                          />
                        ) : (
                          <Box
                            sx={{
                              width: 36,
                              height: 36,
                              borderRadius: '50%',
                              bgcolor: 'background.neutral',
                              border: (theme) => `1px solid ${theme.palette.divider}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Iconify icon="solar:user-bold" width={18} sx={{ color: 'text.disabled' }} />
                          </Box>
                        )
                      }
                      label={label}
                      previewHtml={row?.quote}
                      previewFallback={row?.role}
                      isExpanded={expandedTestimonialId === rowId}
                      onToggleExpand={() =>
                        setExpandedTestimonialId((prev) => (prev === rowId ? null : rowId))
                      }
                      onEdit={() => openEditDrawer('testimonial', rowId)}
                      disabled={submitting || !rowId}
                    />
                    {!isLast ? <Divider /> : null}
                  </Box>
                );
              })
            )}
          </Box>

          <Divider />

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
            spacing={1}
          >
            <Stack spacing={0.25}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Industry quotes
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {industryQuotes.length} / {INDUSTRY_QUOTES_MAX}
              </Typography>
            </Stack>
            <Button
              variant="outlined"
              onClick={() => openAddDrawer('industry')}
              disabled={industryQuotes.length >= INDUSTRY_QUOTES_MAX || submitting}
            >
              Add industry quote
            </Button>
          </Stack>

          <Box sx={{ borderTop: (theme) => `1px solid ${theme.palette.divider}` }}>
            {industryQuotes.length === 0 ? (
              <Typography variant="body2" sx={{ py: 3, color: 'text.secondary', textAlign: 'center' }}>
                No industry quotes yet.
              </Typography>
            ) : (
              industryQuotes.map((row, index) => {
                const rowId = String(row?.id || '').trim();
                const label = String(row?.organisation || '').trim() || `Quote ${index + 1}`;
                const isLast = index === industryQuotes.length - 1;
                const logoSrc = resolvePreviewUrl(row?.logoUrl);
                return (
                  <Box key={rowId || `admin-industry-list-${index}`}>
                    <ItemListRow
                      icon={
                        logoSrc ? (
                          <Box
                            component="img"
                            src={logoSrc}
                            alt=""
                            sx={{
                              width: 36,
                              height: 36,
                              borderRadius: 1,
                              objectFit: 'contain',
                              bgcolor: 'background.paper',
                              border: (theme) => `1px solid ${theme.palette.divider}`,
                              p: 0.25,
                            }}
                          />
                        ) : (
                          <Box
                            sx={{
                              width: 36,
                              height: 36,
                              borderRadius: 1,
                              bgcolor: 'background.paper',
                              border: (theme) => `1px solid ${theme.palette.divider}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Iconify
                              icon="solar:buildings-2-bold-duotone"
                              width={18}
                              sx={{ color: 'text.disabled' }}
                            />
                          </Box>
                        )
                      }
                      label={label}
                      previewHtml={row?.quote}
                      isExpanded={expandedIndustryId === rowId}
                      onToggleExpand={() =>
                        setExpandedIndustryId((prev) => (prev === rowId ? null : rowId))
                      }
                      onEdit={() => openEditDrawer('industry', rowId)}
                      disabled={submitting || !rowId}
                    />
                    {!isLast ? <Divider /> : null}
                  </Box>
                );
              })
            )}
          </Box>

          <LoadingButton
            variant="contained"
            loading={submitting}
            onClick={() => onSave()}
            sx={{ alignSelf: 'flex-start', width: 'auto' }}
          >
            Save testimonials section
          </LoadingButton>
        </Stack>
      </Card>

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={closeDrawer}
        PaperProps={{ sx: { width: { xs: '100%', sm: 520 }, p: 0 } }}
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
              {drawerTitle}
            </Typography>
            <IconButton onClick={closeDrawer} aria-label="Close editor">
              <Iconify icon="mingcute:close-line" />
            </IconButton>
          </Stack>

          <Stack spacing={2.5} sx={{ flex: 1, overflow: 'auto', p: 2.5 }}>
            <Stack spacing={0.75}>
              <Typography variant="subtitle2">Quote</Typography>
              <Editor
                value={draft.quote || ''}
                onChange={(value) => setDraft((prev) => ({ ...prev, quote: value }))}
                placeholder="Write the quote..."
                editable
                slotProps={{
                  wrap: {
                    sx: {
                      minHeight: 180,
                      borderRadius: 1.5,
                      border: (theme) => `1px solid ${theme.palette.divider}`,
                      bgcolor: 'background.paper',
                    },
                  },
                }}
              />
            </Stack>

            {drawerKind === 'testimonial' ? (
              <>
                <TextField
                  label="Name"
                  value={draft.name || ''}
                  onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
                  fullWidth
                />
                <TextField
                  label="Badge line (e.g. Verified customer)"
                  value={draft.role || ''}
                  onChange={(e) => setDraft((prev) => ({ ...prev, role: e.target.value }))}
                  fullWidth
                />
                <TextField
                  label="Star rating (1–5)"
                  type="number"
                  inputProps={{ min: 1, max: 5, step: 0.5 }}
                  value={draft.rating ?? 5}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, rating: Number(e.target.value) || 5 }))
                  }
                  fullWidth
                />
                <DrawerImageUpload
                  label="Avatar"
                  file={imageFile}
                  storedUrl={draft.avatarUrl}
                  uploading={imageUploading}
                  onDrop={(files) => {
                    const [file] = files || [];
                    if (file) setImageFile(file);
                  }}
                  onUpload={handleUploadImage}
                  onDeleteImage={handleDeleteImage}
                />
                {drawerMode === 'add' ? (
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    You can upload the avatar after clicking Add, or select a file now and it will
                    upload when you save the item.
                  </Typography>
                ) : null}
              </>
            ) : (
              <>
                <TextField
                  label="Organisation"
                  value={draft.organisation || ''}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, organisation: e.target.value }))
                  }
                  fullWidth
                />
                <DrawerImageUpload
                  label="Organisation logo"
                  file={imageFile}
                  storedUrl={draft.logoUrl}
                  uploading={imageUploading}
                  onDrop={(files) => {
                    const [file] = files || [];
                    if (file) setImageFile(file);
                  }}
                  onUpload={handleUploadImage}
                  onDeleteImage={handleDeleteImage}
                />
                {drawerMode === 'add' ? (
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Logo uploads when you click Add if a file is selected, or use Save image after
                    the item exists.
                  </Typography>
                ) : null}
              </>
            )}
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
                disabled={submitting || imageUploading}
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
                disabled={submitting || imageUploading}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleDrawerApply}
                disabled={
                  submitting ||
                  imageUploading ||
                  (drawerKind === 'testimonial'
                    ? !String(draft.name || '').trim()
                    : !String(draft.organisation || '').trim())
                }
              >
                {drawerMode === 'add' ? 'Add' : 'Save'}
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </Drawer>
    </>
  );
}

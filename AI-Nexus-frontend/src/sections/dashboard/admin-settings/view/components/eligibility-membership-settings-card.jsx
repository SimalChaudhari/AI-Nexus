import { useCallback, useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { categoryIcons } from 'src/_mock/_category-icons';
import { CONFIG } from 'src/config-global';
import {
  ELIGIBILITY_MEMBERSHIP_BENEFITS_MAX,
  ELIGIBILITY_MEMBERSHIP_CTA_ELIGIBILITY,
  ELIGIBILITY_MEMBERSHIP_QUESTIONS_MAX,
  createEligibilityMembershipItemId,
  normalizeEligibilityMembershipContent,
} from 'src/sections/home/eligibility-membership-defaults';
import { HeroImageCard } from './hero-image-card';
import { IconPickerDrawer } from './icon-picker-drawer';

const emptyQuestion = () => ({
  id: '',
  icon: 'solar:user-bold-duotone',
  iconColor: 'blue',
  text: '',
});

const emptyBenefit = () => ({
  id: '',
  icon: 'solar:star-bold-duotone',
  label: '',
});

function resolvePreviewUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  const base = CONFIG.site.serverUrl.replace(/\/api\/?$/, '');
  return `${base}${raw.startsWith('/') ? raw : `/${raw}`}`;
}

function ListRow({ title, subtitle, icon, onEdit, onDelete }) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1}
      sx={{
        p: 1.25,
        borderRadius: 1.5,
        border: (t) => `1px solid ${t.palette.divider}`,
      }}
    >
      {icon ? <Iconify icon={icon} width={22} /> : null}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle2" noWrap>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="caption" color="text.secondary" noWrap>
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      <IconButton size="small" onClick={onEdit} aria-label="Edit">
        <Iconify icon="solar:pen-bold" width={18} />
      </IconButton>
      <IconButton size="small" color="error" onClick={onDelete} aria-label="Delete">
        <Iconify icon="solar:trash-bin-trash-bold" width={18} />
      </IconButton>
    </Stack>
  );
}

export function EligibilityMembershipSettingsCard({
  content,
  setContent,
  submitting,
  onSave,
  heroFile,
  heroUrl,
  heroSubmitting,
  onHeroDrop,
  onHeroDelete,
  onHeroSave,
  onHeroClearOrRemove,
}) {
  const normalized = useMemo(() => normalizeEligibilityMembershipContent(content), [content]);
  const left = normalized.leftPanel || {};
  const right = normalized.rightPanel || {};
  const questions = Array.isArray(left.questions) ? left.questions : [];
  const benefits = Array.isArray(right.benefits) ? right.benefits : [];
  const displayHeroUrl = resolvePreviewUrl(heroUrl || left.heroImageUrl);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerKind, setDrawerKind] = useState('question');
  const [drawerMode, setDrawerMode] = useState('add');
  const [editingId, setEditingId] = useState(null);
  const [draftQuestion, setDraftQuestion] = useState(emptyQuestion);
  const [draftBenefit, setDraftBenefit] = useState(emptyBenefit);
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

  const patchLeft = (patch) => {
    setContent((prev) => {
      const base = normalizeEligibilityMembershipContent(prev);
      return { ...base, leftPanel: { ...base.leftPanel, ...patch } };
    });
  };

  const patchRight = (patch) => {
    setContent((prev) => {
      const base = normalizeEligibilityMembershipContent(prev);
      return { ...base, rightPanel: { ...base.rightPanel, ...patch } };
    });
  };

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setEditingId(null);
    setDraftQuestion(emptyQuestion());
    setDraftBenefit(emptyBenefit());
  }, []);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeDrawer();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen, closeDrawer]);

  const openQuestionDrawer = (mode, row) => {
    setDrawerKind('question');
    setDrawerMode(mode);
    if (mode === 'edit' && row) {
      setEditingId(row.id);
      setDraftQuestion({
        id: row.id,
        icon: row.icon || emptyQuestion().icon,
        iconColor: row.iconColor || 'blue',
        text: row.text || '',
      });
    } else {
      setEditingId(null);
      setDraftQuestion(emptyQuestion());
    }
    setDrawerOpen(true);
  };

  const openBenefitDrawer = (mode, row) => {
    setDrawerKind('benefit');
    setDrawerMode(mode);
    if (mode === 'edit' && row) {
      setEditingId(row.id);
      setDraftBenefit({
        id: row.id,
        icon: row.icon || emptyBenefit().icon,
        label: row.label || '',
      });
    } else {
      setEditingId(null);
      setDraftBenefit(emptyBenefit());
    }
    setDrawerOpen(true);
  };

  const applyQuestion = () => {
    const text = String(draftQuestion.text || '').trim();
    if (!text) {
      toast.error('Question text is required');
      return;
    }
    const entry = {
      id: drawerMode === 'add' ? createEligibilityMembershipItemId() : String(editingId || ''),
      icon: String(draftQuestion.icon || '').trim() || emptyQuestion().icon,
      iconColor: draftQuestion.iconColor === 'red' ? 'red' : 'blue',
      text,
    };
    const rows = [...questions];
    if (drawerMode === 'add') {
      if (rows.length >= ELIGIBILITY_MEMBERSHIP_QUESTIONS_MAX) return;
      patchLeft({ questions: [...rows, entry] });
    } else {
      patchLeft({
        questions: rows.map((r) => (r.id === entry.id ? entry : r)),
      });
    }
    closeDrawer();
  };

  const applyBenefit = () => {
    const label = String(draftBenefit.label || '').trim();
    if (!label) {
      toast.error('Benefit label is required');
      return;
    }
    const entry = {
      id: drawerMode === 'add' ? createEligibilityMembershipItemId() : String(editingId || ''),
      icon: String(draftBenefit.icon || '').trim() || emptyBenefit().icon,
      label,
    };
    const rows = [...benefits];
    if (drawerMode === 'add') {
      if (rows.length >= ELIGIBILITY_MEMBERSHIP_BENEFITS_MAX) return;
      patchRight({ benefits: [...rows, entry] });
    } else {
      patchRight({
        benefits: rows.map((r) => (r.id === entry.id ? entry : r)),
      });
    }
    closeDrawer();
  };

  const deleteQuestion = (id) => {
    patchLeft({ questions: questions.filter((r) => r.id !== id) });
  };

  const deleteBenefit = (id) => {
    patchRight({ benefits: benefits.filter((r) => r.id !== id) });
  };

  const handleSaveAll = async () => {
    const payload = normalizeEligibilityMembershipContent(content);
    const updated = await onSave(payload);
    if (updated) {
      setContent(normalizeEligibilityMembershipContent(updated?.homeEligibilityMembershipContent));
    }
  };

  const activeIcon =
    drawerKind === 'question'
      ? String(draftQuestion.icon || '')
      : String(draftBenefit.icon || '');

  const setActiveIcon = (icon) => {
    if (drawerKind === 'question') {
      setDraftQuestion((prev) => ({ ...prev, icon }));
    } else {
      setDraftBenefit((prev) => ({ ...prev, icon }));
    }
  };

  return (
    <>
      <Stack spacing={3}>
        <HeroImageCard
          title="Left panel photo"
          description="Professional image shown on the dark “Am I Eligible?” panel (e.g. person with laptop)."
          saveLabel="Save panel photo"
          heroFile={heroFile}
          heroUrl={displayHeroUrl}
          heroSubmitting={heroSubmitting}
          onDrop={onHeroDrop}
          onDelete={onHeroDelete}
          onSave={onHeroSave}
          onClearOrRemove={onHeroClearOrRemove}
        />

        <Card sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Left panel — Am I Eligible?
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Heading"
                value={left.heading || ''}
                onChange={(e) => patchLeft({ heading: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Subtitle"
                value={left.subtitle || ''}
                onChange={(e) => patchLeft({ subtitle: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="CTA label"
                value={left.ctaLabel || ''}
                onChange={(e) => patchLeft({ ctaLabel: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="CTA link"
                helperText={`Use ${ELIGIBILITY_MEMBERSHIP_CTA_ELIGIBILITY} to open the eligibility check modal`}
                value={left.ctaHref || ''}
                onChange={(e) => patchLeft({ ctaHref: e.target.value })}
              />
            </Grid>
          </Grid>

          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 3, mb: 1.5 }}>
            <Typography variant="subtitle1">Eligibility questions (2×2 grid)</Typography>
            <Button
              size="small"
              variant="outlined"
              startIcon={<Iconify icon="mingcute:add-line" />}
              disabled={questions.length >= ELIGIBILITY_MEMBERSHIP_QUESTIONS_MAX}
              onClick={() => openQuestionDrawer('add')}
            >
              Add question
            </Button>
          </Stack>
          <Stack spacing={1}>
            {questions.map((row) => (
              <ListRow
                key={row.id}
                title={row.text}
                subtitle={`Icon: ${row.icon} · ${row.iconColor}`}
                icon={row.icon}
                onEdit={() => openQuestionDrawer('edit', row)}
                onDelete={() => deleteQuestion(row.id)}
              />
            ))}
          </Stack>
        </Card>

        <Card sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Right panel — ISCA Membership
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Eyebrow"
                value={right.eyebrow || ''}
                onChange={(e) => patchRight({ eyebrow: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Heading"
                value={right.heading || ''}
                onChange={(e) => patchRight({ heading: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Primary CTA label"
                value={right.primaryCtaLabel || ''}
                onChange={(e) => patchRight({ primaryCtaLabel: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Primary CTA link"
                value={right.primaryCtaHref || ''}
                onChange={(e) => patchRight({ primaryCtaHref: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Secondary CTA label"
                value={right.secondaryCtaLabel || ''}
                onChange={(e) => patchRight({ secondaryCtaLabel: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Secondary CTA link"
                value={right.secondaryCtaHref || ''}
                onChange={(e) => patchRight({ secondaryCtaHref: e.target.value })}
              />
            </Grid>
          </Grid>

          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 3, mb: 1.5 }}>
            <Typography variant="subtitle1">Membership benefits row</Typography>
            <Button
              size="small"
              variant="outlined"
              startIcon={<Iconify icon="mingcute:add-line" />}
              disabled={benefits.length >= ELIGIBILITY_MEMBERSHIP_BENEFITS_MAX}
              onClick={() => openBenefitDrawer('add')}
            >
              Add benefit
            </Button>
          </Stack>
          <Stack spacing={1}>
            {benefits.map((row) => (
              <ListRow
                key={row.id}
                title={row.label}
                subtitle={row.icon}
                icon={row.icon}
                onEdit={() => openBenefitDrawer('edit', row)}
                onDelete={() => deleteBenefit(row.id)}
              />
            ))}
          </Stack>
        </Card>

        <LoadingButton variant="contained" loading={submitting} onClick={handleSaveAll}>
          Save eligibility & membership section
        </LoadingButton>
      </Stack>

      <Drawer anchor="right" open={drawerOpen} onClose={closeDrawer} PaperProps={{ sx: { width: { xs: 1, sm: 420 } } }}>
        <Stack spacing={2} sx={{ p: 2.5, height: 1 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">
              {drawerKind === 'question'
                ? drawerMode === 'add'
                  ? 'Add question'
                  : 'Edit question'
                : drawerMode === 'add'
                  ? 'Add benefit'
                  : 'Edit benefit'}
            </Typography>
            <IconButton onClick={closeDrawer}>
              <Iconify icon="mingcute:close-line" />
            </IconButton>
          </Stack>
          <Divider />

          {drawerKind === 'question' ? (
            <>
              <TextField
                fullWidth
                multiline
                minRows={2}
                label="Question text"
                value={draftQuestion.text}
                onChange={(e) => setDraftQuestion((p) => ({ ...p, text: e.target.value }))}
              />
              <TextField
                select
                fullWidth
                label="Icon color"
                value={draftQuestion.iconColor}
                onChange={(e) => setDraftQuestion((p) => ({ ...p, iconColor: e.target.value }))}
              >
                <MenuItem value="blue">Blue</MenuItem>
                <MenuItem value="red">Red</MenuItem>
              </TextField>
              <Button variant="outlined" onClick={() => setIconToolOpen(true)} startIcon={<Iconify icon={draftQuestion.icon} />}>
                Pick icon
              </Button>
            </>
          ) : (
            <>
              <TextField
                fullWidth
                label="Benefit label"
                value={draftBenefit.label}
                onChange={(e) => setDraftBenefit((p) => ({ ...p, label: e.target.value }))}
              />
              <Button variant="outlined" onClick={() => setIconToolOpen(true)} startIcon={<Iconify icon={draftBenefit.icon} />}>
                Pick icon
              </Button>
            </>
          )}

          <Box sx={{ flex: 1 }} />
          <Stack direction="row" spacing={1}>
            <Button fullWidth variant="outlined" onClick={closeDrawer}>
              Cancel
            </Button>
            <Button
              fullWidth
              variant="contained"
              onClick={drawerKind === 'question' ? applyQuestion : applyBenefit}
            >
              Apply
            </Button>
          </Stack>
        </Stack>
      </Drawer>

      <IconPickerDrawer
        open={iconToolOpen}
        onClose={() => setIconToolOpen(false)}
        contextLabel={drawerKind === 'question' ? 'eligibility question' : 'membership benefit'}
        searchQuery={iconSearchQuery}
        onSearchQueryChange={(event) => setIconSearchQuery(event.target.value)}
        filteredIcons={filteredCategoryIcons}
        selectedIcon={activeIcon}
        onSelectIcon={(icon) => {
          setActiveIcon(icon);
          setIconToolOpen(false);
        }}
      />
    </>
  );
}

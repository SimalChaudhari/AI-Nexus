import { useCallback, useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import { alpha } from '@mui/material/styles';

import { Editor } from 'src/components/editor';
import { Iconify } from 'src/components/iconify';
import { categoryIcons } from 'src/_mock/_category-icons';
import { HERO_TYPOGRAPHY } from 'src/theme/hero-typography';
import {
  PARTNER_BENEFITS_MAX,
  PARTNER_DASHBOARD_FEATURES_MAX,
  PARTNER_FAQS_MAX,
  PARTNER_STATS_MAX,
  PARTNER_STEPS_MAX,
} from 'src/sections/partner-with-isca/partner-with-isca-defaults';
import { HeroImageCard } from './hero-image-card';
import { IconPickerDrawer } from './icon-picker-drawer';

const SECTION_TABS = [
  { key: 'hero', title: 'Hero', icon: 'solar:gallery-bold-duotone' },
  { key: 'stats', title: 'Stats', icon: 'solar:chart-2-bold-duotone' },
  { key: 'benefits', title: 'Benefits', icon: 'solar:widget-bold-duotone' },
  { key: 'dashboard', title: 'Dashboard', icon: 'solar:monitor-bold-duotone' },
  { key: 'steps', title: 'How it works', icon: 'solar:map-arrow-right-bold-duotone' },
  { key: 'faq', title: 'FAQ', icon: 'solar:question-circle-bold-duotone' },
  { key: 'cta', title: 'CTA', icon: 'solar:speaker-bold' },
];

function FieldBox({ children, sx }) {
  return (
    <Box
      sx={(theme) => ({
        p: 1.5,
        borderRadius: 2,
        border: `1px solid ${theme.palette.divider}`,
        bgcolor: theme.palette.background.neutral,
        ...sx,
      })}
    >
      {children}
    </Box>
  );
}

function SectionCardHeader({ title, description }) {
  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 1, ...HERO_TYPOGRAPHY.adminCardTitle }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={HERO_TYPOGRAPHY.adminCardDescription}>
        {description}
      </Typography>
    </Box>
  );
}

function SaveBar({ submitting, onSave, label = 'Save page content' }) {
  return (
    <LoadingButton variant="contained" loading={submitting} onClick={onSave} sx={{ alignSelf: 'flex-start' }}>
      {label}
    </LoadingButton>
  );
}

function ListRow({ icon, title, subtitle, expanded, onToggleExpand, onEdit, onDelete, submitting }) {
  return (
    <Stack direction="row" spacing={1.25} alignItems="flex-start" sx={{ py: 1.75 }}>
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
          color: 'primary.main',
        }}
      >
        <Iconify icon={icon || 'solar:document-bold-duotone'} width={20} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            lineHeight: 1.5,
            ...(expanded
              ? { wordBreak: 'break-word' }
              : {
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }),
          }}
        >
          {title}
        </Typography>
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Typography variant="body2" sx={{ pt: 0.75, color: 'text.secondary', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
            {subtitle || 'No description yet.'}
          </Typography>
        </Collapse>
      </Box>
      <Stack direction="row" spacing={0} sx={{ flexShrink: 0 }}>
        <Tooltip title={expanded ? 'Hide preview' : 'View preview'}>
          <IconButton size="small" onClick={onToggleExpand} color={expanded ? 'primary' : 'default'}>
            <Iconify icon="solar:eye-bold" width={20} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Edit">
          <IconButton size="small" onClick={onEdit} disabled={submitting}>
            <Iconify icon="solar:pen-bold" width={20} />
          </IconButton>
        </Tooltip>
        {onDelete ? (
          <Tooltip title="Remove">
            <IconButton size="small" color="error" onClick={onDelete} disabled={submitting}>
              <Iconify icon="solar:trash-bin-trash-bold" width={20} />
            </IconButton>
          </Tooltip>
        ) : null}
      </Stack>
    </Stack>
  );
}

export function PartnerWithIscaSettingsCard({
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
  mockupImageFile,
  mockupImageUrl,
  mockupImageSubmitting,
  onMockupImageDrop,
  onMockupImageDelete,
  onMockupImageSave,
  onMockupImageClearOrRemove,
}) {
  const [activeTab, setActiveTab] = useState('hero');
  const [expandedKey, setExpandedKey] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState('add');
  const [drawerType, setDrawerType] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [draft, setDraft] = useState({});
  const [iconToolOpen, setIconToolOpen] = useState(false);
  const [iconSearchQuery, setIconSearchQuery] = useState('');

  const availableIcons = useMemo(() => [...new Set(categoryIcons)], []);
  const filteredIcons = useMemo(
    () => availableIcons.filter((name) => name.toLowerCase().includes(iconSearchQuery.toLowerCase())),
    [availableIcons, iconSearchQuery]
  );

  const updateRoot = useCallback(
    (path, value) => {
      setContent((prev) => {
        const next = { ...prev };
        const keys = path.split('.');
        let cursor = next;
        keys.slice(0, -1).forEach((key) => {
          cursor[key] = { ...(cursor[key] || {}) };
          cursor = cursor[key];
        });
        cursor[keys[keys.length - 1]] = value;
        return next;
      });
    },
    [setContent]
  );

  const updateListItem = useCallback(
    (listPath, index, field, value) => {
      setContent((prev) => {
        const keys = listPath.split('.');
        const next = { ...prev };
        let cursor = next;
        keys.forEach((key, i) => {
          if (i === keys.length - 1) {
            const rows = [...(cursor[key] || [])];
            rows[index] = { ...(rows[index] || {}), [field]: value };
            cursor[key] = rows;
          } else {
            cursor[key] = { ...(cursor[key] || {}) };
            cursor = cursor[key];
          }
        });
        return next;
      });
    },
    [setContent]
  );

  const addListItem = useCallback(
    (listPath, emptyRow) => {
      setContent((prev) => {
        const keys = listPath.split('.');
        const next = { ...prev };
        let cursor = next;
        keys.forEach((key, i) => {
          if (i === keys.length - 1) {
            cursor[key] = [...(cursor[key] || []), emptyRow];
          } else {
            cursor[key] = { ...(cursor[key] || {}) };
            cursor = cursor[key];
          }
        });
        return next;
      });
    },
    [setContent]
  );

  const removeListItem = useCallback(
    (listPath, index) => {
      setContent((prev) => {
        const keys = listPath.split('.');
        const next = { ...prev };
        let cursor = next;
        keys.forEach((key, i) => {
          if (i === keys.length - 1) {
            cursor[key] = (cursor[key] || []).filter((_, rowIndex) => rowIndex !== index);
          } else {
            cursor[key] = { ...(cursor[key] || {}) };
            cursor = cursor[key];
          }
        });
        return next;
      });
    },
    [setContent]
  );

  const getListPath = (type) => {
    if (type === 'benefit') return 'benefits.items';
    if (type === 'feature') return 'dashboard.features';
    if (type === 'step') return 'howItWorks.steps';
    if (type === 'faq') return 'faq.items';
    return '';
  };

  const emptyDraft = (type) => {
    if (type === 'benefit') return { icon: 'solar:widget-bold-duotone', iconTone: 'navy', title: '', description: '' };
    if (type === 'feature') return { title: '', description: '' };
    if (type === 'step') return { icon: 'solar:buildings-2-bold-duotone', badge: '', title: '', description: '', done: false };
    if (type === 'faq') return { question: '', answer: '' };
    return {};
  };

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setDrawerType(null);
    setEditingIndex(null);
    setDraft({});
  }, []);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeDrawer();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen, closeDrawer]);

  const openAddDrawer = (type) => {
    setDrawerMode('add');
    setDrawerType(type);
    setEditingIndex(null);
    setDraft(emptyDraft(type));
    setDrawerOpen(true);
  };

  const openEditDrawer = (type, index) => {
    const listPath = getListPath(type);
    const keys = listPath.split('.');
    let rows = content;
    keys.forEach((key) => {
      rows = rows?.[key];
    });
    const row = Array.isArray(rows) ? rows[index] : null;
    if (!row) return;
    setDrawerMode('edit');
    setDrawerType(type);
    setEditingIndex(index);
    setDraft({ ...row });
    setDrawerOpen(true);
  };

  const applyDrawer = () => {
    const listPath = getListPath(drawerType);
    if (!listPath) return;

    setContent((prev) => {
      const keys = listPath.split('.');
      const next = { ...prev };
      let cursor = next;
      keys.forEach((key, i) => {
        if (i === keys.length - 1) {
          const rows = [...(cursor[key] || [])];
          if (drawerMode === 'add') {
            rows.push({ ...draft });
          } else if (editingIndex != null) {
            rows[editingIndex] = { ...draft };
          }
          cursor[key] = rows;
        } else {
          cursor[key] = { ...(cursor[key] || {}) };
          cursor = cursor[key];
        }
      });
      return next;
    });
    closeDrawer();
  };

  const deleteFromDrawer = () => {
    if (drawerMode !== 'edit' || editingIndex == null) return;
    removeListItem(getListPath(drawerType), editingIndex);
    closeDrawer();
  };

  const hero = content?.hero || {};
  const stats = Array.isArray(content?.stats) ? content.stats : [];
  const benefits = content?.benefits || {};
  const benefitItems = Array.isArray(benefits.items) ? benefits.items : [];
  const dashboard = content?.dashboard || {};
  const features = Array.isArray(dashboard.features) ? dashboard.features : [];
  const howItWorks = content?.howItWorks || {};
  const steps = Array.isArray(howItWorks.steps) ? howItWorks.steps : [];
  const faq = content?.faq || {};
  const faqItems = Array.isArray(faq.items) ? faq.items : [];
  const cta = content?.cta || {};
  const heroActions = Array.isArray(hero.actions) ? hero.actions : [];

  const activeTabMeta = SECTION_TABS.find((tab) => tab.key === activeTab) || SECTION_TABS[0];

  const renderListSection = ({ type, items, getTitle, getSubtitle, getIcon, max, addLabel }) => (
    <>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={1}>
        <Stack spacing={0.25}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Items
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {items.length} / {max}
          </Typography>
        </Stack>
        <Button variant="outlined" disabled={items.length >= max || submitting} onClick={() => openAddDrawer(type)}>
          {addLabel}
        </Button>
      </Stack>
      <Box sx={{ borderTop: (theme) => `1px solid ${theme.palette.divider}` }}>
        {items.length === 0 ? (
          <Typography variant="body2" sx={{ py: 3, color: 'text.secondary', textAlign: 'center' }}>
            No items yet.
          </Typography>
        ) : (
          items.map((row, index) => {
            const rowKey = `${type}-${index}`;
            return (
              <Box key={rowKey}>
                <ListRow
                  icon={getIcon(row)}
                  title={getTitle(row, index)}
                  subtitle={getSubtitle(row)}
                  expanded={expandedKey === rowKey}
                  onToggleExpand={() => setExpandedKey((prev) => (prev === rowKey ? null : rowKey))}
                  onEdit={() => openEditDrawer(type, index)}
                  onDelete={type === 'feature' || type === 'faq' ? () => removeListItem(getListPath(type), index) : undefined}
                  submitting={submitting}
                />
                {index < items.length - 1 ? <Divider /> : null}
              </Box>
            );
          })
        )}
      </Box>
    </>
  );

  const renderHeroTab = (
    <Stack spacing={3}>
      <HeroImageCard
        title="Hero image"
        description="Upload the right-side hero image shown on the Partner with ISCA page."
        saveLabel="Save hero image"
        heroFile={heroFile}
        heroUrl={heroUrl}
        heroSubmitting={heroSubmitting}
        onDrop={onHeroDrop}
        onDelete={onHeroDelete}
        onSave={onHeroSave}
        onClearOrRemove={onHeroClearOrRemove}
      />
      <Card sx={{ p: 3 }}>
        <Stack spacing={2.5}>
          <SectionCardHeader
            title="Hero content"
            description="Eyebrow, headline, description, placeholder text, and action buttons."
          />
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField label="Eyebrow" value={hero.eyebrow || ''} onChange={(e) => updateRoot('hero.eyebrow', e.target.value)} fullWidth />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="Headline line 1" value={hero.headline || ''} onChange={(e) => updateRoot('hero.headline', e.target.value)} fullWidth />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Headline line 2 (accent)" value={hero.headlineAccent || ''} onChange={(e) => updateRoot('hero.headlineAccent', e.target.value)} fullWidth />
            </Grid>
          </Grid>
          <FieldBox>
            <Stack spacing={0.75}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Description
              </Typography>
              <Editor
                value={hero.description || ''}
                onChange={(value) => updateRoot('hero.description', value)}
                placeholder="Hero description..."
                editable
                slotProps={{
                  wrap: {
                    sx: {
                      minHeight: 140,
                      borderRadius: 1.5,
                      border: (theme) => `1px solid ${theme.palette.divider}`,
                      bgcolor: 'background.paper',
                    },
                  },
                }}
              />
            </Stack>
          </FieldBox>
          <TextField label="Image placeholder text" value={hero.placeholderText || ''} onChange={(e) => updateRoot('hero.placeholderText', e.target.value)} fullWidth multiline minRows={2} helperText="Shown when no hero image is uploaded. Use line breaks for multiple lines." />
          <Divider />
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Action buttons
          </Typography>
          <Grid container spacing={1.5}>
            {heroActions.map((action, index) => (
              <Grid key={`hero-action-${index}`} item xs={12} md={6}>
                <FieldBox>
                  <Stack spacing={1.5}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                      Button {index + 1}
                    </Typography>
                    <TextField select size="small" label="Style" value={action.variant || 'outline'} onChange={(e) => updateListItem('hero.actions', index, 'variant', e.target.value)} fullWidth>
                      <MenuItem value="red">Primary</MenuItem>
                      <MenuItem value="outline">Outline</MenuItem>
                    </TextField>
                    <TextField size="small" label="Label" value={action.label || ''} onChange={(e) => updateListItem('hero.actions', index, 'label', e.target.value)} fullWidth />
                    <TextField size="small" label="Scroll to section ID" value={action.scrollTo || ''} onChange={(e) => updateListItem('hero.actions', index, 'scrollTo', e.target.value)} fullWidth placeholder="register" />
                    <TextField size="small" label="Link URL (optional)" value={action.href || ''} onChange={(e) => updateListItem('hero.actions', index, 'href', e.target.value)} fullWidth placeholder="/" helperText="Used instead of scroll when set" />
                  </Stack>
                </FieldBox>
              </Grid>
            ))}
          </Grid>
          <SaveBar submitting={submitting} onSave={onSave} />
        </Stack>
      </Card>
    </Stack>
  );

  const renderStatsTab = (
    <Card sx={{ p: 3 }}>
      <Stack spacing={2.5}>
        <SectionCardHeader title="Stats bar" description="Up to four stats shown in the dark navy band below the hero." />
        <Stack direction="row" justifyContent="flex-end">
          <Button
            size="small"
            variant="outlined"
            startIcon={<Iconify icon="mingcute:add-line" width={16} />}
            disabled={stats.length >= PARTNER_STATS_MAX || submitting}
            onClick={() => addListItem('stats', { icon: 'solar:star-bold-duotone', title: '', label: '' })}
          >
            Add stat
          </Button>
        </Stack>
        <Grid container spacing={1.5}>
          {stats.map((stat, index) => (
            <Grid key={`stat-${index}`} item xs={12} md={6}>
              <FieldBox>
                <Stack spacing={1.5}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                      Stat {index + 1}
                    </Typography>
                    <Tooltip title="Remove stat">
                      <IconButton
                        size="small"
                        color="error"
                        disabled={submitting}
                        onClick={() => removeListItem('stats', index)}
                      >
                        <Iconify icon="solar:trash-bin-trash-bold" width={16} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 40, height: 40, borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.paper', border: (t) => `1px solid ${t.palette.divider}` }}>
                      <Iconify icon={stat.icon || 'solar:star-bold-duotone'} width={22} />
                    </Box>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        setDraft({ listPath: 'stats', index, field: 'icon' });
                        setIconSearchQuery('');
                        setIconToolOpen(true);
                      }}
                    >
                      Change icon
                    </Button>
                  </Stack>
                  <TextField size="small" label="Title" value={stat.title || ''} onChange={(e) => updateListItem('stats', index, 'title', e.target.value)} fullWidth />
                  <TextField size="small" label="Subtitle" value={stat.label || ''} onChange={(e) => updateListItem('stats', index, 'label', e.target.value)} fullWidth />
                </Stack>
              </FieldBox>
            </Grid>
          ))}
        </Grid>
        <SaveBar submitting={submitting} onSave={onSave} />
      </Stack>
    </Card>
  );

  const renderBenefitsTab = (
    <Card sx={{ p: 3 }}>
      <Stack spacing={2.5}>
        <SectionCardHeader title="Benefits" description="Corporate benefits grid — up to 6 cards." />
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField label="Eyebrow" value={benefits.eyebrow || ''} onChange={(e) => updateRoot('benefits.eyebrow', e.target.value)} fullWidth />
          </Grid>
          <Grid item xs={12} md={8}>
            <TextField label="Section title" value={benefits.title || ''} onChange={(e) => updateRoot('benefits.title', e.target.value)} fullWidth />
          </Grid>
        </Grid>
        <Divider />
        {renderListSection({
          type: 'benefit',
          items: benefitItems,
          max: PARTNER_BENEFITS_MAX,
          addLabel: 'Add benefit',
          getIcon: (row) => row.icon,
          getTitle: (row, i) => row.title || `Benefit ${i + 1}`,
          getSubtitle: (row) => row.description,
        })}
        <SaveBar submitting={submitting} onSave={onSave} />
      </Stack>
    </Card>
  );

  const renderDashboardTab = (
    <Stack spacing={3}>
      <Card sx={{ p: 3 }}>
        <Stack spacing={2.5}>
          <SectionCardHeader title="Dashboard copy" description="Left column text and feature bullets beside the mockup." />
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}><TextField label="Eyebrow" value={dashboard.eyebrow || ''} onChange={(e) => updateRoot('dashboard.eyebrow', e.target.value)} fullWidth /></Grid>
            <Grid item xs={12} md={8}><TextField label="Title" value={dashboard.title || ''} onChange={(e) => updateRoot('dashboard.title', e.target.value)} fullWidth /></Grid>
          </Grid>
          <FieldBox>
            <Stack spacing={0.75}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Description</Typography>
              <Editor value={dashboard.description || ''} onChange={(v) => updateRoot('dashboard.description', v)} editable slotProps={{ wrap: { sx: { minHeight: 120, borderRadius: 1.5, border: (t) => `1px solid ${t.palette.divider}`, bgcolor: 'background.paper' } } }} />
            </Stack>
          </FieldBox>
          <Divider />
          {renderListSection({
            type: 'feature',
            items: features,
            max: PARTNER_DASHBOARD_FEATURES_MAX,
            addLabel: 'Add feature',
            getIcon: () => 'solar:check-circle-bold-duotone',
            getTitle: (row, i) => row.title || `Feature ${i + 1}`,
            getSubtitle: (row) => row.description,
          })}
          <SaveBar submitting={submitting} onSave={onSave} />
        </Stack>
      </Card>

      <HeroImageCard
        title="Dashboard mockup image"
        description="Upload the full corporate dashboard illustration shown on the right side of this section."
        saveLabel="Save mockup image"
        heroFile={mockupImageFile}
        heroUrl={mockupImageUrl}
        heroSubmitting={mockupImageSubmitting}
        onDrop={onMockupImageDrop}
        onDelete={onMockupImageDelete}
        onSave={onMockupImageSave}
        onClearOrRemove={onMockupImageClearOrRemove}
      />
    </Stack>
  );

  const renderStepsTab = (
    <Card sx={{ p: 3 }}>
      <Stack spacing={2.5}>
        <SectionCardHeader title="How it works" description="Three-step journey card on the page." />
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}><TextField label="Eyebrow" value={howItWorks.eyebrow || ''} onChange={(e) => updateRoot('howItWorks.eyebrow', e.target.value)} fullWidth /></Grid>
          <Grid item xs={12} md={8}><TextField label="Title" value={howItWorks.title || ''} onChange={(e) => updateRoot('howItWorks.title', e.target.value)} fullWidth /></Grid>
          <Grid item xs={12}><TextField label="Corner note" value={howItWorks.note || ''} onChange={(e) => updateRoot('howItWorks.note', e.target.value)} fullWidth /></Grid>
        </Grid>
        <Divider />
        {renderListSection({
          type: 'step',
          items: steps,
          max: PARTNER_STEPS_MAX,
          addLabel: 'Add step',
          getIcon: (row) => row.icon,
          getTitle: (row, i) => row.title || `Step ${i + 1}`,
          getSubtitle: (row) => `${row.badge ? `${row.badge} — ` : ''}${row.description || ''}`,
        })}
        <SaveBar submitting={submitting} onSave={onSave} />
      </Stack>
    </Card>
  );

  const renderFaqTab = (
    <Card sx={{ p: 3 }}>
      <Stack spacing={2.5}>
        <SectionCardHeader title="FAQ" description="Accordion questions for HR teams." />
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}><TextField label="Eyebrow" value={faq.eyebrow || ''} onChange={(e) => updateRoot('faq.eyebrow', e.target.value)} fullWidth /></Grid>
          <Grid item xs={12} md={8}><TextField label="Section title" value={faq.title || ''} onChange={(e) => updateRoot('faq.title', e.target.value)} fullWidth /></Grid>
        </Grid>
        <Divider />
        {renderListSection({
          type: 'faq',
          items: faqItems,
          max: PARTNER_FAQS_MAX,
          addLabel: 'Add FAQ',
          getIcon: () => 'solar:question-circle-bold-duotone',
          getTitle: (row, i) => row.question || `Question ${i + 1}`,
          getSubtitle: (row) => row.answer,
        })}
        <SaveBar submitting={submitting} onSave={onSave} />
      </Stack>
    </Card>
  );

  const renderCtaTab = (
    <Card sx={{ p: 3 }}>
      <Stack spacing={2.5}>
        <SectionCardHeader title="CTA band" description="Bottom full-width call-to-action before the footer." />
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}><TextField label="Eyebrow" value={cta.eyebrow || ''} onChange={(e) => updateRoot('cta.eyebrow', e.target.value)} fullWidth /></Grid>
          <Grid item xs={12} md={8}><TextField label="Title" value={cta.title || ''} onChange={(e) => updateRoot('cta.title', e.target.value)} fullWidth /></Grid>
        </Grid>
        <FieldBox>
          <Stack spacing={0.75}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Description</Typography>
            <Editor value={cta.description || ''} onChange={(v) => updateRoot('cta.description', v)} editable slotProps={{ wrap: { sx: { minHeight: 100, borderRadius: 1.5, border: (t) => `1px solid ${t.palette.divider}`, bgcolor: 'background.paper' } } }} />
          </Stack>
        </FieldBox>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}><TextField label="Button label" value={cta.buttonLabel || ''} onChange={(e) => updateRoot('cta.buttonLabel', e.target.value)} fullWidth /></Grid>
          <Grid item xs={12} md={6}><TextField label="Button link" value={cta.buttonHref || ''} onChange={(e) => updateRoot('cta.buttonHref', e.target.value)} fullWidth placeholder="/auth/corporate-sign-up" /></Grid>
        </Grid>
        <SaveBar submitting={submitting} onSave={onSave} />
      </Stack>
    </Card>
  );

  const tabContent = {
    hero: renderHeroTab,
    stats: renderStatsTab,
    benefits: renderBenefitsTab,
    dashboard: renderDashboardTab,
    steps: renderStepsTab,
    faq: renderFaqTab,
    cta: renderCtaTab,
  }[activeTab];

  return (
    <>
      <Stack spacing={3}>
        <Card
          sx={(theme) => ({
            p: { xs: 0.75, sm: 1 },
            overflow: 'hidden',
            border: `1px solid ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.28 : 0.14)}`,
            background: `linear-gradient(125deg, ${theme.palette.common.white} 0%, ${alpha(theme.palette.primary.lighter, theme.palette.mode === 'dark' ? 0.12 : 0.35)} 100%)`,
          })}
        >
          <Box sx={{ px: { xs: 0.5, sm: 1 }, pt: 0.5 }}>
            <Typography variant="subtitle2" sx={{ px: 1, pb: 0.75, fontWeight: 700, color: 'text.secondary' }}>
              Page sections
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)', lg: 'repeat(7, 1fr)' }, gap: 0.5 }}>
              {SECTION_TABS.map((tab) => {
                const selected = activeTab === tab.key;
                return (
                  <Button
                    key={tab.key}
                    color="inherit"
                    onClick={() => setActiveTab(tab.key)}
                    sx={(theme) => ({
                      minHeight: 44,
                      justifyContent: 'flex-start',
                      textTransform: 'none',
                      fontWeight: 600,
                      fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                      borderRadius: 1,
                      color: selected ? 'primary.main' : 'text.secondary',
                      bgcolor: selected ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.22 : 0.12) : 'transparent',
                      borderBottom: `3px solid ${selected ? theme.palette.primary.main : 'transparent'}`,
                    })}
                  >
                    <Stack direction="row" alignItems="center" spacing={0.75} sx={{ minWidth: 0 }}>
                      <Iconify icon={tab.icon} width={18} />
                      <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {tab.title}
                      </Box>
                    </Stack>
                  </Button>
                );
              })}
            </Box>
          </Box>
        </Card>

        <Box>
          <Typography variant="h5" sx={{ mb: 0.5, ...HERO_TYPOGRAPHY.adminCardTitle }}>
            {activeTabMeta.title}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Edit content for the {activeTabMeta.title.toLowerCase()} section, then save.
          </Typography>
          {tabContent}
        </Box>
      </Stack>

      <Drawer anchor="right" open={drawerOpen} onClose={closeDrawer} PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, p: 0 } }}>
        <Stack sx={{ height: '100%' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2.5, py: 2, borderBottom: (t) => `1px solid ${t.palette.divider}` }}>
            <Typography variant="h6" sx={HERO_TYPOGRAPHY.adminCardTitle}>
              {drawerMode === 'add' ? 'Add item' : 'Edit item'}
            </Typography>
            <IconButton onClick={closeDrawer}><Iconify icon="mingcute:close-line" /></IconButton>
          </Stack>
          <Stack spacing={2} sx={{ flex: 1, overflow: 'auto', p: 2.5 }}>
            {drawerType === 'benefit' && (
              <>
                <Stack direction="row" spacing={1}>
                  <TextField label="Icon" value={draft.icon || ''} onChange={(e) => setDraft((p) => ({ ...p, icon: e.target.value }))} fullWidth />
                  <Button variant="outlined" onClick={() => setIconToolOpen(true)}>Pick</Button>
                </Stack>
                <TextField select label="Icon tone" value={draft.iconTone || 'navy'} onChange={(e) => setDraft((p) => ({ ...p, iconTone: e.target.value }))} fullWidth>
                  <MenuItem value="navy">Navy</MenuItem>
                  <MenuItem value="red">Red</MenuItem>
                  <MenuItem value="blue">Blue</MenuItem>
                </TextField>
                <TextField label="Title" value={draft.title || ''} onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))} fullWidth />
                <TextField label="Description" value={draft.description || ''} onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))} fullWidth multiline minRows={3} />
              </>
            )}
            {drawerType === 'feature' && (
              <>
                <TextField label="Title" value={draft.title || ''} onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))} fullWidth />
                <TextField label="Description" value={draft.description || ''} onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))} fullWidth multiline minRows={3} />
              </>
            )}
            {drawerType === 'step' && (
              <>
                <Stack direction="row" spacing={1}>
                  <TextField label="Icon" value={draft.icon || ''} onChange={(e) => setDraft((p) => ({ ...p, icon: e.target.value }))} fullWidth />
                  <Button variant="outlined" onClick={() => setIconToolOpen(true)}>Pick</Button>
                </Stack>
                <TextField label="Badge" value={draft.badge || ''} onChange={(e) => setDraft((p) => ({ ...p, badge: e.target.value }))} fullWidth />
                <TextField label="Title" value={draft.title || ''} onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))} fullWidth />
                <TextField label="Description" value={draft.description || ''} onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))} fullWidth multiline minRows={3} />
                <FormControlLabel control={<Switch checked={Boolean(draft.done)} onChange={(e) => setDraft((p) => ({ ...p, done: e.target.checked }))} />} label="Completed step style" />
              </>
            )}
            {drawerType === 'faq' && (
              <>
                <TextField label="Question" value={draft.question || ''} onChange={(e) => setDraft((p) => ({ ...p, question: e.target.value }))} fullWidth />
                <TextField label="Answer" value={draft.answer || ''} onChange={(e) => setDraft((p) => ({ ...p, answer: e.target.value }))} fullWidth multiline minRows={5} />
              </>
            )}
          </Stack>
          <Stack direction="row" spacing={1.5} sx={{ p: 2.5, borderTop: (t) => `1px solid ${t.palette.divider}` }}>
            {drawerMode === 'edit' ? (
              <Button color="error" variant="outlined" onClick={deleteFromDrawer}>Delete</Button>
            ) : null}
            <Box sx={{ flex: 1 }} />
            <Button color="inherit" onClick={closeDrawer}>Cancel</Button>
            <Button variant="contained" onClick={applyDrawer}>Apply</Button>
          </Stack>
        </Stack>
      </Drawer>

      <IconPickerDrawer
        open={iconToolOpen}
        onClose={() => setIconToolOpen(false)}
        contextLabel="Partner with ISCA"
        searchQuery={iconSearchQuery}
        onSearchQueryChange={(event) => setIconSearchQuery(event.target.value)}
        filteredIcons={filteredIcons}
        selectedIcon={draft.icon || ''}
        onSelectIcon={(iconName) => {
          if (draft.listPath) {
            updateListItem(draft.listPath, draft.index, draft.field, iconName);
          } else {
            setDraft((prev) => ({ ...prev, icon: iconName }));
          }
          setIconToolOpen(false);
        }}
      />
    </>
  );
}

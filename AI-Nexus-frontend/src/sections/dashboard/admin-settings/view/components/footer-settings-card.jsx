import { useCallback, useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import FormControlLabel from '@mui/material/FormControlLabel';
import LoadingButton from '@mui/lab/LoadingButton';
import { alpha } from '@mui/material/styles';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { categoryIcons } from 'src/_mock/_category-icons';
import { HERO_TYPOGRAPHY } from 'src/theme/hero-typography';
import {
  FOOTER_LINKS_MAX,
  FOOTER_STATS_MAX,
} from 'src/layouts/main/footer-defaults';
import { IconPickerDrawer } from './icon-picker-drawer';

const SECTION_TABS = [
  { key: 'stats', title: 'Stats', icon: 'solar:chart-2-bold-duotone' },
  { key: 'general', title: 'Text', icon: 'solar:text-bold-duotone' },
  { key: 'links', title: 'Links', icon: 'solar:link-bold-duotone' },
];

const emptyLink = () => ({ label: '', path: '', external: false, icon: 'solar:link-bold' });

function SectionCardHeader({ title, description }) {
  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 0.5, ...HERO_TYPOGRAPHY.adminCardTitle }}>
        {title}
      </Typography>
      {description ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {description}
        </Typography>
      ) : null}
    </Box>
  );
}

function CompactIconButton({ icon, onClick, title }) {
  return (
    <IconButton
      size="small"
      onClick={onClick}
      title={title}
      sx={{
        width: 34,
        height: 34,
        borderRadius: 1,
        border: (t) => `1px solid ${t.palette.divider}`,
        bgcolor: 'background.paper',
      }}
    >
      <Iconify icon={icon || 'solar:star-bold-duotone'} width={18} />
    </IconButton>
  );
}

export function FooterSettingsCard({ content, setContent, submitting, onSave }) {
  const stats = Array.isArray(content?.stats) ? content.stats : [];
  const links = Array.isArray(content?.links) ? content.links : [];

  const [activeTab, setActiveTab] = useState('stats');
  const [iconToolOpen, setIconToolOpen] = useState(false);
  const [iconDraft, setIconDraft] = useState(null);
  const [iconSearchQuery, setIconSearchQuery] = useState('');

  const [linkDrawerOpen, setLinkDrawerOpen] = useState(false);
  const [linkDrawerMode, setLinkDrawerMode] = useState('add');
  const [editingLinkIndex, setEditingLinkIndex] = useState(null);
  const [linkDraft, setLinkDraft] = useState(emptyLink());

  const availableCategoryIcons = useMemo(() => [...new Set(categoryIcons)], []);
  const filteredCategoryIcons = useMemo(
    () =>
      availableCategoryIcons.filter((iconName) =>
        iconName.toLowerCase().includes(iconSearchQuery.toLowerCase())
      ),
    [availableCategoryIcons, iconSearchQuery]
  );

  const closeLinkDrawer = useCallback(() => {
    setLinkDrawerOpen(false);
    setEditingLinkIndex(null);
    setLinkDraft(emptyLink());
  }, []);

  useEffect(() => {
    if (!linkDrawerOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeLinkDrawer();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [linkDrawerOpen, closeLinkDrawer]);

  const updateStat = (index, field, value) => {
    setContent((prev) => {
      const rows = [...(prev.stats || [])];
      while (rows.length <= index) {
        rows.push({ value: '', label: '', icon: '', useLiveEnrollment: false });
      }
      rows[index] = { ...rows[index], [field]: value };
      return { ...prev, stats: rows };
    });
  };

  const updateLink = (index, field, value) => {
    setContent((prev) => {
      const rows = [...(prev.links || [])];
      while (rows.length <= index) rows.push(emptyLink());
      rows[index] = { ...rows[index], [field]: value };
      return { ...prev, links: rows };
    });
  };

  const openIconPicker = (kind, index) => {
    setIconDraft({ kind, index });
    setIconSearchQuery('');
    setIconToolOpen(true);
  };

  const applyIcon = (iconName) => {
    if (!iconDraft) return;
    if (iconDraft.kind === 'stat') {
      updateStat(iconDraft.index, 'icon', iconName);
    } else if (iconDraft.kind === 'link-draft') {
      setLinkDraft((prev) => ({ ...prev, icon: iconName }));
    } else {
      updateLink(iconDraft.index, 'icon', iconName);
    }
    setIconToolOpen(false);
    setIconDraft(null);
  };

  const openAddLinkDrawer = () => {
    if (links.length >= FOOTER_LINKS_MAX) return;
    setLinkDrawerMode('add');
    setEditingLinkIndex(null);
    setLinkDraft(emptyLink());
    setLinkDrawerOpen(true);
  };

  const openEditLinkDrawer = (index) => {
    const row = links[index];
    if (!row) return;
    setLinkDrawerMode('edit');
    setEditingLinkIndex(index);
    setLinkDraft({
      label: String(row.label || ''),
      path: String(row.path || ''),
      external: Boolean(row.external),
      icon: String(row.icon || 'solar:link-bold'),
    });
    setLinkDrawerOpen(true);
  };

  const handleLinkDrawerSave = () => {
    const label = String(linkDraft.label || '').trim();
    const path = String(linkDraft.path || '').trim();
    if (!label || !path) {
      toast.error('Label and path are required');
      return;
    }

    const entry = {
      label,
      path,
      external: Boolean(linkDraft.external),
      icon: String(linkDraft.icon || 'solar:link-bold'),
    };

    if (linkDrawerMode === 'add') {
      setContent((prev) => ({
        ...prev,
        links: [...(prev.links || []), entry],
      }));
    } else if (editingLinkIndex != null) {
      setContent((prev) => ({
        ...prev,
        links: (prev.links || []).map((row, i) => (i === editingLinkIndex ? entry : row)),
      }));
    }
    closeLinkDrawer();
  };

  const removeLink = (index) => {
    setContent((prev) => ({
      ...prev,
      links: (prev.links || []).filter((_, i) => i !== index),
    }));
  };

  const renderStatsTab = (
    <Stack spacing={1.5}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        Up to four stat cards. Turn on live enrollment to show the count of active learner accounts on the platform.
      </Typography>
      <Box
        sx={{
          borderRadius: 1.5,
          border: (t) => `1px solid ${t.palette.divider}`,
          overflow: 'hidden',
        }}
      >
        <Grid
          container
          sx={{
            px: 1.5,
            py: 1,
            bgcolor: (t) => alpha(t.palette.grey[500], 0.08),
            display: { xs: 'none', md: 'flex' },
          }}
        >
          <Grid item md={0.8}><Typography variant="caption" sx={{ fontWeight: 700 }}>#</Typography></Grid>
          <Grid item md={0.8}><Typography variant="caption" sx={{ fontWeight: 700 }}>Icon</Typography></Grid>
          <Grid item md={3}><Typography variant="caption" sx={{ fontWeight: 700 }}>Value</Typography></Grid>
          <Grid item md={4.4}><Typography variant="caption" sx={{ fontWeight: 700 }}>Label</Typography></Grid>
          <Grid item md={3}><Typography variant="caption" sx={{ fontWeight: 700 }}>Live count</Typography></Grid>
        </Grid>

        {Array.from({ length: FOOTER_STATS_MAX }).map((_, index) => {
          const stat = stats[index] || {};
          return (
            <Box
              key={`footer-stat-${index}`}
              sx={{
                px: 1.5,
                py: 1.25,
                borderTop: (t) => `1px solid ${t.palette.divider}`,
              }}
            >
              <Grid container spacing={1} alignItems="center">
                <Grid item xs={12} md={0.8}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                    {index + 1}
                  </Typography>
                </Grid>
                <Grid item xs="auto" md={0.8}>
                  <CompactIconButton
                    icon={stat.icon}
                    onClick={() => openIconPicker('stat', index)}
                    title="Change icon"
                  />
                </Grid>
                <Grid item xs={12} sm={5} md={3}>
                  <TextField
                    size="small"
                    label="Value"
                    value={stat.value || ''}
                    onChange={(e) => updateStat(index, 'value', e.target.value)}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={7} md={4.4}>
                  <TextField
                    size="small"
                    label="Label"
                    value={stat.label || ''}
                    onChange={(e) => updateStat(index, 'label', e.target.value)}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <FormControlLabel
                    sx={{ m: 0 }}
                    control={
                      <Switch
                        size="small"
                        checked={Boolean(stat.useLiveEnrollment)}
                        onChange={(e) => updateStat(index, 'useLiveEnrollment', e.target.checked)}
                      />
                    }
                    label={<Typography variant="body2">Live enrollment</Typography>}
                  />
                </Grid>
              </Grid>
            </Box>
          );
        })}
      </Box>
    </Stack>
  );

  const renderGeneralTab = (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <TextField
          size="small"
          label="Domain line"
          value={content?.domainLine || ''}
          onChange={(e) => setContent((prev) => ({ ...prev, domainLine: e.target.value }))}
          fullWidth
          placeholder="ainexus.com · AI learning & community"
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          size="small"
          label="Copyright text"
          value={content?.copyrightText || ''}
          onChange={(e) => setContent((prev) => ({ ...prev, copyrightText: e.target.value }))}
          fullWidth
          placeholder="© {year} AI Nexus. All rights reserved."
          helperText="Use {year} for the current year."
        />
      </Grid>
    </Grid>
  );

  const renderLinksTab = (
    <Stack spacing={1.5}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {links.length} / {FOOTER_LINKS_MAX} links
        </Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={<Iconify icon="mingcute:add-line" width={16} />}
          onClick={openAddLinkDrawer}
          disabled={links.length >= FOOTER_LINKS_MAX}
        >
          Add link
        </Button>
      </Stack>

      {links.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary', py: 1 }}>
          No footer links yet.
        </Typography>
      ) : (
        <Stack divider={<Divider flexItem />} sx={{ borderRadius: 1.5, border: (t) => `1px solid ${t.palette.divider}` }}>
          {links.map((link, index) => (
            <Stack
              key={`footer-link-${index}`}
              direction="row"
              alignItems="center"
              spacing={1.25}
              sx={{ px: 1.5, py: 1.1 }}
            >
              <CompactIconButton icon={link.icon} onClick={() => openEditLinkDrawer(index)} title="Edit link" />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="subtitle2" noWrap sx={{ fontWeight: 600 }}>
                  {link.label || `Link ${index + 1}`}
                </Typography>
                <Typography variant="caption" noWrap sx={{ color: 'text.secondary', display: 'block' }}>
                  {link.path || 'No path'}
                  {link.external ? ' · external' : ''}
                </Typography>
              </Box>
              <IconButton size="small" onClick={() => openEditLinkDrawer(index)}>
                <Iconify icon="solar:pen-bold" width={16} />
              </IconButton>
              <IconButton size="small" color="error" onClick={() => removeLink(index)}>
                <Iconify icon="solar:trash-bin-trash-bold" width={16} />
              </IconButton>
            </Stack>
          ))}
        </Stack>
      )}
    </Stack>
  );

  return (
    <>
      <Card sx={{ p: { xs: 2, md: 2.5 } }}>
        <Stack spacing={2}>
          <SectionCardHeader
            title="Footer"
            description="Manage the public site footer stats, text, and navigation links."
          />

          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
            {SECTION_TABS.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <Button
                  key={tab.key}
                  size="small"
                  variant={active ? 'contained' : 'outlined'}
                  color={active ? 'primary' : 'inherit'}
                  startIcon={<Iconify icon={tab.icon} width={16} />}
                  onClick={() => setActiveTab(tab.key)}
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  {tab.title}
                </Button>
              );
            })}
          </Stack>

          <Divider />

          {activeTab === 'stats' && renderStatsTab}
          {activeTab === 'general' && renderGeneralTab}
          {activeTab === 'links' && renderLinksTab}

          <Divider />

          <LoadingButton variant="contained" loading={submitting} onClick={onSave} sx={{ alignSelf: 'flex-start' }}>
            Save footer
          </LoadingButton>
        </Stack>
      </Card>

      <Drawer
        anchor="right"
        open={linkDrawerOpen}
        onClose={closeLinkDrawer}
        PaperProps={{ sx: { width: { xs: 1, sm: 400 }, p: 2.5 } }}
      >
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">
              {linkDrawerMode === 'add' ? 'Add link' : 'Edit link'}
            </Typography>
            <IconButton onClick={closeLinkDrawer}>
              <Iconify icon="mingcute:close-line" />
            </IconButton>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <CompactIconButton
              icon={linkDraft.icon}
              onClick={() => openIconPicker('link-draft', editingLinkIndex ?? -1)}
              title="Change icon"
            />
            <Button
              size="small"
              variant="outlined"
              onClick={() => openIconPicker('link-draft', editingLinkIndex ?? -1)}
            >
              Change icon
            </Button>
          </Stack>

          <TextField
            size="small"
            label="Label"
            value={linkDraft.label}
            onChange={(e) => setLinkDraft((prev) => ({ ...prev, label: e.target.value }))}
            fullWidth
          />
          <TextField
            size="small"
            label="Path or URL"
            value={linkDraft.path}
            onChange={(e) => setLinkDraft((prev) => ({ ...prev, path: e.target.value }))}
            fullWidth
            helperText="e.g. /learning or https://example.com"
          />
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={Boolean(linkDraft.external)}
                onChange={(e) => setLinkDraft((prev) => ({ ...prev, external: e.target.checked }))}
              />
            }
            label="External link"
          />

          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button color="inherit" onClick={closeLinkDrawer}>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleLinkDrawerSave}>
              {linkDrawerMode === 'add' ? 'Add' : 'Update'}
            </Button>
          </Stack>
        </Stack>
      </Drawer>

      <IconPickerDrawer
        open={iconToolOpen}
        onClose={() => {
          setIconToolOpen(false);
          setIconDraft(null);
        }}
        contextLabel="footer item"
        searchQuery={iconSearchQuery}
        onSearchQueryChange={setIconSearchQuery}
        filteredIcons={filteredCategoryIcons}
        selectedIcon={
          iconDraft?.kind === 'stat'
            ? stats[iconDraft.index]?.icon
            : iconDraft?.kind === 'link-draft'
              ? linkDraft.icon
              : iconDraft?.kind === 'link'
                ? links[iconDraft.index]?.icon
                : ''
        }
        onSelectIcon={applyIcon}
      />
    </>
  );
}

import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { toast } from 'src/components/snackbar';
import { Upload } from 'src/components/upload';
import { Editor } from 'src/components/editor';
import { CONFIG } from 'src/config-global';
import { HERO_TYPOGRAPHY } from 'src/theme/hero-typography';
import { appSettingsService } from 'src/services/app-settings.service';

const emptyTier = () => ({
  title: '',
  description: '',
  linkLabel: '',
  linkHref: '',
  price: '',
  priceNote: '',
  priceVariant: 'primary',
});

const ASSET_BASE = CONFIG.site.serverUrl.replace(/\/api\/?$/, '');

function previewLogoUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${ASSET_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

export function FeesSettingsCard({
  feesContent,
  setFeesContent,
  feesContentSubmitting,
  onSave,
  maxTiers = 8,
}) {
  const [agencyLogoFile, setAgencyLogoFile] = useState(null);
  const [agencyLogoUploading, setAgencyLogoUploading] = useState(false);

  const tiers = Array.isArray(feesContent?.tiers) ? feesContent.tiers : [];

  const updateTier = (index, field, value) => {
    setFeesContent((prev) => {
      const nextTiers = [...(prev.tiers || [])];
      nextTiers[index] = { ...nextTiers[index], [field]: value };
      return { ...prev, tiers: nextTiers };
    });
  };

  const addTier = () => {
    setFeesContent((prev) => {
      const nextTiers = [...(prev.tiers || [])];
      if (nextTiers.length >= maxTiers) return prev;
      return { ...prev, tiers: [...nextTiers, emptyTier()] };
    });
  };

  const removeTier = (index) => {
    setFeesContent((prev) => {
      const nextTiers = [...(prev.tiers || [])];
      if (nextTiers.length <= 1) return prev;
      nextTiers.splice(index, 1);
      return { ...prev, tiers: nextTiers };
    });
  };

  const applyAgencyFromSettings = (settings) => {
    const remote = settings?.programmeFeesContent;
    if (!remote) return;
    setFeesContent((prev) => ({
      ...prev,
      agency: {
        logoUrl: remote.agency?.logoUrl ? String(remote.agency.logoUrl) : '',
        name: remote.agency?.name != null ? String(remote.agency.name) : prev.agency?.name || '',
        tagline:
          remote.agency?.tagline != null ? String(remote.agency.tagline) : prev.agency?.tagline || '',
      },
    }));
  };

  const storedAgencyLogoUrl = feesContent?.agency?.logoUrl || '';
  const agencyPreview = agencyLogoFile
    ? agencyLogoFile
    : storedAgencyLogoUrl
      ? previewLogoUrl(storedAgencyLogoUrl)
      : null;
  const hasAgencyLogo = Boolean(agencyLogoFile || storedAgencyLogoUrl);

  const handleUploadAgencyLogo = async () => {
    if (!agencyLogoFile) return;
    try {
      setAgencyLogoUploading(true);
      const updated = await appSettingsService.uploadProgrammeFeesAgencyLogo(agencyLogoFile);
      applyAgencyFromSettings(updated);
      setAgencyLogoFile(null);
      toast.success('Agency logo updated');
    } catch (error) {
      toast.error(error?.message || 'Failed to upload agency logo');
    } finally {
      setAgencyLogoUploading(false);
    }
  };

  const handleClearAgencySelection = () => {
    setAgencyLogoFile(null);
  };

  const handleRemoveAgencyLogo = async () => {
    if (agencyLogoFile) {
      setAgencyLogoFile(null);
      return;
    }

    if (!storedAgencyLogoUrl) return;

    setFeesContent((prev) => ({
      ...prev,
      agency: { ...(prev.agency || {}), logoUrl: '' },
    }));
    try {
      setAgencyLogoUploading(true);
      const updated = await appSettingsService.removeProgrammeFeesAgencyLogo();
      applyAgencyFromSettings(updated);
      toast.success('Agency logo removed');
    } catch (error) {
      toast.error(error?.message || 'Failed to remove agency logo');
    } finally {
      setAgencyLogoUploading(false);
    }
  };

  return (
    <Card sx={{ p: 3 }}>
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="h6" sx={{ mb: 1, ...HERO_TYPOGRAPHY.adminCardTitle }}>
            Programme Fees
          </Typography>
          <Typography variant="body2" sx={HERO_TYPOGRAPHY.adminCardDescription}>
            Shown on the home page before FAQs. Matches the programme fee & funding layout.
          </Typography>
        </Box>

        <TextField
          label="Section heading"
          value={feesContent?.heading || ''}
          onChange={(e) => setFeesContent((prev) => ({ ...prev, heading: e.target.value }))}
          fullWidth
        />

        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Fee tiers
          </Typography>
          <Button variant="outlined" onClick={addTier} disabled={tiers.length >= maxTiers}>
            Add tier
          </Button>
        </Stack>

        <Stack spacing={2}>
          {tiers.map((tier, index) => (
            <Card key={`fee-tier-edit-${index}`} variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={1.5}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {`Tier ${index + 1}`}
                  </Typography>
                  <Button
                    size="small"
                    color="error"
                    onClick={() => removeTier(index)}
                    disabled={tiers.length <= 1}
                  >
                    Remove
                  </Button>
                </Stack>
                <TextField
                  label="Title"
                  value={tier.title || ''}
                  onChange={(e) => updateTier(index, 'title', e.target.value)}
                  fullWidth
                />
                <TextField
                  label="Description"
                  value={tier.description || ''}
                  onChange={(e) => updateTier(index, 'description', e.target.value)}
                  fullWidth
                  multiline
                  minRows={2}
                />
                <Grid container spacing={1.5}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Link label (optional)"
                      value={tier.linkLabel || ''}
                      onChange={(e) => updateTier(index, 'linkLabel', e.target.value)}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Link URL"
                      value={tier.linkHref || ''}
                      onChange={(e) => updateTier(index, 'linkHref', e.target.value)}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Price"
                      value={tier.price || ''}
                      onChange={(e) => updateTier(index, 'price', e.target.value)}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Price note"
                      value={tier.priceNote || ''}
                      onChange={(e) => updateTier(index, 'priceNote', e.target.value)}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      select
                      label="Price color"
                      value={tier.priceVariant === 'default' ? 'default' : 'primary'}
                      onChange={(e) => updateTier(index, 'priceVariant', e.target.value)}
                      fullWidth
                    >
                      <MenuItem value="primary">Primary (red)</MenuItem>
                      <MenuItem value="default">Default (dark)</MenuItem>
                    </TextField>
                  </Grid>
                </Grid>
              </Stack>
            </Card>
          ))}
        </Stack>

        <Box
          sx={(theme) => ({
            p: 1.5,
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`,
            bgcolor: theme.palette.background.neutral,
          })}
        >
          <Stack spacing={1.5}>
            <TextField
              label="Funding partners heading"
              value={feesContent?.fundingPartnersHeading || ''}
              onChange={(e) =>
                setFeesContent((prev) => ({ ...prev, fundingPartnersHeading: e.target.value }))
              }
              fullWidth
            />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Funding partners body
            </Typography>
            <Editor
              value={feesContent?.fundingPartnersBody || ''}
              onChange={(value) => setFeesContent((prev) => ({ ...prev, fundingPartnersBody: value }))}
              editable
              slotProps={{
                wrap: {
                  sx: {
                    minHeight: 120,
                    borderRadius: 1.5,
                    border: (theme) => `1px solid ${theme.palette.divider}`,
                    bgcolor: 'background.paper',
                  },
                },
              }}
            />
          </Stack>
        </Box>

        <Box
          sx={(theme) => ({
            p: 1.5,
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`,
            bgcolor: theme.palette.background.neutral,
          })}
        >
          <Stack spacing={1.5}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Supporting agency
            </Typography>
            <TextField
              label="Agency name"
              value={feesContent?.agency?.name || ''}
              onChange={(e) =>
                setFeesContent((prev) => ({
                  ...prev,
                  agency: { ...prev.agency, name: e.target.value },
                }))
              }
              fullWidth
            />
            <TextField
              label="Tagline"
              value={feesContent?.agency?.tagline || ''}
              onChange={(e) =>
                setFeesContent((prev) => ({
                  ...prev,
                  agency: { ...prev.agency, tagline: e.target.value },
                }))
              }
              fullWidth
            />
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              alignItems={{ xs: 'stretch', sm: 'flex-start' }}
            >
              <Box sx={{ width: { xs: 1, sm: 280 }, maxWidth: 280, flexShrink: 0 }}>
                <Upload
                  value={agencyPreview}
                  onDrop={(files) => {
                    const [file] = files || [];
                    if (file) setAgencyLogoFile(file);
                  }}
                  onDelete={hasAgencyLogo ? handleRemoveAgencyLogo : undefined}
                  accept={{ 'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'] }}
                  maxSize={5 * 1024 * 1024}
                  disabled={agencyLogoUploading}
                  helperText="Small logo preview. Max 5 MB."
                  sx={{
                    '& > .MuiBox-root:first-of-type': {
                      minHeight: 120,
                      p: 1.5,
                    },
                    '& .upload-single-preview img': {
                      maxHeight: 72,
                      width: 'auto',
                      maxWidth: '100%',
                      objectFit: 'contain',
                    },
                  }}
                />
              </Box>

              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ pt: { sm: 0.5 } }}>
                <LoadingButton
                  variant="contained"
                  size="small"
                  loading={agencyLogoUploading}
                  onClick={handleUploadAgencyLogo}
                  disabled={!agencyLogoFile}
                >
                  Save logo
                </LoadingButton>
                <Button
                  size="small"
                  color="inherit"
                  variant="outlined"
                  onClick={agencyLogoFile ? handleClearAgencySelection : handleRemoveAgencyLogo}
                  disabled={agencyLogoUploading || !hasAgencyLogo}
                >
                  {agencyLogoFile ? 'Clear selected' : 'Remove current logo'}
                </Button>
              </Stack>
            </Stack>
          </Stack>
        </Box>

        <LoadingButton variant="contained" loading={feesContentSubmitting} onClick={() => onSave(feesContent)}>
          Save programme fees
        </LoadingButton>
      </Stack>
    </Card>
  );
}

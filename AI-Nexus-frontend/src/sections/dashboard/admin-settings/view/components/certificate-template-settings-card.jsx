import { useCallback, useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { CONFIG } from 'src/config-global';
import { toast } from 'src/components/snackbar';
import { Upload } from 'src/components/upload';
import { Iconify } from 'src/components/iconify';
import { appSettingsService } from 'src/services/app-settings.service';

const LOGO_LABELS = ['Left logo', 'Centre logo', 'Right logo'];

export const DEFAULT_CERTIFICATE_TEMPLATE_SETTINGS = {
  titleLine1: 'CERTIFICATE',
  titleLine2Left: 'OF',
  titleLine2Right: 'ATTENDANCE',
  awardedToLabel: 'has been awarded to',
  sessionLabel: 'for attending of the session',
  cpeSectionLabel: 'Total CPE Hours and Pillar:',
  signatoryName: 'QUEK MU LIM',
  signatoryTitle: 'CHIEF EXECUTIVE OFFICER',
  issuerName: 'ISCA ACADEMY PTE LTD',
  logoUrls: ['', '', ''],
  signatureUrl: '',
};

function resolvePreviewUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  const base = CONFIG.site.serverUrl.replace(/\/api\/?$/, '');
  return `${base}${raw.startsWith('/') ? raw : `/${raw}`}`;
}

function normalizeSettings(data) {
  const source = data && typeof data === 'object' ? data : {};
  const logoUrls = [0, 1, 2].map((i) => {
    const rows = Array.isArray(source.logoUrls) ? source.logoUrls : [];
    return resolvePreviewUrl(rows[i] || '');
  });
  return {
    titleLine1: source.titleLine1 ?? DEFAULT_CERTIFICATE_TEMPLATE_SETTINGS.titleLine1,
    titleLine2Left: source.titleLine2Left ?? DEFAULT_CERTIFICATE_TEMPLATE_SETTINGS.titleLine2Left,
    titleLine2Right: source.titleLine2Right ?? DEFAULT_CERTIFICATE_TEMPLATE_SETTINGS.titleLine2Right,
    awardedToLabel: source.awardedToLabel ?? DEFAULT_CERTIFICATE_TEMPLATE_SETTINGS.awardedToLabel,
    sessionLabel: source.sessionLabel ?? DEFAULT_CERTIFICATE_TEMPLATE_SETTINGS.sessionLabel,
    cpeSectionLabel: source.cpeSectionLabel ?? DEFAULT_CERTIFICATE_TEMPLATE_SETTINGS.cpeSectionLabel,
    signatoryName: source.signatoryName ?? DEFAULT_CERTIFICATE_TEMPLATE_SETTINGS.signatoryName,
    signatoryTitle: source.signatoryTitle ?? DEFAULT_CERTIFICATE_TEMPLATE_SETTINGS.signatoryTitle,
    issuerName: source.issuerName ?? DEFAULT_CERTIFICATE_TEMPLATE_SETTINGS.issuerName,
    logoUrls,
    signatureUrl: resolvePreviewUrl(source.signatureUrl || ''),
  };
}

export function CertificateTemplateSettingsCard() {
  const [settings, setSettings] = useState(() => ({ ...DEFAULT_CERTIFICATE_TEMPLATE_SETTINGS }));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFiles, setLogoFiles] = useState([null, null, null]);
  const [logoUploadingIndex, setLogoUploadingIndex] = useState(null);
  const [signatureFile, setSignatureFile] = useState(null);
  const [signatureSubmitting, setSignatureSubmitting] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await appSettingsService.getCertificateTemplateSettings();
      setSettings(normalizeSettings(data));
      setLogoFiles([null, null, null]);
      setSignatureFile(null);
    } catch (error) {
      toast.error(error?.message || 'Failed to load certificate template settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateField = useCallback((field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSaveText = async () => {
    setSaving(true);
    try {
      const payload = {
        titleLine1: settings.titleLine1,
        titleLine2Left: settings.titleLine2Left,
        titleLine2Right: settings.titleLine2Right,
        awardedToLabel: settings.awardedToLabel,
        sessionLabel: settings.sessionLabel,
        cpeSectionLabel: settings.cpeSectionLabel,
        signatoryName: settings.signatoryName,
        signatoryTitle: settings.signatoryTitle,
        issuerName: settings.issuerName,
      };
      const result = await appSettingsService.updateCertificateTemplateSettings(payload);
      setSettings(normalizeSettings(result?.certificateTemplateSettings || result));
      toast.success('Certificate template text saved');
    } catch (error) {
      toast.error(error?.message || 'Failed to save certificate template text');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setSettings((prev) => ({
      ...DEFAULT_CERTIFICATE_TEMPLATE_SETTINGS,
      logoUrls: prev.logoUrls,
      signatureUrl: prev.signatureUrl,
    }));
  };

  const handleDropLogo = (index, files) => {
    const file = files?.[0];
    if (!file) return;
    setLogoFiles((prev) => {
      const next = [...prev];
      next[index] = file;
      return next;
    });
  };

  const handleUploadLogo = async (index) => {
    const file = logoFiles[index];
    if (!file) return;
    setLogoUploadingIndex(index);
    try {
      const result = await appSettingsService.uploadCertificateTemplateLogo(index, file);
      setSettings(normalizeSettings(result?.certificateTemplateSettings || result));
      setLogoFiles((prev) => {
        const next = [...prev];
        next[index] = null;
        return next;
      });
      toast.success(`${LOGO_LABELS[index]} uploaded`);
    } catch (error) {
      toast.error(error?.message || 'Failed to upload logo');
    } finally {
      setLogoUploadingIndex(null);
    }
  };

  const handleRemoveLogo = async (index) => {
    setLogoUploadingIndex(index);
    try {
      const result = await appSettingsService.removeCertificateTemplateLogo(index);
      setSettings(normalizeSettings(result?.certificateTemplateSettings || result));
      setLogoFiles((prev) => {
        const next = [...prev];
        next[index] = null;
        return next;
      });
      toast.success(`${LOGO_LABELS[index]} removed`);
    } catch (error) {
      toast.error(error?.message || 'Failed to remove logo');
    } finally {
      setLogoUploadingIndex(null);
    }
  };

  const handleDropSignature = (files) => {
    const file = files?.[0];
    if (!file) return;
    setSignatureFile(file);
  };

  const handleUploadSignature = async () => {
    if (!signatureFile) return;
    setSignatureSubmitting(true);
    try {
      const result = await appSettingsService.uploadCertificateTemplateSignature(signatureFile);
      setSettings(normalizeSettings(result?.certificateTemplateSettings || result));
      setSignatureFile(null);
      toast.success('Signature uploaded');
    } catch (error) {
      toast.error(error?.message || 'Failed to upload signature');
    } finally {
      setSignatureSubmitting(false);
    }
  };

  const handleRemoveSignature = async () => {
    setSignatureSubmitting(true);
    try {
      const result = await appSettingsService.removeCertificateTemplateSignature();
      setSettings(normalizeSettings(result?.certificateTemplateSettings || result));
      setSignatureFile(null);
      toast.success('Signature removed');
    } catch (error) {
      toast.error(error?.message || 'Failed to remove signature');
    } finally {
      setSignatureSubmitting(false);
    }
  };

  const textFields = useMemo(
    () => [
      {
        key: 'titleLine1',
        label: 'Title line 1',
        helperText: 'Top title line (e.g. CERTIFICATE)',
      },
      {
        key: 'titleLine2Left',
        label: 'Title line 2 — left word',
        helperText: 'Small word under the E (e.g. OF)',
      },
      {
        key: 'titleLine2Right',
        label: 'Title line 2 — right word',
        helperText: 'Starts under the E (e.g. ATTENDANCE)',
      },
      {
        key: 'awardedToLabel',
        label: 'Awarded-to label',
        helperText: 'Line above learner name',
      },
      {
        key: 'sessionLabel',
        label: 'Session label',
        helperText: 'Line above programme / course title',
      },
      {
        key: 'cpeSectionLabel',
        label: 'CPE section heading',
        helperText: 'Heading above pillar hour lines (pillar names stay dynamic)',
      },
      {
        key: 'signatoryName',
        label: 'Signatory name',
        helperText: 'Footer name below signature',
      },
      {
        key: 'signatoryTitle',
        label: 'Signatory title',
        helperText: 'e.g. CHIEF EXECUTIVE OFFICER',
      },
      {
        key: 'issuerName',
        label: 'Issuer organisation',
        helperText: 'e.g. ISCA ACADEMY PTE LTD',
      },
    ],
    []
  );

  return (
    <Stack spacing={3}>
      <Card sx={{ p: 3 }}>
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Certificate template text
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Control the static wording on generated certificate PDFs. Learner name, course title,
              dates, CPE pillar lines, and certificate number stay dynamic.
            </Typography>
          </Box>

          <Grid container spacing={2}>
            {textFields.map((field) => (
              <Grid item xs={12} md={6} key={field.key}>
                <TextField
                  fullWidth
                  label={field.label}
                  helperText={field.helperText}
                  value={settings[field.key] || ''}
                  disabled={loading || saving}
                  onChange={(e) => updateField(field.key, e.target.value)}
                />
              </Grid>
            ))}
          </Grid>

          <Stack direction="row" spacing={1.5} flexWrap="wrap">
            <LoadingButton
              variant="contained"
              loading={saving}
              disabled={loading}
              onClick={handleSaveText}
            >
              Save text
            </LoadingButton>
            <Button
              variant="outlined"
              color="inherit"
              disabled={loading || saving}
              startIcon={<Iconify icon="solar:restart-bold" width={16} />}
              onClick={handleResetDefaults}
            >
              Reset defaults
            </Button>
          </Stack>
        </Stack>
      </Card>

      <Card sx={{ p: 3 }}>
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Header logos (max 3)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Upload left, centre, and right logos for the certificate header. If a slot is empty,
              the built-in default logo is used.
            </Typography>
          </Box>

          <Grid container spacing={2}>
            {LOGO_LABELS.map((label, index) => (
              <Grid item xs={12} md={4} key={label}>
                <Stack spacing={1.5}>
                  <Typography variant="subtitle2">{label}</Typography>
                  <Upload
                    coverPreview
                    value={logoFiles[index] || settings.logoUrls[index] || null}
                    onDrop={(files) => handleDropLogo(index, files)}
                    onDelete={
                      logoFiles[index] || settings.logoUrls[index]
                        ? () => handleRemoveLogo(index)
                        : undefined
                    }
                    accept={{ 'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'] }}
                    maxSize={5 * 1024 * 1024}
                    disabled={loading || logoUploadingIndex != null}
                    helperText="PNG with transparent background recommended."
                  />
                  <LoadingButton
                    size="small"
                    variant="contained"
                    loading={logoUploadingIndex === index}
                    disabled={!logoFiles[index] || loading}
                    onClick={() => handleUploadLogo(index)}
                  >
                    Save logo
                  </LoadingButton>
                </Stack>
              </Grid>
            ))}
          </Grid>
        </Stack>
      </Card>

      <Card sx={{ p: 3 }}>
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Signatory signature (1 image)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Upload the handwritten signature shown above the signatory name. If empty, the default
              bundled signature is used.
            </Typography>
          </Box>

          <Divider />

          <Upload
            coverPreview
            value={signatureFile || settings.signatureUrl || null}
            onDrop={handleDropSignature}
            onDelete={
              signatureFile || settings.signatureUrl ? handleRemoveSignature : undefined
            }
            accept={{ 'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'] }}
            maxSize={5 * 1024 * 1024}
            disabled={loading || signatureSubmitting}
            helperText="Transparent PNG recommended."
          />

          <Stack direction="row" spacing={1.5}>
            <LoadingButton
              variant="contained"
              loading={signatureSubmitting}
              disabled={!signatureFile}
              onClick={handleUploadSignature}
            >
              Save signature
            </LoadingButton>
            <Button
              color="inherit"
              variant="outlined"
              disabled={signatureSubmitting || (!signatureFile && !settings.signatureUrl)}
              onClick={signatureFile ? () => setSignatureFile(null) : handleRemoveSignature}
            >
              {signatureFile ? 'Clear selected' : 'Remove current'}
            </Button>
          </Stack>
        </Stack>
      </Card>
    </Stack>
  );
}

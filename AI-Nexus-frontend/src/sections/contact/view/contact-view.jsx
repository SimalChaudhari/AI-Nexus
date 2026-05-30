import { m } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { varFade, MotionViewport } from 'src/components/animate';
import { Iconify } from 'src/components/iconify';
import { appSettingsService } from 'src/services/app-settings.service';

import { ContactMap } from '../contact-map';
import { ContactHero } from '../contact-hero';
import { ContactForm } from '../contact-form';
import { buildContactFieldRows } from '../utils/contact-hero-public-fields';
import { DashboardContent } from 'src/layouts/dashboard';
import { HERO_TYPOGRAPHY } from 'src/theme/hero-typography';

// ----------------------------------------------------------------------

export function ContactSection({ hideWhenEmpty = false }) {
  const theme = useTheme();
  const [loaded, setLoaded] = useState(false);
  const [contactHeroImageUrl, setContactHeroImageUrl] = useState('');
  const [contactHeroContent, setContactHeroContent] = useState({
    headingLine1: '',
    headingLine2: '',
    infoTitle: '',
    infoSubtitle: '',
    contacts: [],
  });

  useEffect(() => {
    let active = true;
    const withCacheBust = (url) =>
      url ? `${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}` : '';
    appSettingsService
      .getPublic()
      .then((settings) => {
        if (!active) return;
        const remote = settings?.contactHeroContent || {};
        const remoteContacts = Array.isArray(remote.contacts) ? remote.contacts : [];
        const normalizedContacts = remoteContacts.map((row) => ({
            details: String(
              row?.details ||
              [row?.country, row?.address, row?.phoneNumber]
                .map((item) => String(item || '').trim())
                .filter(Boolean)
                .join('<br/>')
            ).trim(),
            address: String(row?.address || '').trim(),
            phone: String(row?.phone || '').trim(),
            email: String(row?.email || '').trim(),
            whatsapp: String(row?.whatsapp || '').trim(),
            website: String(row?.website || '').trim(),
            addressIcon: String(row?.addressIcon || '').trim(),
            phoneIcon: String(row?.phoneIcon || '').trim(),
            emailIcon: String(row?.emailIcon || '').trim(),
            whatsappIcon: String(row?.whatsappIcon || '').trim(),
            websiteIcon: String(row?.websiteIcon || '').trim(),
            latlng: [
              Number(row?.lat || row?.latlng?.[0] || 0),
              Number(row?.lng || row?.latlng?.[1] || 0),
            ],
          }));
        setContactHeroImageUrl(withCacheBust(settings?.contactHeroImageUrl || ''));
        setContactHeroContent({
          headingLine1: String(remote?.headingLine1 || '').trim(),
          headingLine2: String(remote?.headingLine2 || '').trim(),
          infoTitle: String(remote?.infoTitle || '').trim(),
          infoSubtitle: String(remote?.infoSubtitle || '').trim(),
          contacts: normalizedContacts,
        });
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoaded(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const mapContacts = useMemo(
    () =>
      (contactHeroContent.contacts || []).filter(
        (row) => Number.isFinite(row?.latlng?.[0]) && Number.isFinite(row?.latlng?.[1])
      ),
    [contactHeroContent.contacts]
  );
  const contactFields = useMemo(
    () => buildContactFieldRows((contactHeroContent.contacts || [])[0]),
    [contactHeroContent.contacts]
  );

  const addressField = contactFields.find((f) => f.key === 'address');
  const otherContactFields = contactFields.filter((f) => f.key !== 'address');

  const hasSectionContent = useMemo(() => {
    const hasHero =
      Boolean(contactHeroImageUrl?.trim()) ||
      Boolean(contactHeroContent.headingLine1?.trim()) ||
      Boolean(contactHeroContent.headingLine2?.trim());
    const hasInfo =
      Boolean(contactHeroContent.infoTitle?.trim()) ||
      Boolean(contactHeroContent.infoSubtitle?.trim());
    return hasHero || hasInfo || contactFields.length > 0 || mapContacts.length > 0;
  }, [contactHeroImageUrl, contactHeroContent, contactFields, mapContacts]);

  if (hideWhenEmpty && (!loaded || !hasSectionContent)) {
    return null;
  }

  return (
    <>
      <ContactHero
        imageUrl={contactHeroImageUrl}
        headingLine1={contactHeroContent.headingLine1}
        headingLine2={contactHeroContent.headingLine2}
      />

      <Box
        component="section"
        sx={{
          py: { xs: 4, md: 8 },
          bgcolor: 'background.default',
        }}
      >
        <DashboardContent component={MotionViewport}>
          <Grid container spacing={{ xs: 4, md: 3 }}>
            <Grid item xs={12} md={6} component={m.div} variants={varFade({ distance: 24 }).inUp}>
              <Stack
                spacing={0}
                sx={{
                  borderRadius: '20px',
                  overflow: 'hidden',
                  border: (t) =>
                    `1px solid ${t.palette.mode === 'dark' ? alpha(t.palette.common.white, 0.08) : alpha('#000', 0.06)}`,
                  bgcolor: 'background.paper',
                  boxShadow: (t) =>
                    t.palette.mode === 'dark'
                      ? `0 0 0 1px ${alpha(t.palette.common.black, 0.35)}`
                      : '0 12px 40px rgba(15, 23, 42, 0.08)',
                  minHeight: '100%',
                }}
              >
                <Box
                  sx={{
                    px: { xs: 2.25, sm: 3 },
                    pt: { xs: 2.5, sm: 3 },
                    pb: { xs: 2, sm: 2.25 },
                    background: (t) =>
                      t.palette.mode === 'dark'
                        ? alpha(t.palette.primary.dark, 0.15)
                        : `linear-gradient(180deg, ${alpha(t.palette.primary.main, 0.06)} 0%, transparent 100%)`,
                  }}
                >
                 
                  <Typography variant="h4" sx={{ mb: 0.75, fontWeight: 700 }}>
                
                    {contactHeroContent.infoTitle}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {contactHeroContent.infoSubtitle}
                  </Typography>
                </Box>

                <Box sx={{ px: { xs: 2, sm: 2.5 }, pb: { xs: 2, sm: 2.5 }, pt: 0 }}>
                  <Stack spacing={1.5}>
                    {addressField && (
                      <Box
                        key={addressField.key}
                        sx={{
                          position: 'relative',
                          p: { xs: 2, sm: 2.25 },
                          borderRadius: '16px',
                          bgcolor: (t) =>
                            t.palette.mode === 'dark'
                              ? alpha(t.palette.common.white, 0.04)
                              : alpha(theme.palette.grey[500], 0.06),
                          border: (t) =>
                            `1px solid ${
                              t.palette.mode === 'dark'
                                ? alpha(t.palette.common.white, 0.08)
                                : alpha(theme.palette.grey[500], 0.12)
                            }`,
                          boxShadow: (t) =>
                            t.palette.mode === 'dark' ? 'none' : '0 1px 2px rgba(15,23,42,0.04)',
                        }}
                      >
                        <Box
                          sx={{
                            position: 'absolute',
                            left: 0,
                            top: 16,
                            bottom: 16,
                            width: 3,
                            borderRadius: '0 4px 4px 0',
                            bgcolor: addressField.iconColor,
                            opacity: 0.85,
                          }}
                        />
                        <Stack direction="row" spacing={1.75} alignItems="flex-start" sx={{ pl: 0.75 }}>
                          <Box
                            sx={{
                              width: 48,
                              height: 48,
                              borderRadius: '14px',
                              flexShrink: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              bgcolor: (t) =>
                                alpha(addressField.iconColor, t.palette.mode === 'dark' ? 0.2 : 0.12),
                              border: `1px solid ${alpha(addressField.iconColor, 0.25)}`,
                            }}
                          >
                            <Iconify
                              icon={addressField.icon}
                              sx={{ color: addressField.iconColor, width: 24, height: 24 }}
                            />
                          </Box>
                          <Stack spacing={0.5} sx={{ minWidth: 0, flex: 1, pt: 0.25 }}>
                            <Typography
                              sx={{
                                fontWeight: 600,
                                fontSize: '0.8125rem',
                                color: 'text.secondary',
                                letterSpacing: '0.02em',
                              }}
                            >
                              {addressField.label}
                            </Typography>
                            <Typography
                              component="p"
                              sx={{
                                m: 0,
                                fontWeight: 500,
                                color: 'text.primary',
                                fontSize: { xs: '0.9375rem', sm: '1rem' },
                                lineHeight: 1.55,
                                wordBreak: 'break-word',
                                overflowWrap: 'anywhere',
                                hyphens: 'auto',
                              }}
                            >
                              {addressField.value}
                            </Typography>
                          </Stack>
                        </Stack>
                      </Box>
                    )}

                    {otherContactFields.length > 0 && (
                    <Stack
                      divider={
                        <Divider
                          sx={{
                            borderColor: (t) =>
                              t.palette.mode === 'dark'
                                ? alpha(t.palette.common.white, 0.06)
                                : alpha('#000', 0.06),
                          }}
                        />
                      }
                      spacing={0}
                    >
                      {otherContactFields.map((field) => (
                          <Stack
                            key={field.key}
                            direction="row"
                            spacing={1.5}
                            alignItems="center"
                            sx={{
                              py: 1.35,
                              px: 0.5,
                              borderRadius: '12px',
                              transition: 'background-color 0.15s ease',
                              '&:hover': {
                                bgcolor: (t) =>
                                  t.palette.mode === 'dark'
                                    ? alpha(t.palette.common.white, 0.04)
                                    : alpha('#000', 0.03),
                              },
                            }}
                          >
                            <Box
                              sx={{
                                width: 40,
                                height: 40,
                                borderRadius: '12px',
                                flexShrink: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: (t) => alpha(field.iconColor, t.palette.mode === 'dark' ? 0.18 : 0.1),
                              }}
                            >
                              <Iconify icon={field.icon} sx={{ color: field.iconColor, width: 20, height: 20 }} />
                            </Box>
                            <Stack spacing={0.15} sx={{ minWidth: 0, flex: 1 }}>
                              <Typography
                                sx={{
                                  fontWeight: 600,
                                  fontSize: '0.75rem',
                                  color: 'text.secondary',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.06em',
                                }}
                              >
                                {field.label}
                              </Typography>
                              <Typography
                                sx={{
                                  fontWeight: 500,
                                  fontSize: { xs: '0.875rem', sm: '0.9375rem' },
                                  color: 'text.primary',
                                  lineHeight: 1.45,
                                  wordBreak: 'break-word',
                                  overflowWrap: 'anywhere',
                                }}
                              >
                                {field.value}
                              </Typography>
                            </Stack>
                          </Stack>
                        ))}
                    </Stack>
                    )}
                  </Stack>
                </Box>
              </Stack>
            </Grid>
            <Grid item xs={12} md={6} component={m.div} variants={varFade({ distance: 24 }).inUp}>
              <ContactForm />
            </Grid>
            <Grid item xs={12} component={m.div} variants={varFade({ distance: 24 }).inUp}>
              <Box sx={{ mt: { xs: 1, md: 2 } }}>
                <ContactMap contacts={mapContacts} />
              </Box>
            </Grid>
          </Grid>
        </DashboardContent>
      </Box>
    </>
  );
}

export function ContactView() {
  return <ContactSection />;
}

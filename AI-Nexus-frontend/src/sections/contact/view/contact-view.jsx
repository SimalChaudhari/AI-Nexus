import { m } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

import { varFade, MotionViewport } from 'src/components/animate';
import { Iconify } from 'src/components/iconify';
import { appSettingsService } from 'src/services/app-settings.service';

import { ContactMap } from '../contact-map';
import { ContactHero } from '../contact-hero';
import { ContactForm } from '../contact-form';
import { ContactCardHeader } from '../contact-card-header';
import { buildContactFieldRows } from '../utils/contact-hero-public-fields';
import { contactCardBodySx, contactCardShellSx } from '../contact-card-styles';
import { DashboardContent } from 'src/layouts/dashboard';
import { FLUID_FONT_SIZES } from 'src/theme/home-typography';

// ----------------------------------------------------------------------

export function ContactSection({ hideWhenEmpty = false }) {
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
          whatsappLink: String(row?.whatsappLink || '').trim(),
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
      <Box
        component="section"
        sx={{
          py: { xs: 4, md: 4 },
          bgcolor: 'background.default',
        }}
      >
        <DashboardContent
          component={MotionViewport}
          sx={{
            width: 1,
            maxWidth: '100%',
            mx: 'auto',
            px: { xs: 1.25, sm: 2, md: 3, lg: 4 },
            pt: 0,
            pb: 0,
          }}
        >
          <ContactHero
            imageUrl={contactHeroImageUrl}
            headingLine1={contactHeroContent.headingLine1}
            headingLine2={contactHeroContent.headingLine2}
          />
          <Grid container spacing={{ xs: 4, md: 3 }} alignItems="stretch">
            <Grid
              item
              xs={12}
              md={6}
              component={m.div}
              variants={varFade({ distance: 24 }).inUp}
              sx={{ display: 'flex', minWidth: 0 }}
            >
              <Stack spacing={0} sx={contactCardShellSx}>
                <ContactCardHeader
                  title={contactHeroContent.infoTitle}
                  titleHighlight="help you?"
                  subtitle={contactHeroContent.infoSubtitle}
                />

                <Box sx={contactCardBodySx}>
                  {contactFields.length > 0 && (
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
                      {contactFields.map((field) => {
                        const valueContent = (
                          <Typography
                            sx={{
                              fontWeight: 500,
                              fontSize: FLUID_FONT_SIZES.body2,
                              color: field.href ? 'inherit' : 'text.primary',
                              lineHeight: 1.45,
                              wordBreak: 'break-word',
                              overflowWrap: 'anywhere',
                            }}
                          >
                            {field.value}
                          </Typography>
                        );

                        return (
                        <Stack
                          key={field.key}
                          direction="row"
                          spacing={1.5}
                          alignItems="flex-start"
                          component={field.href ? Link : 'div'}
                          href={field.href || undefined}
                          target={field.href ? '_blank' : undefined}
                          rel={field.href ? 'noopener noreferrer' : undefined}
                          underline="none"
                          sx={{
                            py: 1.15,
                            px: 0.5,
                            borderRadius: '12px',
                            transition: 'background-color 0.15s ease',
                            color: 'inherit',
                            cursor: field.href ? 'pointer' : 'default',
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
                              width: 36,
                              height: 36,
                              borderRadius: '10px',
                              flexShrink: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              bgcolor: (t) =>
                                alpha(field.iconColor, t.palette.mode === 'dark' ? 0.18 : 0.1),
                            }}
                          >
                            <Iconify
                              icon={field.icon}
                              sx={{ color: field.iconColor, width: 18, height: 18 }}
                            />
                          </Box>
                          <Stack spacing={0.15} sx={{ minWidth: 0, flex: 1, pt: 0.15 }}>
                            <Typography
                              sx={{
                                fontWeight: 600,
                                fontSize: FLUID_FONT_SIZES.caption,
                                color: 'text.secondary',
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                              }}
                            >
                              {field.label}
                            </Typography>
                            {field.href ? (
                              <Box
                                component="span"
                                sx={{
                                  color: field.key === 'whatsapp' ? '#00c853' : 'primary.main',
                                  '&:hover': { textDecoration: 'underline' },
                                }}
                              >
                                {valueContent}
                              </Box>
                            ) : (
                              valueContent
                            )}
                          </Stack>
                        </Stack>
                        );
                      })}
                    </Stack>
                  )}
                </Box>
              </Stack>
            </Grid>
            <Grid
              item
              xs={12}
              md={6}
              component={m.div}
              variants={varFade({ distance: 24 }).inUp}
              sx={{ display: 'flex', minWidth: 0 }}
            >
              <ContactForm
                whatsappLink={
                  (contactHeroContent.contacts || [])[0]?.whatsappLink ||
                  (contactHeroContent.contacts || [])[0]?.whatsapp ||
                  ''
                }
              />
            </Grid>
            <Grid item xs={12} component={m.div} variants={varFade({ distance: 24 }).inUp}>
              <Box sx={{ mt: { xs: 0, md: 0 } }}>
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

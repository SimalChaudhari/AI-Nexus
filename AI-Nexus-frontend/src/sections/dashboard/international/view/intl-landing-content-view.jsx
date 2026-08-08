import { useCallback, useEffect, useState } from 'react';

import { paths } from 'src/routes/paths';
import { DashboardContent } from 'src/layouts/dashboard';
import { toast } from 'src/components/snackbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import { appSettingsService } from 'src/services/app-settings.service';
import {
  INTL_LANDING_DEFAULTS,
  normalizeIntlLandingContent,
} from 'src/sections/international/intl-landing-defaults';
import { InternationalLandingSettingsCard } from 'src/sections/dashboard/admin-settings/view/components/international-landing-settings-card';

// ----------------------------------------------------------------------

export function IntlLandingContentView() {
  const [content, setContent] = useState(() => normalizeIntlLandingContent(INTL_LANDING_DEFAULTS));
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [heroFile, setHeroFile] = useState(null);
  const [heroSubmitting, setHeroSubmitting] = useState(false);
  const [globalImageFile, setGlobalImageFile] = useState(null);
  const [globalImageSubmitting, setGlobalImageSubmitting] = useState(false);

  const applyUpdated = (updated) => {
    setContent(
      normalizeIntlLandingContent(updated?.internationalLandingContent || updated)
    );
  };

  const loadContent = useCallback(async () => {
    try {
      setLoading(true);
      const settings = await appSettingsService.getPublic();
      setContent(normalizeIntlLandingContent(settings?.internationalLandingContent));
    } catch (error) {
      toast.error(error?.message || 'Failed to load landing content');
      setContent(normalizeIntlLandingContent(INTL_LANDING_DEFAULTS));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  const handleSave = async () => {
    try {
      setSubmitting(true);
      const updated = await appSettingsService.updateInternationalLandingContent(content);
      applyUpdated(updated);
      toast.success('International landing content saved');
    } catch (error) {
      toast.error(error?.message || 'Failed to save landing content');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDropHero = useCallback((acceptedFiles) => {
    const [file] = acceptedFiles || [];
    if (file) setHeroFile(file);
  }, []);

  const handleUploadHero = async () => {
    if (!heroFile) {
      toast.error('Please select an image first');
      return;
    }
    try {
      setHeroSubmitting(true);
      const updated = await appSettingsService.uploadInternationalLandingHero(heroFile);
      applyUpdated(updated);
      setHeroFile(null);
      toast.success('Landing hero image uploaded');
    } catch (error) {
      toast.error(error?.message || 'Failed to upload hero image');
    } finally {
      setHeroSubmitting(false);
    }
  };

  const handleRemoveHero = async () => {
    if (heroFile) {
      setHeroFile(null);
      return;
    }
    if (!String(content?.hero?.heroImageUrl || '').trim()) return;
    try {
      setHeroSubmitting(true);
      const updated = await appSettingsService.removeInternationalLandingHero();
      applyUpdated(updated);
      toast.success('Landing hero image removed');
    } catch (error) {
      toast.error(error?.message || 'Failed to remove hero image');
    } finally {
      setHeroSubmitting(false);
    }
  };

  const handleDropGlobalImage = useCallback((acceptedFiles) => {
    const [file] = acceptedFiles || [];
    if (file) setGlobalImageFile(file);
  }, []);

  const handleUploadGlobalImage = async () => {
    if (!globalImageFile) {
      toast.error('Please select an image first');
      return;
    }
    try {
      setGlobalImageSubmitting(true);
      const updated =
        await appSettingsService.uploadInternationalLandingGlobalImage(globalImageFile);
      applyUpdated(updated);
      setGlobalImageFile(null);
      toast.success('Global Learning image uploaded');
    } catch (error) {
      toast.error(error?.message || 'Failed to upload Global Learning image');
    } finally {
      setGlobalImageSubmitting(false);
    }
  };

  const handleRemoveGlobalImage = async () => {
    if (globalImageFile) {
      setGlobalImageFile(null);
      return;
    }
    if (!String(content?.globalLearning?.imageUrl || '').trim()) return;
    try {
      setGlobalImageSubmitting(true);
      const updated = await appSettingsService.removeInternationalLandingGlobalImage();
      applyUpdated(updated);
      toast.success('Global Learning image removed');
    } catch (error) {
      toast.error(error?.message || 'Failed to remove Global Learning image');
    } finally {
      setGlobalImageSubmitting(false);
    }
  };

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Landing page"
        links={[
          { name: 'Dashboard', href: paths.admin.root },
          { name: 'International', href: paths.admin.international.root },
          { name: 'Landing page' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {!loading ? (
        <InternationalLandingSettingsCard
          content={content}
          setContent={setContent}
          submitting={submitting}
          onSave={handleSave}
          heroFile={heroFile}
          heroUrl={content?.hero?.heroImageUrl || ''}
          heroSubmitting={heroSubmitting}
          onHeroDrop={handleDropHero}
          onHeroDelete={handleRemoveHero}
          onHeroSave={handleUploadHero}
          onHeroClearOrRemove={heroFile ? () => setHeroFile(null) : handleRemoveHero}
          globalImageFile={globalImageFile}
          globalImageUrl={content?.globalLearning?.imageUrl || ''}
          globalImageSubmitting={globalImageSubmitting}
          onGlobalImageDrop={handleDropGlobalImage}
          onGlobalImageDelete={handleRemoveGlobalImage}
          onGlobalImageSave={handleUploadGlobalImage}
          onGlobalImageClearOrRemove={
            globalImageFile ? () => setGlobalImageFile(null) : handleRemoveGlobalImage
          }
        />
      ) : null}
    </DashboardContent>
  );
}

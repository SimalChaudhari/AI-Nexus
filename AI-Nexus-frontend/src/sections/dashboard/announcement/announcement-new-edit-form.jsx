import { z as zod } from 'zod';
import { useMemo, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import { alpha, useTheme } from '@mui/material/styles';

import { CONFIG } from 'src/config-global';
import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { Iconify } from 'src/components/iconify';
import { SvgColor } from 'src/components/svg-color';
import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';
import { createAnnouncement, updateAnnouncement } from 'src/store/slices/announcementSlice';
import { announcementService } from 'src/services/announcement.service';
import { isEffectivelyEmptyHtml } from 'src/utils/html-plain-text';

// ----------------------------------------------------------------------

export const NewAnnouncementSchema = zod.object({
  title: zod
    .string()
    .trim()
    .min(1, { message: 'Title is required!' })
    .max(200, { message: 'Title must be 200 characters or less' }),
  /** TipTap HTML — validated by visible text, not raw tags */
  description: zod
    .string()
    .refine((val) => !isEffectivelyEmptyHtml(val), { message: 'Description is required!' })
    .refine((val) => (val?.length ?? 0) <= 50000, { message: 'Description is too long' }),
});

// ----------------------------------------------------------------------

export function AnnouncementNewEditForm({ currentAnnouncement, onCancel }) {
  const theme = useTheme();
  const dispatch = useDispatch();
  const router = useRouter();
  const isEdit = Boolean(currentAnnouncement);

  const defaultValues = useMemo(
    () => ({
      title: currentAnnouncement?.title || '',
      description: currentAnnouncement?.description || '',
    }),
    [currentAnnouncement]
  );

  const methods = useForm({
    mode: 'onTouched',
    reValidateMode: 'onBlur',
    shouldFocusError: true,
    resolver: zodResolver(NewAnnouncementSchema),
    defaultValues,
  });

  const { handleSubmit, reset, formState: { isSubmitting } } = methods;

  useEffect(() => {
    reset(defaultValues);
  }, [currentAnnouncement, defaultValues, reset]);

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
      return;
    }
    router.push(paths.admin.announcement.list);
  };

  const handleEditorMediaUpload = async (file) => {
    try {
      return await announcementService.uploadAnnouncementMedia(file);
    } catch (error) {
      toast.error(error?.message || 'Media upload failed');
      return '';
    }
  };

  const onSubmit = handleSubmit(async (data) => {
    try {
      const announcementData = {
        title: data.title.trim(),
        description: data.description,
      };

      if (currentAnnouncement) {
        await dispatch(updateAnnouncement({ id: currentAnnouncement.id, announcementData })).unwrap();
        toast.success('Announcement updated successfully!');
      } else {
        await dispatch(createAnnouncement(announcementData)).unwrap();
        toast.success('Announcement created successfully!');
      }
      router.push(paths.admin.announcement.list);
    } catch (error) {
      const errorMessage = error || 'Failed to save announcement';
      toast.error(errorMessage);
      console.error('Error saving announcement:', error);
    }
  });

  const cardSx = {
    borderRadius: 2,
    border: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
    boxShadow: 'none',
  };

  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Grid container spacing={3}>
        <Grid xs={12} md={8}>
          <Card sx={cardSx}>
            <CardHeader
              title={isEdit ? 'Edit announcement' : 'Create announcement'}
              subheader="Share updates with learners — keep titles short and descriptions clear."
              sx={{ px: 3, pt: 3, pb: 0, alignItems: 'flex-start' }}
              action={
                <Box
                  sx={{
                    flexShrink: 0,
                    width: 48,
                    height: 48,
                    borderRadius: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    color: 'primary.main',
                  }}
                >
                  {/* Same asset as sidebar: config-nav-dashboard → ICONS.announcement */}
                  <SvgColor
                    src={`${CONFIG.site.basePath}/assets/icons/navbar/ic-announcement.svg`}
                    sx={{ width: 28, height: 28, color: 'primary.main' }}
                  />
                </Box>
              }
            />
            <Divider sx={{ mx: 3, my: 2 }} />
            <Stack spacing={3} sx={{ p: 3, pt: 0 }}>
              <Alert severity="info" icon={<Iconify icon="solar:info-circle-bold" width={22} />}>
                Use the <strong>toolbar</strong> for bold, italic, lists, links, and more. Content is saved as HTML and
                shown the same way to learners.
              </Alert>

              <Field.Text name="title" label="Title" placeholder="e.g. Scheduled maintenance this Sunday" />

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Description
                </Typography>
                <Field.Editor
                  name="description"
                  placeholder="What users need to know — bold key dates, add bullet lists or links…"
                  fullItem={false}
                  onUploadImage={handleEditorMediaUpload}
                />
              </Box>
            </Stack>
          </Card>
        </Grid>

        <Grid xs={12} md={4}>
          <Card
            sx={{
              ...cardSx,
              position: { md: 'sticky' },
              top: { md: 24 },
            }}
          >
            <CardHeader
              title="Publish"
              subheader="Save when you’re ready — you can edit this announcement later."
              sx={{ px: 3, pt: 3, pb: 0 }}
            />
            <Divider sx={{ mx: 3, my: 2 }} />
            <Stack spacing={1.5} sx={{ p: 3, pt: 0 }}>
              <Stack direction={{ xs: 'row', sm: 'column' }} spacing={1.5}>
                <Button
                  fullWidth
                  variant="outlined"
                  size="large"
                  color="inherit"
                  startIcon={<Iconify icon="eva:arrow-back-fill" />}
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
                <LoadingButton
                  fullWidth
                  type="submit"
                  variant="contained"
                  size="large"
                  loading={isSubmitting}
                  startIcon={<Iconify icon={isEdit ? 'eva:checkmark-fill' : 'solar:add-circle-bold'} />}
                >
                  {isEdit ? 'Save changes' : 'Create announcement'}
                </LoadingButton>
              </Stack>
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </Form>
  );
}

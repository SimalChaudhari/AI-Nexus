import { z as zod } from 'zod';
import { useMemo, useState, useCallback, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Unstable_Grid2';
import LoadingButton from '@mui/lab/LoadingButton';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import { alpha, useTheme } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { Iconify } from 'src/components/iconify';
import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';
import { Upload } from 'src/components/upload';
import { createSpeaker, updateSpeaker } from 'src/store/slices/speakerSlice';
import { isEffectivelyEmptyHtml } from 'src/utils/html-plain-text';

// ----------------------------------------------------------------------

export const NewSpeakerSchema = zod.object({
  name: zod
    .string()
    .trim()
    .min(1, { message: 'Name is required!' })
    .max(120, { message: 'Name must be 120 characters or less' }),
  about: zod
    .string()
    .optional()
    .refine((val) => !val || val.length <= 50000, { message: 'About section is too long' }),
});

// ----------------------------------------------------------------------

export function SpeakerNewEditForm({ currentSpeaker, onCancel }) {
  const theme = useTheme();
  const dispatch = useDispatch();
  const router = useRouter();
  const isEdit = Boolean(currentSpeaker);

  const [previewImage, setPreviewImage] = useState(currentSpeaker?.profileimage || null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [imageDeleted, setImageDeleted] = useState(false);

  const defaultValues = useMemo(
    () => ({
      name: currentSpeaker?.name || '',
      about: currentSpeaker?.about || '',
    }),
    [currentSpeaker]
  );

  const methods = useForm({
    mode: 'onTouched',
    reValidateMode: 'onBlur',
    shouldFocusError: true,
    resolver: zodResolver(NewSpeakerSchema),
    defaultValues,
  });

  const { reset, handleSubmit, formState: { isSubmitting } } = methods;

  useEffect(() => {
    reset(defaultValues);
    if (currentSpeaker?.id) {
      setPreviewImage(currentSpeaker.profileimage || null);
      setSelectedFile(null);
      setImageDeleted(false);
    } else {
      setPreviewImage(null);
      setSelectedFile(null);
      setImageDeleted(false);
    }
  }, [currentSpeaker, defaultValues, reset]);

  const cardSx = {
    borderRadius: 2,
    border: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
    boxShadow: 'none',
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
      return;
    }
    router.push(paths.admin.speaker.list);
  };

  const handleDropImage = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setPreviewImage(reader.result);
    reader.readAsDataURL(file);
    setSelectedFile(file);
    setImageDeleted(false);
  }, []);

  const handleRemoveImage = useCallback(() => {
    setPreviewImage(null);
    setSelectedFile(null);
    setImageDeleted(true);
  }, []);

  const onSubmit = handleSubmit(async (data) => {
    try {
      const payload = {
        name: data.name.trim(),
        about: isEffectivelyEmptyHtml(data.about || '') ? undefined : data.about,
      };

      const profileimageFile = selectedFile || null;
      if (currentSpeaker) {
        if (imageDeleted) payload.profileimage = '';
        await dispatch(
          updateSpeaker({
            id: currentSpeaker.id,
            data: payload,
            profileimageFile: imageDeleted ? undefined : profileimageFile,
          })
        ).unwrap();
        toast.success('Speaker updated successfully!');
      } else {
        await dispatch(createSpeaker({ data: payload, profileimageFile })).unwrap();
        toast.success('Speaker created successfully!');
      }
      router.push(paths.admin.speaker.list);
    } catch (err) {
      toast.error(err?.message || 'Failed to save speaker');
    }
  });

  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Grid container spacing={3}>
        <Grid xs={12} md={8}>
          <Card sx={cardSx}>
            <CardHeader
              title={isEdit ? 'Edit speaker' : 'Create speaker'}
              subheader="Instructor profile shown on courses and speaker pages."
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
                  <Iconify icon="solar:microphone-bold-duotone" width={28} sx={{ color: 'primary.main' }} />
                </Box>
              }
            />
            <Divider sx={{ mx: 3, my: 2 }} />
            <Stack spacing={3} sx={{ px: 3, pb: 3 }}>
              <Alert severity="info" icon={<Iconify icon="solar:info-circle-bold" width={22} />}>
                Use the editor toolbar for <strong>bold</strong>, lists, and links in the bio. Photo is optional.
              </Alert>

              <Field.Text name="name" label="Name" placeholder="e.g. Dr. Jane Smith" />

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  About
                </Typography>
                <Field.Editor
                  name="about"
                  placeholder="Background, expertise, and how you help learners…"
                  fullItem={false}
                />
              </Box>
            </Stack>
          </Card>
        </Grid>

        <Grid xs={12} md={4}>
          <Stack spacing={3}>
            <Card sx={{ ...cardSx, p: 3 }}>
              <CardHeader title="Profile photo" subheader="PNG, JPG or WebP — max 5 MB." sx={{ p: 0, mb: 2 }} />
              <Upload
                value={selectedFile || previewImage}
                onDrop={handleDropImage}
                onDelete={handleRemoveImage}
                maxSize={5 * 1024 * 1024}
                accept={{
                  'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
                }}
              />
            </Card>

            <Card
              sx={{
                ...cardSx,
                position: { md: 'sticky' },
                top: { md: 24 },
                p: 3,
              }}
            >
              <CardHeader title="Publish" subheader="Save when you’re ready." sx={{ p: 0, mb: 2 }} />
              <Stack spacing={1.5}>
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
                  {isEdit ? 'Save changes' : 'Create speaker'}
                </LoadingButton>
              </Stack>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Form>
  );
}

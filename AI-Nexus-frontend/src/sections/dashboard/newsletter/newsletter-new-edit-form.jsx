import { z as zod } from 'zod';
import { useMemo, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';
import dayjs from 'dayjs';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
import LoadingButton from '@mui/lab/LoadingButton';
import Divider from '@mui/material/Divider';
import FormHelperText from '@mui/material/FormHelperText';
import { alpha, useTheme } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { Iconify } from 'src/components/iconify';
import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';
import { createNewsletter, updateNewsletter } from 'src/store/slices/newsletterSlice';

const HTML_ACCEPT = '.html,.htm,text/html';
const PDF_ACCEPT = '.pdf,application/pdf';

export function getNewsletterSchema(isEdit) {
  return zod
    .object({
      title: zod.string().trim().min(1, { message: 'Title is required' }),
      summary: zod.string().trim().optional(),
      format: zod.enum(['html', 'pdf']),
      file: zod.any().nullable().optional(),
      scheduleEnabled: zod.boolean(),
      publishAt: zod.any().optional(),
      sortOrder: zod.coerce.number().int().min(0),
      isActive: zod.boolean(),
    })
    .superRefine((data, ctx) => {
      if (!isEdit && !(data.file instanceof File)) {
        ctx.addIssue({
          code: zod.ZodIssueCode.custom,
          path: ['file'],
          message: data.format === 'pdf' ? 'Upload a PDF file' : 'Upload an HTML file',
        });
      }
      if (data.scheduleEnabled && !data.publishAt) {
        ctx.addIssue({
          code: zod.ZodIssueCode.custom,
          path: ['publishAt'],
          message: 'Choose a publish date and time',
        });
      }
    });
}

function fileMatchesFormat(file, format) {
  if (!(file instanceof File)) return true;
  const name = file.name || '';
  if (format === 'pdf') {
    return /\.pdf$/i.test(name) || String(file.type || '').includes('pdf');
  }
  return /\.(html|htm)$/i.test(name) || String(file.type || '').includes('html');
}

// ----------------------------------------------------------------------

export function NewsletterNewEditForm({ currentNewsletter, onCancel }) {
  const theme = useTheme();
  const dispatch = useDispatch();
  const router = useRouter();
  const isEdit = Boolean(currentNewsletter);

  const defaultValues = useMemo(
    () => ({
      title: currentNewsletter?.title || '',
      summary: currentNewsletter?.summary || '',
      format: currentNewsletter?.format === 'pdf' ? 'pdf' : 'html',
      file: null,
      scheduleEnabled: Boolean(currentNewsletter?.publishAt),
      publishAt: currentNewsletter?.publishAt || dayjs().format(),
      sortOrder: currentNewsletter?.sortOrder ?? 0,
      isActive: currentNewsletter?.isActive !== false,
    }),
    [currentNewsletter]
  );

  const methods = useForm({
    mode: 'onSubmit',
    resolver: zodResolver(getNewsletterSchema(isEdit)),
    defaultValues,
  });

  const {
    reset,
    watch,
    setValue,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = methods;

  const format = watch('format');
  const file = watch('file');
  const scheduleEnabled = watch('scheduleEnabled');

  useEffect(() => {
    reset(defaultValues);
  }, [currentNewsletter, defaultValues, reset]);

  useEffect(() => {
    if (file instanceof File && !fileMatchesFormat(file, format)) {
      setValue('file', null, { shouldValidate: true });
    }
  }, [file, format, setValue]);

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
    router.push(paths.admin.newsletter.list);
  };

  const onSubmit = handleSubmit(async (data) => {
    try {
      const uploadedFile = data.file instanceof File ? data.file : null;
      if (!isEdit && !uploadedFile) {
        toast.error('Upload an HTML or PDF file');
        return;
      }
      if (uploadedFile && !fileMatchesFormat(uploadedFile, data.format)) {
        toast.error(
          data.format === 'pdf'
            ? 'Please upload a PDF file'
            : 'Please upload an HTML file'
        );
        return;
      }

      const newsletterData = {
        title: data.title.trim(),
        summary: data.summary?.trim() || '',
        format: data.format,
        sortOrder: Number(data.sortOrder) || 0,
        isActive: Boolean(data.isActive),
        publishAt: data.scheduleEnabled ? dayjs(data.publishAt).toISOString() : '',
        file: uploadedFile,
      };

      if (currentNewsletter) {
        await dispatch(
          updateNewsletter({ id: currentNewsletter.id, newsletterData })
        ).unwrap();
        toast.success('Newsletter updated successfully!');
      } else {
        await dispatch(createNewsletter(newsletterData)).unwrap();
        toast.success('Newsletter created successfully!');
      }
      router.push(paths.admin.newsletter.list);
    } catch (error) {
      const errorMessage = error || 'Failed to save newsletter';
      toast.error(errorMessage);
      console.error('Error saving newsletter:', error);
    }
  });

  const fileName =
    (file instanceof File && file.name) || currentNewsletter?.originalFileName || '';

  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Grid container spacing={3}>
        <Grid xs={12} md={8}>
          <Card sx={cardSx}>
            <CardHeader
              title={isEdit ? 'Edit newsletter' : 'Create a newsletter'}
              subheader="Upload a complete HTML issue (layout included) or a PDF. Visitors see the file as uploaded."
              sx={{ px: 3, pt: 3, pb: 0, alignItems: 'flex-start' }}
            />
            <Divider sx={{ mx: 3, my: 2 }} />
            <Stack spacing={3} sx={{ px: 3, pb: 3 }}>
              <Field.Text name="title" label="Title" placeholder="Issue title" />
              <Field.Text
                name="summary"
                label="Summary"
                placeholder="Short description shown on the Newsletter page"
                multiline
                minRows={3}
              />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Format
              </Typography>
              <Field.RadioGroup
                name="format"
                row
                options={[
                  { value: 'html', label: 'HTML' },
                  { value: 'pdf', label: 'PDF' },
                ]}
                helperText="Choose HTML to keep the original article layout, or PDF for a downloadable issue."
              />

              <Box>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                  {format === 'pdf' ? 'PDF file' : 'HTML file'}
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
                  <Button
                    component="label"
                    variant="outlined"
                    color="inherit"
                    startIcon={<Iconify icon="eva:cloud-upload-fill" />}
                  >
                    {isEdit ? 'Replace file' : 'Choose file'}
                    <input
                      type="file"
                      hidden
                      accept={format === 'pdf' ? PDF_ACCEPT : HTML_ACCEPT}
                      onChange={(event) => {
                        const nextFile = event.target.files?.[0] || null;
                        setValue('file', nextFile, { shouldValidate: true, shouldDirty: true });
                        event.target.value = '';
                      }}
                    />
                  </Button>
                  <Typography variant="body2" sx={{ color: fileName ? 'text.primary' : 'text.secondary' }}>
                    {fileName || (format === 'pdf' ? 'No PDF selected' : 'No HTML selected')}
                  </Typography>
                </Stack>
                {isEdit && !file ? (
                  <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
                    Leave unchanged to keep the current file.
                  </Typography>
                ) : null}
                {errors.file?.message ? (
                  <FormHelperText error sx={{ mx: 0, mt: 1 }}>
                    {errors.file.message}
                  </FormHelperText>
                ) : null}
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
              p: 3,
            }}
          >
            <CardHeader title="Publish" subheader="Go live now, or schedule a date and time." sx={{ p: 0, mb: 2 }} />
            <Stack spacing={2.5}>
              <Field.Text name="sortOrder" label="Sort order" type="number" />
              <Field.Switch name="isActive" label="Visible on the public Newsletter page" />
              <Field.Switch name="scheduleEnabled" label="Schedule publish date and time" />
              {scheduleEnabled ? (
                <Field.MobileDateTimePicker
                  name="publishAt"
                  label="Publish at"
                />
              ) : null}
              <Box>
                <Button
                  fullWidth
                  color="inherit"
                  variant="outlined"
                  size="large"
                  startIcon={<Iconify icon="eva:arrow-back-fill" />}
                  onClick={handleCancel}
                  sx={{ mb: 1.5 }}
                >
                  Cancel
                </Button>
                <LoadingButton
                  type="submit"
                  variant="contained"
                  size="large"
                  loading={isSubmitting}
                  fullWidth
                  startIcon={<Iconify icon={isEdit ? 'eva:checkmark-fill' : 'solar:add-circle-bold'} />}
                >
                  {isEdit ? 'Save changes' : 'Create newsletter'}
                </LoadingButton>
              </Box>
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </Form>
  );
}

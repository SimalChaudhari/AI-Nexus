import { useMemo, useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Unstable_Grid2';
import LoadingButton from '@mui/lab/LoadingButton';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { toast } from 'src/components/snackbar';
import { promptCatalogService } from 'src/services/prompt-catalog.service';
import { Form, Field } from 'src/components/hook-form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z as zod } from 'zod';
import { Iconify } from 'src/components/iconify';
import { isEffectivelyEmptyHtml } from 'src/utils/html-plain-text';

const htmlToPlain = (value) => String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const PromptEditSchema = zod.object({
  sectionTitle: zod.string().trim().min(1, { message: 'Section is required' }),
  useCase: zod.string().trim().min(1, { message: 'Use case is required' }),
  prompt: zod
    .string()
    .refine((val) => !isEffectivelyEmptyHtml(val), { message: 'Prompt is required' })
    .refine((val) => (val?.length ?? 0) <= 50000, { message: 'Prompt is too long' }),
});

export function PromptNewEditForm({ currentPrompt }) {
  const theme = useTheme();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const defaultValues = useMemo(() => ({
    sectionTitle: htmlToPlain(currentPrompt?.sectionTitle),
    useCase: htmlToPlain(currentPrompt?.useCase),
    prompt: currentPrompt?.prompt || '',
  }), [currentPrompt]);

  const methods = useForm({
    mode: 'onTouched',
    reValidateMode: 'onBlur',
    shouldFocusError: true,
    resolver: zodResolver(PromptEditSchema),
    defaultValues,
  });
  const { reset, handleSubmit } = methods;

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const handleCancel = () => {
    router.push(paths.admin.prompt.details(currentPrompt?.id));
  };

  const handleSave = handleSubmit(async (values) => {
    if (!currentPrompt?.id) return;
    try {
      setSaving(true);
      await promptCatalogService.updateAdminPromptItem(currentPrompt.id, {
        sectionTitle: currentPrompt.sectionTitle ?? '',
        useCase: currentPrompt.useCase ?? '',
        prompt: values.prompt,
      });
      toast.success('Prompt updated successfully');
      router.push(paths.admin.prompt.details(currentPrompt.id));
    } catch (error) {
      toast.error(error?.message || 'Failed to update prompt');
    } finally {
      setSaving(false);
    }
  });

  const cardSx = {
    borderRadius: 2,
    border: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
    boxShadow: 'none',
  };

  return (
    <Form methods={methods} onSubmit={handleSave}>
      <Grid container spacing={3}>
        <Grid xs={12} md={8}>
          <Card sx={cardSx}>
            <CardHeader
              title="Prompt details"
              subheader="Section and use case are fixed for this entry. Update the prompt content below."
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
                  <Iconify icon="solar:document-text-bold" width={28} />
                </Box>
              }
            />
            <Divider sx={{ mx: 3, my: 2 }} />
            <Stack spacing={3} sx={{ px: 3, pb: 3 }}>
              <Alert severity="info" icon={<Iconify icon="solar:info-circle-bold" width={22} />}>
                Use the <strong>editor toolbar</strong> for formatting prompt content.
              </Alert>

              <Field.Text
                name="sectionTitle"
                label="Section"
                InputProps={{ readOnly: true }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: alpha(theme.palette.grey[500], 0.08),
                  },
                }}
              />
              <Field.Text
                name="useCase"
                label="Use Case"
                InputProps={{ readOnly: true }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: alpha(theme.palette.grey[500], 0.08),
                  },
                }}
              />
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Prompt
                </Typography>
                <Field.Editor
                  name="prompt"
                  placeholder="Write the full prompt content..."
                  fullItem={false}
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
                loading={saving}
                startIcon={<Iconify icon="eva:checkmark-fill" />}
              >
                Save changes
              </LoadingButton>
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </Form>
  );
}

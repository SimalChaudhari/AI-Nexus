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
import LoadingButton from '@mui/lab/LoadingButton';
import Divider from '@mui/material/Divider';
import { alpha, useTheme } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { Iconify } from 'src/components/iconify';
import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';
import { createSkill, updateSkill } from 'src/store/slices/skillSlice';
import { buildSkillMarkdown, parseSkillMarkdown } from './parse-skill-markdown';

// ----------------------------------------------------------------------

export const NewSkillSchema = zod.object({
  title: zod.string().trim().min(1, { message: 'Title is required' }),
  sourceUrl: zod
    .string()
    .trim()
    .optional()
    .refine((value) => !value || /^https?:\/\//i.test(value), {
      message: 'Enter a valid URL starting with http:// or https://',
    }),
  skillMarkdown: zod.string().trim().min(1, { message: 'Paste the full skill content' }),
  sortOrder: zod.coerce.number().int().min(0),
  isActive: zod.boolean(),
});

// ----------------------------------------------------------------------

export function SkillNewEditForm({ currentSkill, onCancel }) {
  const theme = useTheme();
  const dispatch = useDispatch();
  const router = useRouter();
  const isEdit = Boolean(currentSkill);

  const defaultValues = useMemo(
    () => ({
      title: currentSkill?.title || '',
      sourceUrl: currentSkill?.sourceUrl || '',
      skillMarkdown: currentSkill
        ? buildSkillMarkdown(currentSkill)
        : '',
      sortOrder: currentSkill?.sortOrder ?? 0,
      isActive: currentSkill?.isActive !== false,
    }),
    [currentSkill]
  );

  const methods = useForm({
    mode: 'onSubmit',
    resolver: zodResolver(NewSkillSchema),
    defaultValues,
  });

  const {
    reset,
    setValue,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  useEffect(() => {
    reset(defaultValues);
  }, [currentSkill, defaultValues, reset]);

  const cardSx = {
    borderRadius: 2,
    border: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
    boxShadow: 'none',
  };

  const applyParsedMarkdown = (raw) => {
    const parsed = parseSkillMarkdown(raw);
    if (parsed.title) {
      setValue('title', parsed.title, { shouldValidate: true, shouldDirty: true });
    }
    return parsed;
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
      return;
    }
    router.push(paths.admin.skill.list);
  };

  const onSubmit = handleSubmit(async (data) => {
    try {
      const parsed = parseSkillMarkdown(data.skillMarkdown);
      if (!parsed.name) {
        toast.error('Skill content must include YAML frontmatter with a name (e.g. name: pptx)');
        return;
      }
      if (!parsed.description) {
        toast.error('Skill content must include YAML frontmatter with a description');
        return;
      }
      if (!parsed.content) {
        toast.error('Skill content must include the markdown body after the YAML frontmatter');
        return;
      }

      const skillData = {
        name: parsed.name,
        title: data.title.trim() || parsed.title || parsed.name,
        description: parsed.description,
        license: parsed.license || null,
        sourceUrl: data.sourceUrl?.trim() || null,
        content: parsed.content,
        extraFields: parsed.extraFields,
        sortOrder: Number(data.sortOrder) || 0,
        isActive: Boolean(data.isActive),
      };

      if (currentSkill) {
        await dispatch(updateSkill({ id: currentSkill.id, skillData })).unwrap();
        toast.success('Skill updated successfully!');
      } else {
        await dispatch(createSkill(skillData)).unwrap();
        toast.success('Skill created successfully!');
      }
      router.push(paths.admin.skill.list);
    } catch (error) {
      const errorMessage = error || 'Failed to save skill';
      toast.error(errorMessage);
      console.error('Error saving skill:', error);
    }
  });

  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Grid container spacing={3}>
        <Grid xs={12} md={8}>
          <Card sx={cardSx}>
            <CardHeader
              title={isEdit ? 'Edit skill' : 'Create a new skill'}
              subheader="Paste the full skill content — including the --- YAML frontmatter --- and the markdown body. Name, description, license, and extra fields are read from that content."
              sx={{ px: 3, pt: 3, pb: 0, alignItems: 'flex-start' }}
            />
            <Divider sx={{ mx: 3, my: 2 }} />
            <Stack spacing={3} sx={{ px: 3, pb: 3 }}>
              <Field.Text
                name="title"
                label="Title"
                placeholder="Auto-filled from the first # heading, or type a display title"
              />
              <Field.Text
                name="sourceUrl"
                label="Source URL"
                placeholder="Optional — GitHub or docs URL"
              />
              <Field.Text
                name="skillMarkdown"
                label="Skill content"
                placeholder={`---
name: pptx
description: Use this skill when a .pptx file is involved.
---

# PPTX creation, editing, and analysis

Paste the entire skill content here.`}
                helperText="Paste the complete skill, including YAML frontmatter and body."
                multiline
                minRows={18}
                autoFocus={!isEdit}
                onBlur={(event) => applyParsedMarkdown(event.target.value)}
                sx={{
                  '& textarea': {
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    fontSize: '0.875rem',
                    lineHeight: 1.6,
                  },
                }}
              />
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
            <CardHeader title="Publish" subheader="Save when you're ready." sx={{ p: 0, mb: 2 }} />
            <Stack spacing={2.5}>
              <Field.Text name="sortOrder" label="Sort order" type="number" />
              <Field.Switch name="isActive" label="Visible on the public Skills page" />
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
                  {isEdit ? 'Save changes' : 'Create skill'}
                </LoadingButton>
              </Box>
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </Form>
  );
}

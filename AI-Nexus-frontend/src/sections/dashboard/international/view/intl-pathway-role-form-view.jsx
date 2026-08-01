import { z as zod } from 'zod';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Unstable_Grid2';
import LoadingButton from '@mui/lab/LoadingButton';
import FormControlLabel from '@mui/material/FormControlLabel';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { intlPathwayService } from 'src/services/intl-pathway.service';

// ----------------------------------------------------------------------

const Schema = zod.object({
  name: zod.string().min(1, 'Role name is required'),
  blurb: zod.string().optional(),
  reqExcludeText: zod.string().optional(),
  reqAddText: zod.string().optional(),
  reqNote: zod.string().optional(),
  sortOrder: zod.coerce.number().optional(),
  deleted: zod.boolean().optional(),
});

const TIER_OPTIONS = [
  { value: '', label: 'Not scored' },
  { value: '3', label: 'Essential (3)' },
  { value: '2', label: 'Recommended (2)' },
  { value: '1', label: 'Optional (1)' },
];

export function IntlPathwayRoleFormView({ currentRole }) {
  const router = useRouter();
  const isEdit = Boolean(currentRole?.id);
  const [modules, setModules] = useState([]);
  const [scores, setScores] = useState({});

  const defaultValues = useMemo(
    () => ({
      name: currentRole?.name || '',
      blurb: currentRole?.blurb || '',
      reqExcludeText: Array.isArray(currentRole?.reqExclude)
        ? currentRole.reqExclude.join(', ')
        : '',
      reqAddText: Array.isArray(currentRole?.reqAdd) ? currentRole.reqAdd.join(', ') : '',
      reqNote: currentRole?.reqNote || '',
      sortOrder: currentRole?.sortOrder ?? 0,
      deleted: currentRole?.deleted ?? false,
    }),
    [currentRole]
  );

  const methods = useForm({
    resolver: zodResolver(Schema),
    defaultValues,
  });

  const {
    reset,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting },
  } = methods;

  useEffect(() => {
    reset(defaultValues);
    setScores(currentRole?.scores && typeof currentRole.scores === 'object' ? { ...currentRole.scores } : {});
  }, [defaultValues, reset, currentRole]);

  useEffect(() => {
    let active = true;
    intlPathwayService
      .getModules()
      .then((rows) => {
        if (active) setModules((Array.isArray(rows) ? rows : []).filter((m) => !m.deleted));
      })
      .catch(() => {
        if (active) setModules([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const deleted = watch('deleted');

  const parseCodes = (text) =>
    String(text || '')
      .split(/[,\n]/)
      .map((v) => v.trim())
      .filter(Boolean);

  const onSubmit = handleSubmit(async (data) => {
    try {
      const payload = {
        name: data.name.trim(),
        blurb: String(data.blurb || '').trim() || null,
        reqExclude: parseCodes(data.reqExcludeText),
        reqAdd: parseCodes(data.reqAddText),
        reqNote: String(data.reqNote || '').trim() || null,
        scores,
        sortOrder: Number(data.sortOrder) || 0,
      };
      if (isEdit) payload.deleted = !!data.deleted;

      if (isEdit) {
        await intlPathwayService.updateRole(currentRole.id, payload);
        toast.success('Role updated');
      } else {
        await intlPathwayService.createRole(payload);
        toast.success('Role created');
      }
      router.push(paths.admin.international.roles.list);
    } catch (error) {
      toast.error(error?.message || error || 'Failed to save role');
    }
  });

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={isEdit ? 'Edit pathway role' : 'Add pathway role'}
        links={[
          { name: 'Dashboard', href: paths.admin.root },
          { name: 'International' },
          { name: 'Roles', href: paths.admin.international.roles.list },
          { name: isEdit ? 'Edit' : 'New' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Form methods={methods} onSubmit={onSubmit}>
        <Grid container spacing={3}>
          <Grid xs={12} md={8}>
            <Stack spacing={3}>
              <Card sx={{ p: 3 }}>
                <Stack spacing={3}>
                  <Field.Text name="name" label="Role name" />
                  <Field.Text name="blurb" label="Blurb" multiline rows={3} />
                  <Field.Text
                    name="reqExcludeText"
                    label="Foundation exclusions (codes, comma-separated)"
                    helperText="e.g. 01-04, 01-06"
                  />
                  <Field.Text
                    name="reqAddText"
                    label="Foundation additions (codes, comma-separated)"
                  />
                  <Field.Text name="reqNote" label="Foundation note" multiline rows={2} />
                  <Field.Text name="sortOrder" label="Sort order" type="number" />
                  {isEdit && (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={!!deleted}
                          onChange={(e) => setValue('deleted', e.target.checked)}
                        />
                      }
                      label="Deleted (soft delete)"
                    />
                  )}
                </Stack>
              </Card>

              <Card sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  Module tiers for this role
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                  Set Essential / Recommended / Optional for each module — same as the public pathway planner.
                </Typography>

                <Stack spacing={1.5}>
                  {modules.map((mod) => {
                    const value =
                      scores?.[mod.code] != null && scores[mod.code] !== ''
                        ? String(scores[mod.code])
                        : '';
                    return (
                      <Box
                        key={mod.id || mod.code}
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: { xs: '1fr', sm: '110px 1fr 180px' },
                          gap: 1.25,
                          alignItems: 'center',
                          py: 1,
                          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                        }}
                      >
                        <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}>
                          {mod.code}
                        </Typography>
                        <Typography sx={{ fontSize: 14 }}>{mod.title}</Typography>
                        <FormControl size="small" fullWidth>
                          <InputLabel id={`tier-${mod.code}`}>Tier</InputLabel>
                          <Select
                            labelId={`tier-${mod.code}`}
                            label="Tier"
                            value={value}
                            onChange={(e) => {
                              const next = e.target.value;
                              setScores((prev) => {
                                const copy = { ...prev };
                                if (!next) delete copy[mod.code];
                                else copy[mod.code] = Number(next);
                                return copy;
                              });
                            }}
                          >
                            {TIER_OPTIONS.map((opt) => (
                              <MenuItem key={opt.value || 'none'} value={opt.value}>
                                {opt.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Box>
                    );
                  })}
                  {!modules.length && (
                    <Typography color="text.secondary">No modules available yet.</Typography>
                  )}
                </Stack>
              </Card>
            </Stack>
          </Grid>

          <Grid xs={12} md={4}>
            <Box sx={{ position: { md: 'sticky' }, top: { md: 100 } }}>
              <Stack spacing={2}>
                <LoadingButton type="submit" variant="contained" size="large" loading={isSubmitting}>
                  {isEdit ? 'Save role' : 'Create role'}
                </LoadingButton>
                <Button
                  color="inherit"
                  variant="outlined"
                  size="large"
                  onClick={() => router.push(paths.admin.international.roles.list)}
                >
                  Cancel
                </Button>
              </Stack>
            </Box>
          </Grid>
        </Grid>
      </Form>
    </DashboardContent>
  );
}

import { useMemo, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Unstable_Grid2';
import LoadingButton from '@mui/lab/LoadingButton';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import { alpha, useTheme } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { Iconify } from 'src/components/iconify';
import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';
import { createUser, updateUser } from 'src/store/slices/userSlice';
import { userService } from 'src/services/user.service';
import { NewUserSchema, ProfileSchema } from 'src/validations/user.validation';

// ----------------------------------------------------------------------

const STATUS_OPTIONS = [
  { value: 'Active', label: 'Active', description: 'User can sign in' },
  { value: 'Banned', label: 'Banned', description: 'Blocked from access' },
];

const normalizeStatus = (status) => {
  if (!status) return 'Active';
  const statusStr = String(status);
  return statusStr.charAt(0).toUpperCase() + statusStr.slice(1).toLowerCase();
};

// ----------------------------------------------------------------------

export function UserNewEditForm({ currentUser, onCancel, onSuccess, isProfileEdit = false, isAdminProfile = false }) {
  const theme = useTheme();
  const dispatch = useDispatch();
  const router = useRouter();
  const { creating, updating } = useSelector((state) => state.users || { creating: false, updating: false });

  const isCreate = !currentUser && !isProfileEdit;

  const defaultValues = useMemo(() => {
    const base = {
      username: currentUser?.username || '',
      firstname: currentUser?.firstname || '',
      lastname: currentUser?.lastname || '',
      email: currentUser?.email || '',
    };
    if (isProfileEdit) {
      return base;
    }
    return {
      ...base,
      status: normalizeStatus(currentUser?.status) || 'Active',
      password: '',
    };
  }, [currentUser, isProfileEdit]);

  const validationSchema = isProfileEdit
    ? ProfileSchema
    : currentUser
      ? NewUserSchema.omit({ password: true })
      : NewUserSchema;

  const methods = useForm({
    mode: 'onTouched',
    reValidateMode: 'onBlur',
    shouldFocusError: true,
    resolver: zodResolver(validationSchema),
    defaultValues,
  });

  const {
    reset,
    handleSubmit,
    formState: { isSubmitting: isFormSubmitting },
  } = methods;

  useEffect(() => {
    reset(defaultValues);
  }, [currentUser, isProfileEdit, reset, defaultValues]);

  const isSubmitting = isFormSubmitting || (currentUser ? updating : creating);

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
      return;
    }
    if (isProfileEdit) {
      router.back();
      return;
    }
    router.push(paths.admin.user.list);
  };

  const onSubmit = handleSubmit(
    async (data) => {
      try {
        const backendData = {
          username: data.username?.trim(),
          firstname: data.firstname?.trim(),
          lastname: data.lastname?.trim(),
          email: data.email?.trim().toLowerCase(),
        };

        if (!isProfileEdit) {
          const normalizedStatus = normalizeStatus(data.status || 'Active');
          backendData.status = normalizedStatus.toLowerCase();
        }

        if (currentUser) {
          const userId = currentUser.id || currentUser._id;

          if (!userId) {
            toast.error('User ID is missing. Cannot update user.');
            return;
          }

          let updatedUser;

          if (isProfileEdit && isAdminProfile) {
            updatedUser = await userService.updateAdminProfile(backendData);
          } else if (isProfileEdit) {
            updatedUser = await userService.updateUserProfile(backendData);
          } else {
            updatedUser = await dispatch(updateUser({ id: userId, userData: backendData })).unwrap();
          }

          toast.success('Profile updated successfully!');

          if (onSuccess) {
            onSuccess(updatedUser);
          } else if (onCancel) {
            onCancel();
          } else {
            router.push(paths.admin.user.list);
          }
        } else {
          const payload = { ...backendData };
          if (data.password?.trim()) {
            payload.password = data.password.trim();
          }

          const result = await dispatch(createUser(payload)).unwrap();
          const emailSent = result?.temporaryPasswordEmailSent;
          const apiMessage = result?.message;

          if (emailSent) {
            toast.success(apiMessage || 'User created. Temporary password sent by email.');
          } else if (apiMessage) {
            toast.warning(apiMessage);
          } else {
            toast.success('User created successfully!');
          }
          router.push(paths.admin.user.list);
        }
      } catch (error) {
        console.error('Error saving user:', error);
        const errorMessage = error?.message || error?.toString() || 'Failed to save user';
        toast.error(errorMessage);
      }
    },
    (errors) => {
      console.error('Form validation errors:', errors);
      const firstError = Object.values(errors)[0];
      if (firstError?.message) {
        toast.error(firstError.message);
      } else {
        toast.error('Please fix the form errors before submitting');
      }
    }
  );

  const cardSx = {
    borderRadius: 2,
    border: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
    boxShadow: 'none',
  };

  // ------------------------------------------------------------------
  // Profile edit (user or admin own profile)
  // ------------------------------------------------------------------
  if (isProfileEdit) {
    return (
      <Form methods={methods} onSubmit={onSubmit}>
        <Card sx={{ ...cardSx, p: 3 }}>
          <CardHeader
            title="Profile details"
            subheader="Update your name, username, and email."
            sx={{ p: 0, mb: 2 }}
          />
          <Divider sx={{ mb: 3 }} />
          <Box
            rowGap={3}
            columnGap={2}
            display="grid"
            gridTemplateColumns={{
              xs: 'repeat(1, 1fr)',
              sm: 'repeat(2, 1fr)',
            }}
          >
            <Field.Text name="firstname" label="First name" />
            <Field.Text name="lastname" label="Last name" />
            <Field.Text name="username" label="Username" />
            <Field.Text name="email" label="Email" type="email" />
          </Box>

          <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ mt: 3 }}>
            <Button variant="outlined" startIcon={<Iconify icon="eva:arrow-back-fill" />} onClick={handleCancel}>
              Cancel
            </Button>
            <LoadingButton
              type="submit"
              variant="contained"
              loading={isSubmitting}
              startIcon={<Iconify icon="eva:checkmark-fill" />}
            >
              Save changes
            </LoadingButton>
          </Stack>
        </Card>
      </Form>
    );
  }

  // ------------------------------------------------------------------
  // Admin: create user
  // ------------------------------------------------------------------
  if (isCreate) {
    return (
      <Form methods={methods} onSubmit={onSubmit}>
        <Grid container spacing={3}>
          <Grid xs={12} md={8}>
            <Card sx={cardSx}>
              <CardHeader
                title="Create user"
                subheader="Add a learner account. They will use username or email to sign in."
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
                    <Iconify icon="solar:user-plus-bold" width={28} />
                  </Box>
                }
              />
              <Divider sx={{ mx: 3, my: 2 }} />
              <Stack spacing={3} sx={{ px: 3, pb: 3 }}>
                <Alert severity="info" icon={<Iconify icon="solar:letter-bold" width={24} />}>
                  If you leave <strong>Password</strong> empty, the system generates a secure temporary password and sends it to
                  the user&apos;s email. You can optionally set a password here — it will be emailed to them as well.
                </Alert>
                <Box
                  rowGap={3}
                  columnGap={2}
                  display="grid"
                  gridTemplateColumns={{
                    xs: 'repeat(1, 1fr)',
                    md: 'repeat(3, 1fr)',
                  }}
                >
                  <Field.Text name="username" label="Username" />
                  <Field.Text name="firstname" label="First name" />
                  <Field.Text name="lastname" label="Last name" />
                </Box>
                <Box
                  rowGap={3}
                  columnGap={2}
                  display="grid"
                  gridTemplateColumns={{
                    xs: 'repeat(1, 1fr)',
                  }}
                >
                  <Field.Text name="email" label="Email address" type="email" />
                  <Field.Text
                    name="password"
                    label="Password (optional)"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Leave blank to email temporary password"
                  />
                </Box>
              </Stack>
            </Card>
          </Grid>
          <Grid xs={12} md={4}>
            <Stack spacing={3}>
              <Card sx={{ ...cardSx, p: 3 }}>
                <CardHeader
                  title="Account status"
                  subheader="Choose user access level before creating the account."
                  sx={{ p: 0, mb: 2 }}
                />
                <Field.Select name="status" label="Status" InputLabelProps={{ shrink: true }}>
                  {STATUS_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Field.Select>
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
                    startIcon={<Iconify icon="solar:user-plus-bold" />}
                  >
                    Create user
                  </LoadingButton>
                </Stack>
              </Card>
            </Stack>
          </Grid>
        </Grid>
      </Form>
    );
  }

  // ------------------------------------------------------------------
  // Admin: edit user
  // ------------------------------------------------------------------
  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Grid container spacing={3}>
        <Grid xs={12} md={8}>
          <Card sx={cardSx}>
            <CardHeader
              title="User details"
              subheader="Update identity and contact information."
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
                  <Iconify icon="solar:user-id-bold" width={28} />
                </Box>
              }
            />
            <Divider sx={{ mx: 3, my: 2 }} />
            <Stack spacing={3} sx={{ px: 3, pb: 3 }}>
              <Box
                rowGap={3}
                columnGap={2}
                display="grid"
                gridTemplateColumns={{
                  xs: 'repeat(1, 1fr)',
                  md: 'repeat(3, 1fr)',
                }}
              >
                <Field.Text name="username" label="Username" />
                <Field.Text name="firstname" label="First name" />
                <Field.Text name="lastname" label="Last name" />
              </Box>
              <Field.Text name="email" label="Email address" type="email" />
            </Stack>
          </Card>
        </Grid>
        <Grid xs={12} md={4}>
          <Stack spacing={3}>
            <Card sx={{ ...cardSx, p: 3 }}>
              <CardHeader
                title="Account status"
                subheader="Control whether this user can access the platform."
                sx={{ p: 0, mb: 2 }}
              />
              <Field.Select name="status" label="Status" InputLabelProps={{ shrink: true }}>
                {STATUS_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Field.Select>
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
                  startIcon={<Iconify icon="eva:checkmark-fill" />}
                >
                  Save changes
                </LoadingButton>
              </Stack>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Form>
  );
}

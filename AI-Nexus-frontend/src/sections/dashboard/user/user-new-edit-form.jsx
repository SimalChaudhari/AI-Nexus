import { useMemo, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';
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
  { value: 'Inactive', label: 'Inactive', description: 'Account disabled' },
  { value: 'Pending', label: 'Pending', description: 'Awaiting verification' },
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
        <Stack spacing={3}>
          <Alert severity="info" icon={<Iconify icon="solar:letter-bold" width={24} />}>
            If you leave <strong>Password</strong> empty, the system generates a secure temporary password and sends it to
            the user&apos;s email. You can optionally set a password here — it will be emailed to them as well.
          </Alert>

          <Card sx={{ ...cardSx, p: 3 }}>
            <CardHeader
              title="Create user"
              subheader="Add a learner account. They will use username or email to sign in."
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
              <Field.Text name="email" label="Email address" type="email" />
              <Field.Select name="status" label="Account status" InputLabelProps={{ shrink: true }}>
                {STATUS_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Field.Select>
              <Field.Text
                name="password"
                label="Password (optional)"
                type="password"
                autoComplete="new-password"
                placeholder="Leave blank to email temporary password"
              />
            </Box>

            <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ mt: 3 }}>
              <Button variant="outlined" startIcon={<Iconify icon="eva:arrow-back-fill" />} onClick={handleCancel}>
                Cancel
              </Button>
              <LoadingButton
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
      </Form>
    );
  }

  // ------------------------------------------------------------------
  // Admin: edit user
  // ------------------------------------------------------------------
  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Grid container spacing={3}>
        <Grid xs={12} md={4}>
          <Card sx={{ ...cardSx, p: 3, height: 1 }}>
            <CardHeader
              title="Account status"
              subheader="Control whether this user can access the platform."
              sx={{ p: 0, mb: 2 }}
            />
            <Divider sx={{ mb: 2 }} />
            <Controller
              name="status"
              control={methods.control}
              render={({ field }) => (
                <Stack spacing={1.5}>
                  {STATUS_OPTIONS.map((opt) => {
                    const selected = field.value === opt.value;
                    return (
                      <Box
                        key={opt.value}
                        onClick={() => field.onChange(opt.value)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            field.onChange(opt.value);
                          }
                        }}
                        sx={{
                          p: 2,
                          borderRadius: 1.5,
                          cursor: 'pointer',
                          border: `2px solid ${
                            selected ? theme.palette.primary.main : alpha(theme.palette.grey[500], 0.2)
                          }`,
                          bgcolor: selected ? alpha(theme.palette.primary.main, 0.06) : 'transparent',
                          transition: theme.transitions.create(['border-color', 'background-color']),
                          '&:hover': {
                            borderColor: alpha(theme.palette.primary.main, 0.5),
                          },
                        }}
                      >
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <Iconify
                            icon={
                              selected ? 'solar:check-circle-bold' : 'solar:record-circle-line-duotone'
                            }
                            width={22}
                            color={selected ? theme.palette.primary.main : theme.palette.text.disabled}
                          />
                          <Box>
                            <Typography variant="subtitle2">{opt.label}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {opt.description}
                            </Typography>
                          </Box>
                        </Stack>
                      </Box>
                    );
                  })}
                </Stack>
              )}
            />
          </Card>
        </Grid>

        <Grid xs={12} md={8}>
          <Card sx={{ ...cardSx, p: 3 }}>
            <CardHeader
              title="User details"
              subheader="Update identity and contact information."
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
              <Field.Text name="username" label="Username" />
              <Field.Text name="email" label="Email address" type="email" />
              <Field.Text name="firstname" label="First name" />
              <Field.Text name="lastname" label="Last name" />
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
        </Grid>
      </Grid>
    </Form>
  );
}

import { z as zod } from 'zod';
import { useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { useDispatch } from 'react-redux';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import FormControlLabel from '@mui/material/FormControlLabel';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';
import { createUser, updateUser } from 'src/store/slices/userSlice';

// ----------------------------------------------------------------------

export const NewUserSchema = zod.object({
  username: zod.string().min(1, { message: 'Username is required!' }),
  firstname: zod.string().min(1, { message: 'First name is required!' }),
  lastname: zod.string().min(1, { message: 'Last name is required!' }),
  email: zod
    .string()
    .min(1, { message: 'Email is required!' })
    .email({ message: 'Email must be a valid email address!' }),
  // role: zod.string().min(1, { message: 'Role is required!' }),
  // password: zod.string().optional(),
  // Not required
  status: zod.string(),
});

// ----------------------------------------------------------------------

export function UserNewEditForm({ currentUser }) {
  const dispatch = useDispatch();
  const router = useRouter();

  const defaultValues = useMemo(
    () => ({
      status: currentUser?.status || 'Active',
      username: currentUser?.username || '',
      firstname: currentUser?.firstname || '',
      lastname: currentUser?.lastname || '',
      email: currentUser?.email || '',
      // role: currentUser?.role || 'User',
      // password: '',
    }),
    [currentUser]
  );

  const methods = useForm({
    mode: 'onSubmit',
    resolver: zodResolver(NewUserSchema),
    defaultValues,
  });

  const {
    reset,
    watch,
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const values = watch();

  const onSubmit = handleSubmit(async (data) => {
    try {
      // Convert status to lowercase (backend expects "active", "banned", etc.)
      const status = (data.status || 'Active').toLowerCase();

      // Transform frontend data to backend format
      const backendData = {
        username: data.username,
        firstname: data.firstname,
        lastname: data.lastname,
        email: data.email,
        status, // Backend expects lowercase: "active", "banned", etc.
      };

      if (currentUser) {
        // Update user
        await dispatch(updateUser({ id: currentUser.id, userData: backendData })).unwrap();
        toast.success('User updated successfully!');
      } else {
        // Create user - password will be set by backend or default
        await dispatch(createUser(backendData)).unwrap();
        toast.success('User created successfully!');
      }

      router.push(paths.admin.user.list);
    } catch (error) {
      toast.error(error || 'Failed to save user');
      console.error('Error saving user:', error);
    }
  });

  return (
    <Form methods={methods} onSubmit={onSubmit}>
      <Grid container spacing={3}>
        <Grid xs={12} md={4}>
          <Card sx={{ pt: 5, pb: 5, px: 3 }}>
            {currentUser && (
              <Label
                color={
                  (values.status === 'Active' && 'success') ||
                  (values.status === 'Banned' && 'error') ||
                  (values.status === 'Inactive' && 'error') ||
                  'warning'
                }
                sx={{ position: 'absolute', top: 24, right: 24 }}
              >
                {values.status}
              </Label>
            )}

            {currentUser && (
              <FormControlLabel
                labelPlacement="start"
                control={
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <Switch
                        {...field}
                        checked={field.value !== 'Active'}
                        onChange={(event) =>
                          field.onChange(event.target.checked ? 'Banned' : 'Active')
                        }
                      />
                    )}
                  />
                }
                label={
                  <>
                    <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                      Banned
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Apply disable account
                    </Typography>
                  </>
                }
                sx={{
                  mx: 0,
                  mb: 3,
                  width: 1,
                  justifyContent: 'space-between',
                }}
              />
            )}
          </Card>
        </Grid>

        <Grid xs={12} md={8}>
          <Card sx={{ p: 3 }}>
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
              <Field.Text name="email" label="Email address" />
              <Field.Text name="firstname" label="First name" />
              <Field.Text name="lastname" label="Last name" />
              {/* <Field.Text name="role" label="Role" /> */}
              {/* {!currentUser && (
                <Field.Text name="password" label="Password" type="password" />
              )}
              {currentUser && (
                <Field.Text name="password" label="New Password (leave empty to keep current)" type="password" />
              )} */}
            </Box>

            <Stack alignItems="flex-end" sx={{ mt: 3 }}>
              <LoadingButton type="submit" variant="contained" loading={isSubmitting}>
                {!currentUser ? 'Create user' : 'Save changes'}
              </LoadingButton>
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </Form>
  );
}

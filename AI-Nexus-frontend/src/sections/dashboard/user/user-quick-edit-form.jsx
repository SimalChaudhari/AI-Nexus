import { z as zod } from 'zod';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch } from 'react-redux';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import MenuItem from '@mui/material/MenuItem';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { USER_STATUS_OPTIONS } from 'src/_mock';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';
import { updateUser } from 'src/store/slices/userSlice';

// ----------------------------------------------------------------------

export const UserQuickEditSchema = zod.object({
  username: zod.string().min(1, { message: 'Username is required!' }),
  firstname: zod.string().min(1, { message: 'First name is required!' }),
  lastname: zod.string().min(1, { message: 'Last name is required!' }),
  email: zod
    .string()
    .min(1, { message: 'Email is required!' })
    .email({ message: 'Email must be a valid email address!' }),
  // company: zod.string().min(1, { message: 'Company is required!' }),
  // role: zod.string().min(1, { message: 'Role is required!' }),
  // Not required
  status: zod.string(),
});

// ----------------------------------------------------------------------

export function UserQuickEditForm({ currentUser, open, onClose }) {
  const dispatch = useDispatch();
  const defaultValues = useMemo(
    () => ({
      username: currentUser?.username || '',
      firstname: currentUser?.firstname || '',
      lastname: currentUser?.lastname || '',
      email: currentUser?.email || '',
      status: currentUser?.status,
      // company: currentUser?.company || '',
      // role: currentUser?.role || '',
    }),
    [currentUser]
  );

  const methods = useForm({
    mode: 'all',
    resolver: zodResolver(UserQuickEditSchema),
    defaultValues,
  });

  const {
    reset,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

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

      await dispatch(updateUser({ id: currentUser.id, userData: backendData })).unwrap();

      reset();
      onClose();
      toast.success('User updated successfully!');
    } catch (error) {
      toast.error(error || 'Failed to update user');
      console.error('Error updating user:', error);
    }
  });

  return (
    <Dialog
      fullWidth
      maxWidth={false}
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { maxWidth: 720 } }}
    >
      <Form methods={methods} onSubmit={onSubmit}>
        <DialogTitle>Quick Update</DialogTitle>

        <DialogContent>
          <Alert variant="outlined" severity="info" sx={{ mb: 3 }}>
            Account is waiting for confirmation
          </Alert>

          <Box
            rowGap={3}
            columnGap={2}
            display="grid"
            gridTemplateColumns={{ xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' }}
          >
            <Field.Select name="status" label="Status">
              {USER_STATUS_OPTIONS.map((status) => (
                <MenuItem key={status.value} value={status.value}>
                  {status.label}
                </MenuItem>
              ))}
            </Field.Select>

            <Box sx={{ display: { xs: 'none', sm: 'block' } }} />

            <Field.Text name="username" label="Username" />
            <Field.Text name="email" label="Email address" />
            <Field.Text name="firstname" label="First name" />
            <Field.Text name="lastname" label="Last name" />
            {/* <Field.Text name="company" label="Company" /> */}
            {/* <Field.Text name="role" label="Role" /> */}
          </Box>
        </DialogContent>

        <DialogActions>
          <Button variant="outlined" onClick={onClose}>
            Cancel
          </Button>

          <LoadingButton type="submit" variant="contained" loading={isSubmitting}>
            Update
          </LoadingButton>
        </DialogActions>
      </Form>
    </Dialog>
  );
}

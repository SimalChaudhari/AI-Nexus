import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { userService } from 'src/services/user.service';

// Async thunks for API calls
export const fetchUsers = createAsyncThunk('users/fetchUsers', async (_, { rejectWithValue }) => {
  try {
    const users = await userService.getAllUsers();
    return users;
  } catch (error) {
    return rejectWithValue(error?.response?.data?.message || error?.message || 'Failed to fetch users');
  }
});

export const createUser = createAsyncThunk('users/createUser', async (userData, { rejectWithValue }) => {
  try {
    const user = await userService.createUser(userData);
    return user;
  } catch (error) {
    return rejectWithValue(error?.response?.data?.message || error?.message || 'Failed to create user');
  }
});

export const updateUser = createAsyncThunk('users/updateUser', async ({ id, userData }, { rejectWithValue }) => {
  try {
    const user = await userService.updateUser(id, userData);
    return user;
  } catch (error) {
    return rejectWithValue(error?.response?.data?.message || error?.message || 'Failed to update user');
  }
});

export const deleteUser = createAsyncThunk('users/deleteUser', async (id, { rejectWithValue }) => {
  try {
    await userService.deleteUser(id);
    return id;
  } catch (error) {
    return rejectWithValue(error?.response?.data?.message || error?.message || 'Failed to delete user');
  }
});

export const updateUserStatus = createAsyncThunk(
  'users/updateUserStatus',
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const user = await userService.updateUserStatus(id, status);
      return user;
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || error?.message || 'Failed to update user status');
    }
  }
);

const initialState = {
  users: [],
  loading: false,
  creating: false,
  updating: false,
  deleting: false,
  updatingStatus: false,
  error: null,
};

const userSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch users
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create user
      .addCase(createUser.pending, (state) => {
        state.creating = true;
        state.error = null;
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.creating = false;
        const created = action.payload?.user ?? action.payload;
        if (created?.id) {
          state.users.push(created);
        }
      })
      .addCase(createUser.rejected, (state, action) => {
        state.creating = false;
        state.error = action.payload;
      })
      // Update user
      .addCase(updateUser.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.updating = false;
        const index = state.users.findIndex((user) => user.id === action.payload.id);
        if (index !== -1) {
          state.users[index] = action.payload;
        }
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload;
      })
      // Delete user
      .addCase(deleteUser.pending, (state) => {
        state.deleting = true;
        state.error = null;
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.deleting = false;
        state.users = state.users.filter((user) => user.id !== action.payload);
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.deleting = false;
        state.error = action.payload;
      })
      // Update user status
      .addCase(updateUserStatus.pending, (state) => {
        state.updatingStatus = true;
        state.error = null;
      })
      .addCase(updateUserStatus.fulfilled, (state, action) => {
        state.updatingStatus = false;
        const index = state.users.findIndex((user) => user.id === action.payload.id);
        if (index !== -1) {
          state.users[index] = action.payload;
        }
      })
      .addCase(updateUserStatus.rejected, (state, action) => {
        state.updatingStatus = false;
        state.error = action.payload;
      });
  },
});

export const { clearError } = userSlice.actions;
export default userSlice.reducer;


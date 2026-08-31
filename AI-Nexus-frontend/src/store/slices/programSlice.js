import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { programService } from 'src/services/program.service';
import { toast } from 'src/components/snackbar';

export const fetchPrograms = createAsyncThunk('programs/fetchPrograms', async (params, { rejectWithValue }) => {
  try {
    return await programService.getAllPrograms(params || {});
  } catch (error) {
    toast.error(error?.message || 'Failed to fetch programs');
    return rejectWithValue(error?.message);
  }
});

export const createProgram = createAsyncThunk('programs/createProgram', async (data, { rejectWithValue }) => {
  try {
    return await programService.createProgram(data);
  } catch (error) {
    const msg = error?.response?.data?.message || error?.message || 'Failed to create program';
    toast.error(msg);
    return rejectWithValue(msg);
  }
});

export const updateProgram = createAsyncThunk(
  'programs/updateProgram',
  async ({ id, programData }, { rejectWithValue }) => {
    try {
      return await programService.updateProgram(id, programData);
    } catch (error) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to update program';
      toast.error(msg);
      return rejectWithValue(msg);
    }
  }
);

export const deleteProgram = createAsyncThunk('programs/deleteProgram', async (id, { rejectWithValue }) => {
  try {
    await programService.deleteProgram(id);
    return id;
  } catch (error) {
    toast.error(error?.message || 'Failed to delete program');
    return rejectWithValue(error?.message);
  }
});

const programSlice = createSlice({
  name: 'programs',
  initialState: { programs: [], pagination: null, loading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPrograms.pending, (state) => { state.loading = true; })
      .addCase(fetchPrograms.fulfilled, (state, action) => {
        state.loading = false;
        state.programs = action.payload?.data || action.payload || [];
        state.pagination = action.payload?.pagination || null;
      })
      .addCase(fetchPrograms.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createProgram.fulfilled, (state, action) => { state.programs.unshift(action.payload); })
      .addCase(updateProgram.fulfilled, (state, action) => {
        const i = state.programs.findIndex((p) => p.id === action.payload.id);
        if (i !== -1) state.programs[i] = action.payload;
      })
      .addCase(deleteProgram.fulfilled, (state, action) => {
        state.programs = state.programs.filter((p) => p.id !== action.payload);
      });
  },
});

export default programSlice.reducer;

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { labelService } from 'src/services/label.service';
import { toast } from 'src/components/snackbar';

// Async thunks for API calls
export const fetchLabels = createAsyncThunk('labels/fetchLabels', async (_, { rejectWithValue }) => {
  try {
    const response = await labelService.getAllLabels();
    return response;
  } catch (error) {
    const errorMessage = error?.message || 'Failed to fetch labels';
    toast.error(errorMessage);
    return rejectWithValue(errorMessage);
  }
});

export const createLabel = createAsyncThunk('labels/createLabel', async (labelData, { rejectWithValue }) => {
  try {
    const response = await labelService.createLabel(labelData);
    return response;
  } catch (error) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to create label';
    toast.error(errorMessage);
    return rejectWithValue(errorMessage);
  }
});

export const updateLabel = createAsyncThunk('labels/updateLabel', async ({ id, labelData }, { rejectWithValue }) => {
  try {
    const response = await labelService.updateLabel(id, labelData);
    return response;
  } catch (error) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to update label';
    toast.error(errorMessage);
    return rejectWithValue(errorMessage);
  }
});

export const deleteLabel = createAsyncThunk('labels/deleteLabel', async (id, { rejectWithValue }) => {
  try {
    await labelService.deleteLabel(id);
    return id;
  } catch (error) {
    const errorMessage = error?.message || 'Failed to delete label';
    toast.error(errorMessage);
    return rejectWithValue(errorMessage);
  }
});

const labelSlice = createSlice({
  name: 'labels',
  initialState: {
    labels: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchLabels.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLabels.fulfilled, (state, action) => {
        state.loading = false;
        state.labels = action.payload;
      })
      .addCase(fetchLabels.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createLabel.fulfilled, (state, action) => {
        state.labels.unshift(action.payload);
      })
      .addCase(updateLabel.fulfilled, (state, action) => {
        const index = state.labels.findIndex((label) => label.id === action.payload.id);
        if (index !== -1) {
          state.labels[index] = action.payload;
        }
      })
      .addCase(deleteLabel.fulfilled, (state, action) => {
        state.labels = state.labels.filter((label) => label.id !== action.payload);
      });
  },
});

export default labelSlice.reducer;


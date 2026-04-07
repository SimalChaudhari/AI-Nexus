import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { speakerService } from 'src/services/speaker.service';
import { toast } from 'src/components/snackbar';

export const fetchSpeakers = createAsyncThunk(
  'speakers/fetchSpeakers',
  async (_, { rejectWithValue }) => {
    try {
      return await speakerService.getAll();
    } catch (error) {
      const msg = error?.message || 'Failed to fetch speakers';
      toast.error(msg);
      return rejectWithValue(msg);
    }
  }
);

export const createSpeaker = createAsyncThunk(
  'speakers/createSpeaker',
  async ({ data, profileimageFile }, { rejectWithValue }) => {
    try {
      return await speakerService.create(data, profileimageFile);
    } catch (error) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to create speaker';
      toast.error(msg);
      return rejectWithValue(msg);
    }
  }
);

export const updateSpeaker = createAsyncThunk(
  'speakers/updateSpeaker',
  async ({ id, data, profileimageFile }, { rejectWithValue }) => {
    try {
      return await speakerService.update(id, data, profileimageFile);
    } catch (error) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to update speaker';
      toast.error(msg);
      return rejectWithValue(msg);
    }
  }
);

export const deleteSpeaker = createAsyncThunk(
  'speakers/deleteSpeaker',
  async (id, { rejectWithValue }) => {
    try {
      await speakerService.delete(id);
      return id;
    } catch (error) {
      const msg = error?.message || 'Failed to delete speaker';
      toast.error(msg);
      return rejectWithValue(msg);
    }
  }
);

const speakerSlice = createSlice({
  name: 'speakers',
  initialState: {
    speakers: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSpeakers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSpeakers.fulfilled, (state, action) => {
        state.loading = false;
        state.speakers = action.payload || [];
      })
      .addCase(fetchSpeakers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createSpeaker.fulfilled, (state, action) => {
        if (action.payload) state.speakers.unshift(action.payload);
      })
      .addCase(updateSpeaker.fulfilled, (state, action) => {
        if (!action.payload) return;
        const i = state.speakers.findIndex((s) => s.id === action.payload.id);
        if (i !== -1) state.speakers[i] = action.payload;
      })
      .addCase(deleteSpeaker.fulfilled, (state, action) => {
        state.speakers = state.speakers.filter((s) => s.id !== action.payload);
      });
  },
});

export default speakerSlice.reducer;

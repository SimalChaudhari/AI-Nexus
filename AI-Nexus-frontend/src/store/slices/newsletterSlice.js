import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { newsletterService } from 'src/services/newsletter.service';
import { toast } from 'src/components/snackbar';

export const fetchNewsletters = createAsyncThunk(
  'newsletters/fetchNewsletters',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await newsletterService.getAllNewsletters({
        includeUnpublished: true,
        ...params,
      });
      return response;
    } catch (error) {
      const errorMessage = error?.message || 'Failed to fetch newsletters';
      toast.error(errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

export const createNewsletter = createAsyncThunk(
  'newsletters/createNewsletter',
  async (newsletterData, { rejectWithValue }) => {
    try {
      const response = await newsletterService.createNewsletter(newsletterData);
      return response;
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message || error?.message || 'Failed to create newsletter';
      toast.error(errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

export const updateNewsletter = createAsyncThunk(
  'newsletters/updateNewsletter',
  async ({ id, newsletterData }, { rejectWithValue }) => {
    try {
      const response = await newsletterService.updateNewsletter(id, newsletterData);
      return response;
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message || error?.message || 'Failed to update newsletter';
      toast.error(errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

export const deleteNewsletter = createAsyncThunk(
  'newsletters/deleteNewsletter',
  async (id, { rejectWithValue }) => {
    try {
      await newsletterService.deleteNewsletter(id);
      return id;
    } catch (error) {
      const errorMessage = error?.message || 'Failed to delete newsletter';
      toast.error(errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

const newsletterSlice = createSlice({
  name: 'newsletters',
  initialState: {
    newsletters: [],
    pagination: null,
    loading: false,
    error: null,
    hasFetched: false,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchNewsletters.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNewsletters.fulfilled, (state, action) => {
        state.loading = false;
        state.newsletters = action.payload?.data || action.payload || [];
        state.pagination = action.payload?.pagination || null;
        state.hasFetched = true;
      })
      .addCase(fetchNewsletters.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createNewsletter.fulfilled, (state, action) => {
        state.newsletters.unshift(action.payload);
      })
      .addCase(updateNewsletter.fulfilled, (state, action) => {
        const index = state.newsletters.findIndex((item) => item.id === action.payload.id);
        if (index !== -1) {
          state.newsletters[index] = action.payload;
        }
      })
      .addCase(deleteNewsletter.fulfilled, (state, action) => {
        state.newsletters = state.newsletters.filter((item) => item.id !== action.payload);
      });
  },
});

export default newsletterSlice.reducer;

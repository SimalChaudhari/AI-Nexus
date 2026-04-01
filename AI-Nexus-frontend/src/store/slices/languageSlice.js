import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { languageService } from 'src/services/language.service';
import { toast } from 'src/components/snackbar';

export const fetchLanguages = createAsyncThunk(
  'languages/fetchLanguages',
  async (_, { rejectWithValue }) => {
    try {
      return await languageService.getAll();
    } catch (error) {
      const msg = error?.message || 'Failed to fetch languages';
      toast.error(msg);
      return rejectWithValue(msg);
    }
  }
);

export const createLanguage = createAsyncThunk(
  'languages/createLanguage',
  async (data, { rejectWithValue }) => {
    try {
      return await languageService.create(data);
    } catch (error) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to create language';
      toast.error(msg);
      return rejectWithValue(msg);
    }
  }
);

export const updateLanguage = createAsyncThunk(
  'languages/updateLanguage',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      return await languageService.update(id, data);
    } catch (error) {
      const msg = error?.response?.data?.message || error?.message || 'Failed to update language';
      toast.error(msg);
      return rejectWithValue(msg);
    }
  }
);

export const deleteLanguage = createAsyncThunk(
  'languages/deleteLanguage',
  async (id, { rejectWithValue }) => {
    try {
      await languageService.delete(id);
      return id;
    } catch (error) {
      const msg = error?.message || 'Failed to delete language';
      toast.error(msg);
      return rejectWithValue(msg);
    }
  }
);

const languageSlice = createSlice({
  name: 'languages',
  initialState: { languages: [], loading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchLanguages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLanguages.fulfilled, (state, action) => {
        state.loading = false;
        state.languages = action.payload;
      })
      .addCase(fetchLanguages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createLanguage.fulfilled, (state, action) => {
        state.languages.unshift(action.payload);
      })
      .addCase(updateLanguage.fulfilled, (state, action) => {
        const i = state.languages.findIndex((l) => l.id === action.payload.id);
        if (i !== -1) state.languages[i] = action.payload;
      })
      .addCase(deleteLanguage.fulfilled, (state, action) => {
        state.languages = state.languages.filter((l) => l.id !== action.payload);
      });
  },
});

export default languageSlice.reducer;

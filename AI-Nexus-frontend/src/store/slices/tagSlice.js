import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { tagService } from 'src/services/tag.service';
import { toast } from 'src/components/snackbar';

// Async thunks for API calls
export const fetchTags = createAsyncThunk('tags/fetchTags', async (_, { rejectWithValue }) => {
  try {
    const response = await tagService.getAllTags();
    return response;
  } catch (error) {
    const errorMessage = error?.message || 'Failed to fetch tags';
    toast.error(errorMessage);
    return rejectWithValue(errorMessage);
  }
});

export const createTag = createAsyncThunk('tags/createTag', async (tagData, { rejectWithValue }) => {
  try {
    const response = await tagService.createTag(tagData);
    return response;
  } catch (error) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to create tag';
    toast.error(errorMessage);
    return rejectWithValue(errorMessage);
  }
});

export const updateTag = createAsyncThunk('tags/updateTag', async ({ id, tagData }, { rejectWithValue }) => {
  try {
    const response = await tagService.updateTag(id, tagData);
    return response;
  } catch (error) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to update tag';
    toast.error(errorMessage);
    return rejectWithValue(errorMessage);
  }
});

export const deleteTag = createAsyncThunk('tags/deleteTag', async (id, { rejectWithValue }) => {
  try {
    await tagService.deleteTag(id);
    return id;
  } catch (error) {
    const errorMessage = error?.message || 'Failed to delete tag';
    toast.error(errorMessage);
    return rejectWithValue(errorMessage);
  }
});

const tagSlice = createSlice({
  name: 'tags',
  initialState: {
    tags: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTags.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTags.fulfilled, (state, action) => {
        state.loading = false;
        state.tags = action.payload;
      })
      .addCase(fetchTags.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createTag.fulfilled, (state, action) => {
        state.tags.unshift(action.payload);
      })
      .addCase(updateTag.fulfilled, (state, action) => {
        const index = state.tags.findIndex((tag) => tag.id === action.payload.id);
        if (index !== -1) {
          state.tags[index] = action.payload;
        }
      })
      .addCase(deleteTag.fulfilled, (state, action) => {
        state.tags = state.tags.filter((tag) => tag.id !== action.payload);
      });
  },
});

export default tagSlice.reducer;

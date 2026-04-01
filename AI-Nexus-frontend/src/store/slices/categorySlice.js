import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { categoryService } from 'src/services/category.service';
import { toast } from 'src/components/snackbar';

// Async thunks for API calls
export const fetchCategories = createAsyncThunk('categories/fetchCategories', async (_, { rejectWithValue }) => {
  try {
    const response = await categoryService.getAllCategories();
    return response;
  } catch (error) {
    const errorMessage = error?.message || 'Failed to fetch categories';
    toast.error(errorMessage);
    return rejectWithValue(errorMessage);
  }
});

export const createCategory = createAsyncThunk('categories/createCategory', async (categoryData, { rejectWithValue }) => {
  try {
    const response = await categoryService.createCategory(categoryData);
    return response;
  } catch (error) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to create category';
    toast.error(errorMessage);
    return rejectWithValue(errorMessage);
  }
});

export const updateCategory = createAsyncThunk('categories/updateCategory', async ({ id, categoryData }, { rejectWithValue }) => {
  try {
    const response = await categoryService.updateCategory(id, categoryData);
    return response;
  } catch (error) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to update category';
    toast.error(errorMessage);
    return rejectWithValue(errorMessage);
  }
});

export const deleteCategory = createAsyncThunk('categories/deleteCategory', async (id, { rejectWithValue }) => {
  try {
    await categoryService.deleteCategory(id);
    return id; // Return the ID of the deleted category
  } catch (error) {
    const errorMessage = error?.message || 'Failed to delete category';
    toast.error(errorMessage);
    return rejectWithValue(errorMessage);
  }
});

const categorySlice = createSlice({
  name: 'categories',
  initialState: {
    categories: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.categories = action.payload;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createCategory.fulfilled, (state, action) => {
        state.categories.unshift(action.payload); // Add new category to the beginning
      })
      .addCase(updateCategory.fulfilled, (state, action) => {
        const index = state.categories.findIndex((category) => category.id === action.payload.id);
        if (index !== -1) {
          state.categories[index] = action.payload;
        }
      })
      .addCase(deleteCategory.fulfilled, (state, action) => {
        state.categories = state.categories.filter((category) => category.id !== action.payload);
      });
  },
});

export default categorySlice.reducer;

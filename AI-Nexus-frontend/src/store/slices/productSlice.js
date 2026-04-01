import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { productService } from 'src/services/product.service';
import { toast } from 'src/components/snackbar';

// Async thunks for API calls
export const fetchProducts = createAsyncThunk('products/fetchProducts', async (_, { rejectWithValue }) => {
  try {
    const response = await productService.getAllProducts();
    return response;
  } catch (error) {
    const errorMessage = error?.message || 'Failed to fetch products';
    toast.error(errorMessage);
    return rejectWithValue(errorMessage);
  }
});

export const createProduct = createAsyncThunk('products/createProduct', async (productData, { rejectWithValue }) => {
  try {
    const response = await productService.createProduct(productData);
    return response;
  } catch (error) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to create product';
    toast.error(errorMessage);
    return rejectWithValue(errorMessage);
  }
});

export const updateProduct = createAsyncThunk('products/updateProduct', async ({ id, productData }, { rejectWithValue }) => {
  try {
    const response = await productService.updateProduct(id, productData);
    return response;
  } catch (error) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to update product';
    toast.error(errorMessage);
    return rejectWithValue(errorMessage);
  }
});

export const deleteProduct = createAsyncThunk('products/deleteProduct', async (id, { rejectWithValue }) => {
  try {
    await productService.deleteProduct(id);
    return id; // Return the ID of the deleted product
  } catch (error) {
    const errorMessage = error?.message || 'Failed to delete product';
    toast.error(errorMessage);
    return rejectWithValue(errorMessage);
  }
});

const productSlice = createSlice({
  name: 'products',
  initialState: {
    products: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createProduct.fulfilled, (state, action) => {
        state.products.unshift(action.payload); // Add new product to the beginning
      })
      .addCase(updateProduct.fulfilled, (state, action) => {
        const index = state.products.findIndex((product) => product.id === action.payload.id);
        if (index !== -1) {
          state.products[index] = action.payload;
        }
      })
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.products = state.products.filter((product) => product.id !== action.payload);
      });
  },
});

export default productSlice.reducer;


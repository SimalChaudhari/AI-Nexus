import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { workflowService } from 'src/services/workflow.service';
import { toast } from 'src/components/snackbar';

// Async thunks for API calls
export const fetchWorkflows = createAsyncThunk('workflows/fetchWorkflows', async (_, { rejectWithValue }) => {
  try {
    const response = await workflowService.getAllWorkflows();
    return response;
  } catch (error) {
    const errorMessage = error?.message || 'Failed to fetch AI resources';
    toast.error(errorMessage);
    return rejectWithValue(errorMessage);
  }
});

export const createWorkflow = createAsyncThunk('workflows/createWorkflow', async ({ workflowData, imageFile }, { rejectWithValue }) => {
  try {
    const response = await workflowService.createWorkflow(workflowData, imageFile);
    return response;
  } catch (error) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to create AI resource';
    toast.error(errorMessage);
    return rejectWithValue(errorMessage);
  }
});

export const updateWorkflow = createAsyncThunk('workflows/updateWorkflow', async ({ id, workflowData, imageFile }, { rejectWithValue }) => {
  try {
    const response = await workflowService.updateWorkflow(id, workflowData, imageFile);
    return response;
  } catch (error) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to update AI resource';
    toast.error(errorMessage);
    return rejectWithValue(errorMessage);
  }
});

export const deleteWorkflow = createAsyncThunk('workflows/deleteWorkflow', async (id, { rejectWithValue }) => {
  try {
    await workflowService.deleteWorkflow(id);
    return id;
  } catch (error) {
    const errorMessage = error?.message || 'Failed to delete AI resource';
    toast.error(errorMessage);
    return rejectWithValue(errorMessage);
  }
});

const workflowSlice = createSlice({
  name: 'workflows',
  initialState: {
    workflows: [],
    loading: false,
    creating: false,
    updating: false,
    deleting: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch workflows
      .addCase(fetchWorkflows.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWorkflows.fulfilled, (state, action) => {
        state.loading = false;
        state.workflows = action.payload;
      })
      .addCase(fetchWorkflows.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create workflow
      .addCase(createWorkflow.pending, (state) => {
        state.creating = true;
        state.error = null;
      })
      .addCase(createWorkflow.fulfilled, (state, action) => {
        state.creating = false;
        state.workflows.unshift(action.payload);
      })
      .addCase(createWorkflow.rejected, (state, action) => {
        state.creating = false;
        state.error = action.payload;
      })
      // Update workflow
      .addCase(updateWorkflow.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(updateWorkflow.fulfilled, (state, action) => {
        state.updating = false;
        const index = state.workflows.findIndex((workflow) => workflow.id === action.payload.id);
        if (index !== -1) {
          state.workflows[index] = action.payload;
        }
      })
      .addCase(updateWorkflow.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload;
      })
      // Delete workflow
      .addCase(deleteWorkflow.pending, (state) => {
        state.deleting = true;
        state.error = null;
      })
      .addCase(deleteWorkflow.fulfilled, (state, action) => {
        state.deleting = false;
        state.workflows = state.workflows.filter((workflow) => workflow.id !== action.payload);
      })
      .addCase(deleteWorkflow.rejected, (state, action) => {
        state.deleting = false;
        state.error = action.payload;
      });
  },
});

export default workflowSlice.reducer;


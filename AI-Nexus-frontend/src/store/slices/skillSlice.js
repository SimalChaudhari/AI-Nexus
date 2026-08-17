import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { skillService } from 'src/services/skill.service';
import { toast } from 'src/components/snackbar';

export const fetchSkills = createAsyncThunk(
  'skills/fetchSkills',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await skillService.getAllSkills({
        includeInactive: true,
        ...params,
      });
      return response;
    } catch (error) {
      const errorMessage = error?.message || 'Failed to fetch skills';
      toast.error(errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

export const createSkill = createAsyncThunk(
  'skills/createSkill',
  async (skillData, { rejectWithValue }) => {
    try {
      const response = await skillService.createSkill(skillData);
      return response;
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message || error?.message || 'Failed to create skill';
      toast.error(errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

export const updateSkill = createAsyncThunk(
  'skills/updateSkill',
  async ({ id, skillData }, { rejectWithValue }) => {
    try {
      const response = await skillService.updateSkill(id, skillData);
      return response;
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message || error?.message || 'Failed to update skill';
      toast.error(errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

export const deleteSkill = createAsyncThunk(
  'skills/deleteSkill',
  async (id, { rejectWithValue }) => {
    try {
      await skillService.deleteSkill(id);
      return id;
    } catch (error) {
      const errorMessage = error?.message || 'Failed to delete skill';
      toast.error(errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

const skillSlice = createSlice({
  name: 'skills',
  initialState: {
    skills: [],
    pagination: null,
    loading: false,
    error: null,
    hasFetched: false,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSkills.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSkills.fulfilled, (state, action) => {
        state.loading = false;
        state.skills = action.payload?.data || action.payload || [];
        state.pagination = action.payload?.pagination || null;
        state.hasFetched = true;
      })
      .addCase(fetchSkills.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createSkill.fulfilled, (state, action) => {
        state.skills.unshift(action.payload);
      })
      .addCase(updateSkill.fulfilled, (state, action) => {
        const index = state.skills.findIndex((skill) => skill.id === action.payload.id);
        if (index !== -1) {
          state.skills[index] = action.payload;
        }
      })
      .addCase(deleteSkill.fulfilled, (state, action) => {
        state.skills = state.skills.filter((skill) => skill.id !== action.payload);
      });
  },
});

export default skillSlice.reducer;

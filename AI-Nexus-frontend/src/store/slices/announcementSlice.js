import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { announcementService } from 'src/services/announcement.service';
import { toast } from 'src/components/snackbar';

// Async thunks for API calls
export const fetchAnnouncements = createAsyncThunk('announcements/fetchAnnouncements', async (_, { rejectWithValue }) => {
  try {
    const response = await announcementService.getAllAnnouncements();
    return response;
  } catch (error) {
    const errorMessage = error?.message || 'Failed to fetch announcements';
    toast.error(errorMessage);
    return rejectWithValue(errorMessage);
  }
});

export const createAnnouncement = createAsyncThunk('announcements/createAnnouncement', async (announcementData, { rejectWithValue }) => {
  try {
    const response = await announcementService.createAnnouncement(announcementData);
    return response;
  } catch (error) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to create announcement';
    toast.error(errorMessage);
    return rejectWithValue(errorMessage);
  }
});

export const updateAnnouncement = createAsyncThunk('announcements/updateAnnouncement', async ({ id, announcementData }, { rejectWithValue }) => {
  try {
    const response = await announcementService.updateAnnouncement(id, announcementData);
    return response;
  } catch (error) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to update announcement';
    toast.error(errorMessage);
    return rejectWithValue(errorMessage);
  }
});

export const deleteAnnouncement = createAsyncThunk('announcements/deleteAnnouncement', async (id, { rejectWithValue }) => {
  try {
    await announcementService.deleteAnnouncement(id);
    return id;
  } catch (error) {
    const errorMessage = error?.message || 'Failed to delete announcement';
    toast.error(errorMessage);
    return rejectWithValue(errorMessage);
  }
});

const announcementSlice = createSlice({
  name: 'announcements',
  initialState: {
    announcements: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAnnouncements.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAnnouncements.fulfilled, (state, action) => {
        state.loading = false;
        state.announcements = action.payload;
      })
      .addCase(fetchAnnouncements.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createAnnouncement.fulfilled, (state, action) => {
        state.announcements.unshift(action.payload);
      })
      .addCase(updateAnnouncement.fulfilled, (state, action) => {
        const index = state.announcements.findIndex((announcement) => announcement.id === action.payload.id);
        if (index !== -1) {
          state.announcements[index] = action.payload;
        }
      })
      .addCase(deleteAnnouncement.fulfilled, (state, action) => {
        state.announcements = state.announcements.filter((announcement) => announcement.id !== action.payload);
      });
  },
});

export default announcementSlice.reducer;

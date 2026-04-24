import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { courseService } from 'src/services/course.service';
import { toast } from 'src/components/snackbar';

// Async thunks for API calls
export const fetchCourses = createAsyncThunk('courses/fetchCourses', async (params = {}, { rejectWithValue }) => {
  try {
    const groups = await courseService.getGroupedCourses(params);
    const data = groups.flatMap((group) => group.items || []);
    const totalItems = groups.reduce((sum, group) => sum + (group.pagination?.totalItems || 0), 0);
    const totalPages = groups.reduce((max, group) => Math.max(max, group.pagination?.totalPages || 0), 0);

    return {
      data,
      pagination: {
        page: params.page || 1,
        limit: params.limit || 10,
        totalItems,
        totalPages,
        hasNextPage: groups.some((group) => group.pagination?.hasNextPage),
        hasPreviousPage: (params.page || 1) > 1,
      },
    };
  } catch (error) {
    const errorMessage = error?.message || 'Failed to fetch courses';
    toast.error(errorMessage);
    return rejectWithValue(errorMessage);
  }
});

export const createCourse = createAsyncThunk('courses/createCourse', async ({ courseData, imageFile }, { rejectWithValue }) => {
  try {
    const response = await courseService.createCourse(courseData, imageFile);
    return response;
  } catch (error) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to create course';
    toast.error(errorMessage);
    return rejectWithValue(errorMessage);
  }
});

export const updateCourse = createAsyncThunk('courses/updateCourse', async ({ id, courseData, imageFile }, { rejectWithValue }) => {
  try {
    const response = await courseService.updateCourse(id, courseData, imageFile);
    return response;
  } catch (error) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to update course';
    toast.error(errorMessage);
    return rejectWithValue(errorMessage);
  }
});

export const deleteCourse = createAsyncThunk('courses/deleteCourse', async (id, { rejectWithValue }) => {
  try {
    await courseService.deleteCourse(id);
    return id; // Return the ID of the deleted course
  } catch (error) {
    const errorMessage = error?.message || 'Failed to delete course';
    toast.error(errorMessage);
    return rejectWithValue(errorMessage);
  }
});

const courseSlice = createSlice({
  name: 'courses',
  initialState: {
    courses: [],
    pagination: null,
    loading: false,
    hasFetched: false,
    creating: false,
    updating: false,
    deleting: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch courses
      .addCase(fetchCourses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCourses.fulfilled, (state, action) => {
        state.loading = false;
        state.courses = action.payload?.data || [];
        state.pagination = action.payload?.pagination || null;
        state.hasFetched = true;
      })
      .addCase(fetchCourses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create course
      .addCase(createCourse.pending, (state) => {
        state.creating = true;
        state.error = null;
      })
      .addCase(createCourse.fulfilled, (state, action) => {
        state.creating = false;
        state.courses.unshift(action.payload); // Add new course to the beginning
      })
      .addCase(createCourse.rejected, (state, action) => {
        state.creating = false;
        state.error = action.payload;
      })
      // Update course
      .addCase(updateCourse.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(updateCourse.fulfilled, (state, action) => {
        state.updating = false;
        const index = state.courses.findIndex((course) => course.id === action.payload.id);
        if (index !== -1) {
          state.courses[index] = action.payload;
        }
      })
      .addCase(updateCourse.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload;
      })
      // Delete course
      .addCase(deleteCourse.pending, (state) => {
        state.deleting = true;
        state.error = null;
      })
      .addCase(deleteCourse.fulfilled, (state, action) => {
        state.deleting = false;
        state.courses = state.courses.filter((course) => course.id !== action.payload);
      })
      .addCase(deleteCourse.rejected, (state, action) => {
        state.deleting = false;
        state.error = action.payload;
      });
  },
});

export default courseSlice.reducer;


import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { aiForumService } from 'src/services/ai-forum.service';
import { toast } from 'src/components/snackbar';

export const fetchAiForumPosts = createAsyncThunk('aiForum/fetchPosts', async (_, { rejectWithValue }) => {
  try {
    const response = await aiForumService.getAllPosts();
    return response;
  } catch (error) {
    const errorMessage = error?.message || 'Failed to fetch posts';
    toast.error(errorMessage);
    return rejectWithValue(errorMessage);
  }
});

export const createAiForumPost = createAsyncThunk('aiForum/createPost', async (postData, { rejectWithValue }) => {
  try {
    const response = await aiForumService.createPost(postData);
    return response;
  } catch (error) {
    const errorMessage = error?.response?.data?.message || error?.message || 'Failed to create post';
    toast.error(errorMessage);
    return rejectWithValue(errorMessage);
  }
});

export const updateAiForumPost = createAsyncThunk(
  'aiForum/updatePost',
  async ({ id, postData }, { rejectWithValue }) => {
    try {
      const response = await aiForumService.updatePost(id, postData);
      return response;
    } catch (error) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to update post';
      toast.error(errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

export const deleteAiForumPost = createAsyncThunk('aiForum/deletePost', async (id, { rejectWithValue }) => {
  try {
    await aiForumService.deletePost(id);
    return id;
  } catch (error) {
    const errorMessage = error?.message || 'Failed to delete post';
    toast.error(errorMessage);
    return rejectWithValue(errorMessage);
  }
});

const aiForumSlice = createSlice({
  name: 'posts',
  initialState: {
    posts: [],
    loading: false,
    error: null,
  },
  reducers: {
    aiForumPostCreatedFromSocket: (state, action) => {
      const q = action.payload;
      if (q?.id && !state.posts.some((x) => x.id === q.id)) {
        state.posts.unshift(q);
      }
    },
    aiForumPostUpdatedFromSocket: (state, action) => {
      const q = action.payload;
      if (!q?.id) return;
      const i = state.posts.findIndex((x) => x.id === q.id);
      if (i !== -1) state.posts[i] = q;
    },
    aiForumPostDeletedFromSocket: (state, action) => {
      const id = action.payload;
      if (id) state.posts = state.posts.filter((q) => q.id !== id);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAiForumPosts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAiForumPosts.fulfilled, (state, action) => {
        state.loading = false;
        state.posts = action.payload;
      })
      .addCase(fetchAiForumPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createAiForumPost.fulfilled, (state, action) => {
        state.posts.unshift(action.payload);
      })
      .addCase(updateAiForumPost.fulfilled, (state, action) => {
        const index = state.posts.findIndex((q) => q.id === action.payload.id);
        if (index !== -1) {
          state.posts[index] = action.payload;
        }
      })
      .addCase(deleteAiForumPost.fulfilled, (state, action) => {
        state.posts = state.posts.filter((q) => q.id !== action.payload);
      });
  },
});

export const {
  aiForumPostCreatedFromSocket,
  aiForumPostUpdatedFromSocket,
  aiForumPostDeletedFromSocket,
} = aiForumSlice.actions;

export default aiForumSlice.reducer;



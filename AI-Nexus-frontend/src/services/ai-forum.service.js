import axios from 'src/utils/axios';
import {
  buildPaginationParams,
  mapPaginatedResponse,
} from 'src/utils/pagination-service';

// Transform backend post data to frontend format (exported for socket payloads / admin list)
export const transformAiForumPost = (post) => {
  const comments = post.comments || [];
  return {
    id: post._id || post.id,
    title: post.title || '',
    description: post.description || '',
    viewCount: post.viewCount || 0,
    comments: comments.map((c) => transformComment(c)),
    createdAt: post.createdAt || new Date(),
    updatedAt: post.updatedAt || new Date(),
    isPinned: post.isPinned || false,
    userId: post.userId ?? null,
  };
};

// Transform backend comment data to frontend format (exported for WebSocket payloads)
export const transformComment = (comment) => ({
  id: comment._id || comment.id,
  content: comment.content || '',
  userId: comment.userId || comment.user?.id,
  user: comment.user || null,
  postId: comment.postId || comment.post?.id,
  parentCommentId: comment.parentCommentId ?? null,
  createdAt: comment.createdAt || new Date(),
  updatedAt: comment.updatedAt || new Date(),
  likeCount: comment.likeCount ?? 0,
  likedByCurrentUser: comment.likedByCurrentUser ?? false,
});

// Build tree from flat comments
export function buildAiForumCommentTree(flatComments) {
  const list = flatComments || [];
  const byId = new Map(list.map((c) => [c.id, { ...c, replies: [] }]));
  const roots = [];
  const getParentId = (c) => c.parentCommentId ?? c.parent_comment_id ?? null;
  list.forEach((c) => {
    const node = byId.get(c.id);
    if (!node) return;
    const parentId = getParentId(c);
    if (!parentId) {
      roots.push(node);
    } else {
      const parent = byId.get(parentId);
      if (parent) parent.replies.push(node);
      else roots.push(node);
    }
  });
  roots.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  byId.forEach((node) => {
    node.replies.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  });
  return roots;
}

export const aiForumService = {
  async getAllPosts(params = {}) {
    try {
      const queryParams = buildPaginationParams(params);
      const response = await axios.get('/posts', { params: queryParams });
      return mapPaginatedResponse(response.data, transformAiForumPost, params);
    } catch (error) {
      console.error('Error fetching posts:', error);
      throw error;
    }
  },

  async getPostById(id) {
    try {
      const response = await axios.get(`/posts/${id}`);
      const post = response.data?.data || response.data;
      return transformAiForumPost(post);
    } catch (error) {
      console.error('Error fetching post:', error);
      throw error;
    }
  },

  async incrementViewCount(id) {
    try {
      const response = await axios.post(`/posts/${id}/view`);
      const post = response.data?.data || response.data;
      return transformAiForumPost(post);
    } catch (error) {
      console.error('Error incrementing view count:', error);
      throw error;
    }
  },

  async createPost(postData) {
    try {
      const response = await axios.post('/posts', postData);
      const post = response.data?.post || response.data?.data || response.data;
      return transformAiForumPost(post);
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  },

  async updatePost(id, postData) {
    try {
      const response = await axios.put(`/posts/update/${id}`, postData);
      const post = response.data?.post || response.data?.data || response.data;
      return transformAiForumPost(post);
    } catch (error) {
      console.error('Error updating post:', error);
      throw error;
    }
  },

  async deletePost(id) {
    try {
      const response = await axios.delete(`/posts/delete/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting post:', error);
      throw error;
    }
  },

  async deleteOwnPost(id) {
    try {
      const response = await axios.delete(`/posts/mine/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting own post:', error);
      throw error;
    }
  },

  async bulkDeleteOwnPosts(ids) {
    try {
      const response = await axios.post('/posts/mine/bulk-delete', { ids });
      return response.data;
    } catch (error) {
      console.error('Error bulk deleting own posts:', error);
      throw error;
    }
  },

  async addComment(postId, commentData) {
    try {
      const response = await axios.post(`/posts/${postId}/comments`, commentData);
      const comment = response.data?.comment || response.data?.data || response.data;
      return transformComment(comment);
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  },

  async getComments(postId) {
    try {
      const response = await axios.get(`/posts/${postId}/comments`);
      const comments = response.data?.data || response.data || [];
      return comments.map(transformComment);
    } catch (error) {
      console.error('Error fetching comments:', error);
      throw error;
    }
  },

  async updateComment(commentId, commentData) {
    try {
      const response = await axios.put(`/posts/comments/update/${commentId}`, commentData);
      const comment = response.data?.comment || response.data?.data || response.data;
      return transformComment(comment);
    } catch (error) {
      console.error('Error updating comment:', error);
      throw error;
    }
  },

  async deleteComment(commentId) {
    try {
      const response = await axios.delete(`/posts/comments/delete/${commentId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw error;
    }
  },

  async toggleCommentLike(commentId) {
    try {
      const response = await axios.post(`/posts/comments/${commentId}/toggle-like`);
      return response.data;
    } catch (error) {
      console.error('Error toggling comment like:', error);
      throw error;
    }
  },

  async pinPost(id) {
    try {
      const response = await axios.post(`/posts/${id}/pin`);
      return response.data;
    } catch (error) {
      console.error('Error pinning post:', error);
      throw error;
    }
  },

  async unpinPost(id) {
    try {
      const response = await axios.delete(`/posts/${id}/pin`);
      return response.data;
    } catch (error) {
      console.error('Error unpinning post:', error);
      throw error;
    }
  },

  async togglePinPost(id) {
    try {
      const response = await axios.post(`/posts/${id}/toggle-pin`);
      return response.data;
    } catch (error) {
      console.error('Error toggling pin post:', error);
      throw error;
    }
  },
};






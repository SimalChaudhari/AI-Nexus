import axios from 'src/utils/axios';
import { CONFIG } from 'src/config-global';
import {
  buildPaginationParams,
  mapPaginatedResponse,
} from 'src/utils/pagination-service';

function getServerOrigin() {
  const base = String(CONFIG.site.serverUrl || '').trim();
  return base.replace(/\/api\/?$/, '');
}

function resolveUploadUrl(url) {
  const value = String(url || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/uploads/')) return `${getServerOrigin()}${value}`;
  return value;
}

// Transform backend announcement data to frontend format
const transformAnnouncement = (announcement) => ({
  id: announcement._id || announcement.id,
  title: announcement.title || '',
  description: announcement.description || '',
  viewCount: announcement.viewCount || 0,
  comments: announcement.comments || [],
  createdBy: announcement.createdBy
    ? {
        id: announcement.createdBy.id,
        firstname: announcement.createdBy.firstname || '',
        lastname: announcement.createdBy.lastname || '',
        username: announcement.createdBy.username || '',
        email: announcement.createdBy.email || '',
      }
    : null,
  createdAt: announcement.createdAt || new Date(),
  updatedAt: announcement.updatedAt || new Date(),
  isPinned: announcement.isPinned || false, // Preserve pinned status from API
});

// Transform backend comment data to frontend format (exported for WebSocket payloads)
export const transformComment = (comment) => ({
  id: comment._id || comment.id,
  content: comment.content || '',
  userId: comment.userId || comment.user?.id,
  user: comment.user || null,
  announcementId: comment.announcementId || comment.announcement?.id,
  parentCommentId: comment.parentCommentId ?? null,
  createdAt: comment.createdAt || new Date(),
  updatedAt: comment.updatedAt || new Date(),
  likeCount: comment.likeCount ?? 0,
  likedByCurrentUser: comment.likedByCurrentUser ?? false,
});

/** Build tree from flat announcement comments (for display with replies). */
export function buildAnnouncementCommentTree(flatComments) {
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

export const announcementService = {
  async getAllAnnouncements(params = {}) {
    try {
      const queryParams = buildPaginationParams(params);
      const response = await axios.get('/announcements', { params: queryParams });
      return mapPaginatedResponse(response.data, transformAnnouncement, params);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      throw error;
    }
  },

  async getAnnouncementById(id) {
    try {
      const response = await axios.get(`/announcements/${id}`);
      const announcement = response.data?.data || response.data;
      return transformAnnouncement(announcement);
    } catch (error) {
      console.error('Error fetching announcement:', error);
      throw error;
    }
  },

  async incrementViewCount(id) {
    try {
      const response = await axios.post(`/announcements/${id}/view`);
      const announcement = response.data?.data || response.data;
      return transformAnnouncement(announcement);
    } catch (error) {
      console.error('Error incrementing view count:', error);
      throw error;
    }
  },

  async createAnnouncement(announcementData) {
    try {
      const response = await axios.post('/announcements', announcementData);
      const announcement = response.data?.announcement || response.data?.data || response.data;
      return transformAnnouncement(announcement);
    } catch (error) {
      console.error('Error creating announcement:', error);
      throw error;
    }
  },

  async updateAnnouncement(id, announcementData) {
    try {
      const response = await axios.put(`/announcements/update/${id}`, announcementData);
      const announcement = response.data?.announcement || response.data?.data || response.data;
      return transformAnnouncement(announcement);
    } catch (error) {
      console.error('Error updating announcement:', error);
      throw error;
    }
  },

  async deleteAnnouncement(id) {
    try {
      const response = await axios.delete(`/announcements/delete/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting announcement:', error);
      throw error;
    }
  },

  async addComment(announcementId, commentData) {
    try {
      const response = await axios.post(`/announcements/${announcementId}/comments`, commentData);
      const comment = response.data?.comment || response.data?.data || response.data;
      return transformComment(comment);
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  },

  async getComments(announcementId) {
    try {
      const response = await axios.get(`/announcements/${announcementId}/comments`);
      const comments = response.data?.data || response.data || [];
      return comments.map(transformComment);
    } catch (error) {
      console.error('Error fetching comments:', error);
      throw error;
    }
  },

  async updateComment(commentId, commentData) {
    try {
      const response = await axios.put(`/announcements/comments/update/${commentId}`, commentData);
      const comment = response.data?.comment || response.data?.data || response.data;
      return transformComment(comment);
    } catch (error) {
      console.error('Error updating comment:', error);
      throw error;
    }
  },

  async deleteComment(commentId) {
    try {
      const response = await axios.delete(`/announcements/comments/delete/${commentId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw error;
    }
  },

  async toggleCommentLike(commentId) {
    try {
      const response = await axios.post(`/announcements/comments/${commentId}/toggle-like`);
      return response.data;
    } catch (error) {
      console.error('Error toggling comment like:', error);
      throw error;
    }
  },

  async pinAnnouncement(id) {
    try {
      const response = await axios.post(`/announcements/${id}/pin`);
      return response.data;
    } catch (error) {
      console.error('Error pinning announcement:', error);
      throw error;
    }
  },

  async unpinAnnouncement(id) {
    try {
      const response = await axios.delete(`/announcements/${id}/pin`);
      return response.data;
    } catch (error) {
      console.error('Error unpinning announcement:', error);
      throw error;
    }
  },

  async togglePinAnnouncement(id) {
    try {
      const response = await axios.post(`/announcements/${id}/toggle-pin`);
      return response.data;
    } catch (error) {
      console.error('Error toggling pin announcement:', error);
      throw error;
    }
  },

  async uploadAnnouncementMedia(file) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await axios.post('/announcements/upload-media', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return resolveUploadUrl(response.data?.url || '');
    } catch (error) {
      console.error('Error uploading announcement media:', error);
      throw error;
    }
  },
};

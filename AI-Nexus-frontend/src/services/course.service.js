import axios from 'src/utils/axios';
import { resolveAssetUrl } from 'src/utils/asset-url';
import { STORAGE_KEY } from 'src/auth/context/jwt/constant';
import {
  buildPaginationParams,
  mapPaginatedResponse,
} from 'src/utils/pagination-service';

const isUuid = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || '')
  );

// Transform backend course data to frontend format
const transformCourse = (course) => {
  const raw = course._id || course.id;
  const amount = course.amount != null ? Number(course.amount) : 0;
  return {
    id: raw,
    title: course.title || '',
    description: course.description || '',
    image: resolveAssetUrl(course.image || ''),
    freeOrPaid: course.freeOrPaid ?? false,
    amount,
    level: course.level || 'Beginner',
    languageIds: Array.isArray(course.languageIds) ? course.languageIds : [],
    speakerIds: Array.isArray(course.speakerIds) ? course.speakerIds : [],
    marketData: course.marketData || '',
    isFavorite: course.isFavorite ?? false,
    isEnrolled: course.isEnrolled ?? false,
    createdAt: course.createdAt || new Date(),
    updatedAt: course.updatedAt || new Date(),
    sectionProgressBySectionId:
      course.sectionProgressBySectionId && typeof course.sectionProgressBySectionId === 'object'
        ? course.sectionProgressBySectionId
        : undefined,
  };
};

export const courseService = {
  async getGroupedCourses(params = {}) {
    try {
      const queryParams = buildPaginationParams(params);
      const response = await axios.get('/courses/grouped/list', { params: queryParams });
      const groups = response.data?.data?.groups || [];

      return groups.map((group) => ({
        ...group,
        items: (group.items || []).map(transformCourse),
      }));
    } catch (error) {
      console.error('Error fetching grouped courses:', error);
      throw error;
    }
  },

  async getCourseGroups() {
    const response = await axios.get('/courses/groups');
    return response.data?.data || [];
  },

  async createCourseGroup(name) {
    const response = await axios.post('/courses/groups', { name });
    return response.data?.data;
  },

  async getAllCourses(params = {}) {
    try {
      const queryParams = buildPaginationParams(params);
      const response = await axios.get('/courses', { params: queryParams });
      return mapPaginatedResponse(response.data, transformCourse, params);
    } catch (error) {
      console.error('Error fetching courses:', error);
      throw error;
    }
  },

  async getCourseById(id) {
    try {
      const response = await axios.get(`/courses/${id}`);
      const course = response.data?.data || response.data;
      return transformCourse(course);
    } catch (error) {
      console.error('Error fetching course:', error);
      throw error;
    }
  },

  // Player context: full payload for learning player (course, enrollment, modules with sections & progress)
  async getCoursePlayerContext(courseId) {
    try {
      const response = await axios.get(`/courses/${courseId}/player-context`);
      const payload = response.data?.data || response.data || {};
      const baseCourse = payload.course ? transformCourse(payload.course) : null;
      const enrolled = Boolean(payload.enrolled);
      const rawModules = Array.isArray(payload.modules) ? payload.modules : [];
      const sectionProgressBySectionId =
        payload.sectionProgressBySectionId && typeof payload.sectionProgressBySectionId === 'object'
          ? payload.sectionProgressBySectionId
          : undefined;

      const modules = rawModules.map((m) => ({
        id: m.id,
        courseId: m.courseId,
        sortOrder: m.sortOrder != null ? Number(m.sortOrder) : 0,
        title: m.title || '',
        description: m.description || '',
        sections: (m.sections || []).map((s) => ({
          id: s.id,
          moduleId: s.moduleId,
          sortOrder: s.sortOrder != null ? Number(s.sortOrder) : 0,
          title: s.title || '',
          videoUrl: s.videoUrl || '',
          description: s.description || '',
          content: s.content || '',
          watchtime: s.watchtime || '',
          images: Array.isArray(s.images) ? s.images.map((url) => resolveAssetUrl(url)) : [],
          attachments: Array.isArray(s.attachments)
            ? s.attachments.map((url) => resolveAssetUrl(url))
            : [],
          sectionProgress:
            s.sectionProgress && typeof s.sectionProgress === 'object' ? s.sectionProgress : null,
        })),
      }));

      return {
        course: baseCourse,
        enrolled,
        modules,
        sectionProgressBySectionId,
      };
    } catch (error) {
      console.error('Error fetching course player context:', error);
      throw error;
    }
  },

  async createCourse(courseData, imageFile = null) {
    try {
      const formData = new FormData();

      formData.append('title', courseData.title || '');
      if (courseData.description) {
        formData.append('description', courseData.description);
      }
      if (courseData.freeOrPaid !== undefined) {
        formData.append('freeOrPaid', courseData.freeOrPaid);
      }
      if (courseData.amount !== undefined) {
        formData.append('amount', courseData.amount.toString());
      }
      if (courseData.level) {
        formData.append('level', courseData.level);
      }
      if (Array.isArray(courseData.languageIds) && courseData.languageIds.length > 0) {
        formData.append('languageIds', JSON.stringify(courseData.languageIds));
      }
      if (Array.isArray(courseData.speakerIds) && courseData.speakerIds.length > 0) {
        formData.append('speakerIds', JSON.stringify(courseData.speakerIds));
      }
      if (courseData.marketData && typeof courseData.marketData === 'string') {
        formData.append('marketData', courseData.marketData);
      }
      if (Array.isArray(courseData.modules) && courseData.modules.length > 0) {
        formData.append('modules', JSON.stringify(courseData.modules));
      }

      if (imageFile instanceof File) {
        formData.append('image', imageFile);
      }

      // Let axios set Content-Type (multipart/form-data with boundary) when body is FormData
      const response = await axios.post('/courses', formData);
      const course = response.data?.course || response.data?.data || response.data;
      const transformed = transformCourse(course);
      // If backend didn't create modules (e.g. multipart body issue), create them via API
      if (course?.id && Array.isArray(courseData.modules) && courseData.modules.length > 0) {
        const existing = await this.getCourseModulesWithSections(course.id).catch(() => []);
        if (!existing?.length) {
          await this.createModulesAndSectionsForCourse(course.id, courseData.modules).catch((err) => {
            console.error('Fallback: create modules/sections after course:', err);
          });
        }
      }
      return transformed;
    } catch (error) {
      console.error('Error creating course:', error);
      throw error;
    }
  },

  /**
   * Create modules and sections for a course via API (used when single-request payload may not have been applied).
   * @param {string} courseId
   * @param {Array<{ title: string, description?: string, sortOrder?: number, sections?: Array<{ title: string, videoUrl?: string, description?: string, content?: string, watchtime?: string, images?: string[], attachments?: string[], sortOrder?: number }> }>} modules
   */
  async createModulesAndSectionsForCourse(courseId, modules) {
    if (!courseId || !Array.isArray(modules) || modules.length === 0) return;
    await modules.reduce(
      (promise, mod) =>
        promise.then(async () => {
          const created = await this.createCourseModule(courseId, {
            title: mod.title || 'Untitled module',
            description: mod.description,
            sortOrder: mod.sortOrder,
          });
          const { sections = [] } = mod;
          if (sections.length > 0) {
            await sections.reduce(
              (secPromise, sec) =>
                secPromise.then(() =>
                  this.createModuleSection(courseId, created.id, {
                    title: sec.title || 'Untitled section',
                    videoUrl: sec.videoUrl,
                    description: sec.description,
                    content: sec.content,
                    watchtime: sec.watchtime,
                    images: sec.images,
                    attachments: sec.attachments,
                    sortOrder: sec.sortOrder,
                  })
                ),
              Promise.resolve()
            );
          }
        }),
      Promise.resolve()
    );
  },

  async updateCourse(id, courseData, imageFile = null) {
    try {
      const formData = new FormData();

      if (courseData.title !== undefined) {
        formData.append('title', courseData.title);
      }
      if (courseData.description !== undefined) {
        formData.append('description', courseData.description);
      }
      if (courseData.freeOrPaid !== undefined) {
        formData.append('freeOrPaid', courseData.freeOrPaid);
      }
      if (courseData.amount !== undefined) {
        formData.append('amount', courseData.amount.toString());
      }
      if (courseData.level !== undefined) {
        formData.append('level', courseData.level);
      }
      if (courseData.languageIds !== undefined) {
        formData.append('languageIds', JSON.stringify(Array.isArray(courseData.languageIds) ? courseData.languageIds : []));
      }
      if (courseData.speakerIds !== undefined) {
        formData.append('speakerIds', JSON.stringify(Array.isArray(courseData.speakerIds) ? courseData.speakerIds : []));
      }
      if (courseData.marketData !== undefined) {
        formData.append('marketData', typeof courseData.marketData === 'string' ? courseData.marketData : '');
      }

      // Only send image when actually uploading/replacing a file.
      // Image deletion is handled via DELETE /courses/:id/image, not through this endpoint.
      if (imageFile instanceof File) {
        formData.append('image', imageFile);
      }

      const response = await axios.put(`/courses/update/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      const course = response.data?.course || response.data?.data || response.data;
      return transformCourse(course);
    } catch (error) {
      console.error('Error updating course:', error);
      throw error;
    }
  },

  async deleteCourseImage(id) {
    try {
      const response = await axios.delete(`/courses/${id}/image`);
      const course = response.data?.course || response.data?.data || response.data;
      return transformCourse(course);
    } catch (error) {
      console.error('Error deleting course image:', error);
      throw error;
    }
  },

  async deleteCourse(id) {
    try {
      const response = await axios.delete(`/courses/delete/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting course:', error);
      throw error;
    }
  },

  // Course modules (chapters/lessons with video per module)
  async getCourseModules(courseId) {
    try {
      const response = await axios.get(`/courses/${courseId}/modules`);
      const list = response.data?.data || response.data || [];
      return list.map((m) => ({
        id: m.id,
        courseId: m.courseId,
        sortOrder: m.sortOrder != null ? Number(m.sortOrder) : 0,
        title: m.title || '',
        description: m.description || '',
      }));
    } catch (error) {
      console.error('Error fetching course modules:', error);
      throw error;
    }
  },

  async createCourseModule(courseId, data) {
    try {
      const response = await axios.post(`/courses/${courseId}/modules`, {
        title: data.title,
        description: data.description || undefined,
        sortOrder: data.sortOrder,
      });
      const m = response.data?.data || response.data;
      return {
        id: m.id,
        courseId: m.courseId,
        sortOrder: m.sortOrder != null ? Number(m.sortOrder) : 0,
        title: m.title || '',
        description: m.description || '',
      };
    } catch (error) {
      console.error('Error creating course module:', error);
      throw error;
    }
  },

  async updateCourseModule(id, data) {
    try {
      const response = await axios.put(`/courses/modules/${id}`, {
        title: data.title,
        description: data.description !== undefined ? data.description : undefined,
        sortOrder: data.sortOrder,
      });
      const m = response.data?.data || response.data;
      return {
        id: m.id,
        courseId: m.courseId,
        sortOrder: m.sortOrder != null ? Number(m.sortOrder) : 0,
        title: m.title || '',
        description: m.description || '',
      };
    } catch (error) {
      console.error('Error updating course module:', error);
      throw error;
    }
  },

  async deleteCourseModule(id) {
    try {
      const response = await axios.delete(`/courses/modules/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting course module:', error);
      throw error;
    }
  },

  // Modules with nested sections (for learning player)
  async getCourseModulesWithSections(courseId) {
    try {
      const response = await axios.get(`/courses/${courseId}/modules/with-sections`);
      const list = response.data?.data || response.data || [];
      return list.map((m) => ({
        id: m.id,
        courseId: m.courseId,
        sortOrder: m.sortOrder != null ? Number(m.sortOrder) : 0,
        title: m.title || '',
        description: m.description || '',
        sections: (m.sections || []).map((s) => ({
          id: s.id,
          moduleId: s.moduleId,
          sortOrder: s.sortOrder != null ? Number(s.sortOrder) : 0,
          title: s.title || '',
          videoUrl: s.videoUrl || '',
          description: s.description || '',
          content: s.content || '',
          watchtime: s.watchtime || '',
          images: Array.isArray(s.images) ? s.images.map((url) => resolveAssetUrl(url)) : [],
          attachments: Array.isArray(s.attachments)
            ? s.attachments.map((url) => resolveAssetUrl(url))
            : [],
          sectionProgress:
            s.sectionProgress && typeof s.sectionProgress === 'object' ? s.sectionProgress : null,
        })),
      }));
    } catch (error) {
      console.error('Error fetching course modules with sections:', error);
      throw error;
    }
  },

  async getSectionProgress(courseId, sectionId) {
    if (!isUuid(sectionId)) return null;
    try {
      const response = await axios.get(`/courses/${courseId}/sections/${sectionId}/progress`);
      return response.data?.data ?? response.data ?? null;
    } catch (error) {
      if (error?.response?.status === 401) return null;
      console.error('Error fetching section progress:', error);
      return null;
    }
  },

  async updateSectionProgress(courseId, sectionId, payload = {}) {
    if (!isUuid(sectionId)) return null;
    try {
      const response = await axios.put(`/courses/${courseId}/sections/${sectionId}/progress`, payload);
      return response.data?.data ?? response.data ?? null;
    } catch (error) {
      console.error('Error updating section progress:', error);
      throw error;
    }
  },

  // Use keepalive request for unload/refresh/logout transitions.
  updateSectionProgressOnUnload(courseId, sectionId, payload = {}) {
    try {
      if (!isUuid(sectionId)) return;
      const baseURL = axios?.defaults?.baseURL || '';
      const token = sessionStorage.getItem(STORAGE_KEY);
      if (!baseURL || !token || !courseId || !sectionId) return;
      fetch(`${baseURL}/courses/${courseId}/sections/${sectionId}/progress`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload || {}),
        keepalive: true,
      }).catch(() => {});
    } catch {
      // ignore keepalive errors
    }
  },

  async getModuleSections(courseId, moduleId) {
    try {
      const response = await axios.get(`/courses/${courseId}/modules/${moduleId}/sections`);
      const list = response.data?.data || response.data || [];
      return list.map((s) => ({
        id: s.id,
        moduleId: s.moduleId,
        sortOrder: s.sortOrder != null ? Number(s.sortOrder) : 0,
        title: s.title || '',
        videoUrl: s.videoUrl || '',
        description: s.description || '',
        content: s.content || '',
        watchtime: s.watchtime || '',
        images: Array.isArray(s.images) ? s.images.map((url) => resolveAssetUrl(url)) : [],
        attachments: Array.isArray(s.attachments)
          ? s.attachments.map((url) => resolveAssetUrl(url))
          : [],
      }));
    } catch (error) {
      console.error('Error fetching module sections:', error);
      throw error;
    }
  },

  async uploadSectionImages(files) {
    if (!files?.length) return [];
    const formData = new FormData();
    Array.from(files).forEach((file, i) => {
      formData.append('images', file);
    });
    const response = await axios.post('/courses/modules/sections/upload-images', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const urls = response.data?.data?.urls || response.data?.urls || [];
    return urls.map((url) => resolveAssetUrl(url));
  },

  async uploadCourseEditorMedia(file) {
    if (!file) return '';
    const urls = await this.uploadSectionImages([file]);
    return urls[0] || '';
  },

  async uploadSectionVideo(file, onProgress) {
    if (!file) return '';
    const formData = new FormData();
    formData.append('video', file);
    const response = await axios.post('/courses/modules/sections/upload-video', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event) => {
        if (!event?.total) return;
        const percent = Math.round((event.loaded * 100) / event.total);
        if (onProgress) onProgress(percent);
      },
    });
    const url = response.data?.data?.url || response.data?.url || '';
    return resolveAssetUrl(url);
  },

  async uploadSectionFiles(files) {
    if (!files?.length) return [];
    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append('files', file);
    });
    const response = await axios.post('/courses/modules/sections/upload-files', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const urls = response.data?.data?.urls || response.data?.urls || [];
    return urls.map((url) => resolveAssetUrl(url));
  },

  async createModuleSection(courseId, moduleId, data) {
    try {
      const response = await axios.post(`/courses/${courseId}/modules/${moduleId}/sections`, {
        title: data.title,
        videoUrl: data.videoUrl || undefined,
        description: data.description || undefined,
        content: data.content || undefined,
        watchtime: data.watchtime !== undefined ? data.watchtime : undefined,
        images: Array.isArray(data.images) && data.images.length > 0 ? data.images : undefined,
        attachments:
          Array.isArray(data.attachments) && data.attachments.length > 0
            ? data.attachments
            : undefined,
        sortOrder: data.sortOrder,
      });
      const s = response.data?.data || response.data;
      return {
        id: s.id,
        moduleId: s.moduleId,
        sortOrder: s.sortOrder != null ? Number(s.sortOrder) : 0,
        title: s.title || '',
        videoUrl: s.videoUrl || '',
        description: s.description || '',
        content: s.content || '',
        watchtime: s.watchtime || '',
        images: Array.isArray(s.images) ? s.images.map((url) => resolveAssetUrl(url)) : [],
        attachments: Array.isArray(s.attachments)
          ? s.attachments.map((url) => resolveAssetUrl(url))
          : [],
      };
    } catch (error) {
      console.error('Error creating module section:', error);
      throw error;
    }
  },

  async updateModuleSection(id, data) {
    try {
      const response = await axios.put(`/courses/modules/sections/${id}`, {
        title: data.title,
        videoUrl: data.videoUrl !== undefined ? data.videoUrl : undefined,
        description: data.description !== undefined ? data.description : undefined,
        content: data.content !== undefined ? data.content : undefined,
        watchtime: data.watchtime !== undefined ? data.watchtime : null,
        images: data.images !== undefined ? data.images : undefined,
        attachments: data.attachments !== undefined ? data.attachments : undefined,
        sortOrder: data.sortOrder,
      });
      const s = response.data?.data || response.data;
      return {
        id: s.id,
        moduleId: s.moduleId,
        sortOrder: s.sortOrder != null ? Number(s.sortOrder) : 0,
        title: s.title || '',
        videoUrl: s.videoUrl || '',
        description: s.description || '',
        content: s.content || '',
        watchtime: s.watchtime || '',
        images: Array.isArray(s.images) ? s.images.map((url) => resolveAssetUrl(url)) : [],
        attachments: Array.isArray(s.attachments)
          ? s.attachments.map((url) => resolveAssetUrl(url))
          : [],
      };
    } catch (error) {
      console.error('Error updating module section:', error);
      throw error;
    }
  },

  async deleteModuleSection(id) {
    try {
      const response = await axios.delete(`/courses/modules/sections/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting module section:', error);
      throw error;
    }
  },

  // Course favorites
  async toggleCourseFavorite(courseId) {
    try {
      const response = await axios.post(`/courses/${courseId}/favorite`);
      return response.data?.data ?? response.data;
    } catch (error) {
      console.error('Error toggling course favorite:', error);
      throw error;
    }
  },

  async getCourseFavoriteStatus(courseId) {
    try {
      const response = await axios.get(`/courses/${courseId}/favorite-status`);
      return response.data?.data ?? response.data;
    } catch (error) {
      if (error?.response?.status === 401) return { isFavorite: false };
      console.error('Error fetching course favorite status:', error);
      return { isFavorite: false };
    }
  },

  /** Favorite courses + favorite sections in one request (Favorites page). */
  async getFavoritesAll() {
    try {
      const response = await axios.get('/courses/favorites/all');
      const payload = response.data?.data ?? response.data ?? {};
      const courses = Array.isArray(payload.courses) ? payload.courses.map(transformCourse) : [];
      const favoriteSections = Array.isArray(payload.favoriteSections) ? payload.favoriteSections : [];
      return { courses, favoriteSections };
    } catch (error) {
      if (error?.response?.status === 401) return { courses: [], favoriteSections: [] };
      console.error('Error fetching favorites (all):', error);
      return { courses: [], favoriteSections: [] };
    }
  },

  // Section (Lesson) Favorites
  async toggleSectionFavorite(sectionId) {
    try {
      const response = await axios.post(`/courses/sections/${sectionId}/favorite`);
      return response.data?.data ?? response.data;
    } catch (error) {
      console.error('Error toggling section favorite:', error);
      throw error;
    }
  },

  async getSectionFavoriteStatus(sectionId) {
    try {
      const response = await axios.get(`/courses/sections/${sectionId}/favorite-status`);
      return response.data?.data ?? response.data;
    } catch (error) {
      if (error?.response?.status === 401) return { isFavorite: false };
      console.error('Error fetching section favorite status:', error);
      return { isFavorite: false };
    }
  },

  // Course enrollment (purchased / has access)
  async getCourseEnrolled(courseId) {
    try {
      const response = await axios.get(`/courses/${courseId}/enrolled`);
      return response.data?.data?.enrolled ?? false;
    } catch (error) {
      if (error?.response?.status === 401) return false;
      console.error('Error fetching course enrolled status:', error);
      return false;
    }
  },

  async getEnrolledCourseIds() {
    try {
      const response = await axios.get('/courses/enrolled/list');
      const list = response.data?.data?.courseIds;
      return Array.isArray(list) ? list : [];
    } catch (error) {
      if (error?.response?.status === 401) return [];
      console.error('Error fetching enrolled course IDs:', error);
      return [];
    }
  },

  async enrollCourse(courseId) {
    try {
      await axios.post(`/courses/${courseId}/enroll`);
      return true;
    } catch (error) {
      console.error('Error enrolling in course:', error);
      throw error;
    }
  },

  async enrollCourses(courseIds) {
    try {
      await axios.post('/courses/enroll/bulk', { courseIds: Array.isArray(courseIds) ? courseIds : [] });
      return true;
    } catch (error) {
      console.error('Error enrolling in courses:', error);
      throw error;
    }
  },
};

import axios from 'src/utils/axios';
import { resolveAssetUrl } from 'src/utils/asset-url';
import {
  buildPaginationParams,
  mapPaginatedResponse,
} from 'src/utils/pagination-service';
import { formatCourseDurationLabel } from 'src/utils/course-duration';

const isUuid = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || '')
  );
const normalizeId = (entity) => entity?.id || entity?._id || '';

const transformSection = (s) => ({
  id: normalizeId(s),
  moduleId: s.moduleId || s.module_id || '',
  sortOrder: s.sortOrder != null ? Number(s.sortOrder) : 0,
  title: s.title || '',
  subtitle: s.subtitle || '',
  videoUrl: s.videoUrl || '',
  description: s.description || '',
  content: s.content || '',
  watchtime: s.watchtime || '',
  durationTime: s.durationTime || '',
  images: Array.isArray(s.images) ? s.images.map((url) => resolveAssetUrl(url)) : [],
  attachments: Array.isArray(s.attachments)
    ? s.attachments.map((url) => resolveAssetUrl(url))
    : [],
  learningMaterials: Array.isArray(s.learningMaterials)
    ? s.learningMaterials.map((url) => resolveAssetUrl(url))
    : [],
  sectionProgress:
    s.sectionProgress && typeof s.sectionProgress === 'object' ? s.sectionProgress : null,
});

// Transform backend course data to frontend format
const transformSpeakers = (speakers) => {
  if (!Array.isArray(speakers)) return [];
  return speakers.map((s) => ({
    id: s.id,
    name: s.name || '',
    profileimage: resolveAssetUrl(s.profileimage || ''),
    about: s.about || '',
  }));
};

const transformCourse = (course) => {
  const raw = course._id || course.id;
  const amount = course.amount != null ? Number(course.amount) : 0;
  const languages = Array.isArray(course.languages)
    ? course.languages.map((l) => ({
        id: l?.id || '',
        name: l?.name || l?.title || '',
      }))
    : [];
  const languageIds = Array.isArray(course.languageIds)
    ? course.languageIds
    : languages.map((l) => l.id).filter(Boolean);
  const speakers = transformSpeakers(course.speakers);
  const speakerIds = Array.isArray(course.speakerIds)
    ? course.speakerIds
    : speakers.map((s) => s.id).filter(Boolean);
  const relatedCourses = Array.isArray(course.relatedCourses)
    ? course.relatedCourses.map((rel) => ({
        id: rel?.id || '',
        title: rel?.title || '',
        image: resolveAssetUrl(rel?.image || ''),
        level: rel?.level || 'Beginner',
        freeOrPaid: rel?.freeOrPaid ?? false,
        amount: rel?.amount != null ? Number(rel.amount) : 0,
        isBundle: rel?.isBundle ?? false,
        bundleCourseIds: Array.isArray(rel?.bundleCourseIds) ? rel.bundleCourseIds : [],
        isRecommended: rel?.isRecommended ?? false,
        isFavorite: rel?.isFavorite ?? false,
        isEnrolled: rel?.isEnrolled ?? false,
        accessViaBundle: rel?.accessViaBundle ?? false,
        modulesCount: Number(rel?.modulesCount ?? rel?.moduleCount ?? 0),
        sectionsCount: Number(rel?.sectionsCount ?? rel?.sectionCount ?? 0),
        totalDurationSeconds: Number(rel?.totalDurationSeconds ?? 0),
        totalDuration: String(rel?.totalDuration || '').trim(),
        reviewStats:
          rel?.reviewStats && typeof rel.reviewStats === 'object'
            ? {
                averageRating: Number(rel.reviewStats.averageRating || 0),
                reviewCount: Number(rel.reviewStats.reviewCount || 0),
              }
            : { averageRating: 0, reviewCount: 0 },
      }))
    : [];
  const reviewStatsRaw = course.reviewStats && typeof course.reviewStats === 'object' ? course.reviewStats : {};
  const reviewStats = {
    averageRating: Number(reviewStatsRaw.averageRating || 0),
    reviewCount: Number(reviewStatsRaw.reviewCount || 0),
  };
  const reviews = Array.isArray(course.reviews) ? course.reviews : [];
  return {
    id: raw,
    title: course.title || '',
    description: course.description || '',
    image: resolveAssetUrl(course.image || ''),
    freeOrPaid: course.freeOrPaid ?? false,
    amount,
    level: course.level || 'Beginner',
    categoryId: course.categoryId || course.category?.id || null,
    category: course.category
      ? {
          id: course.category.id || '',
          title: course.category.title || '',
          slug: course.category.slug || '',
          image: resolveAssetUrl(course.category.image || ''),
          description: course.category.description || '',
          status: course.category.status || '',
          icon: course.category.icon || '',
        }
      : null,
    roles: Array.isArray(course.roles) ? course.roles : [],
    aiLevel: Array.isArray(course.aiLevel) ? course.aiLevel : [],
    goals: Array.isArray(course.goals) ? course.goals : [],
    useAreas: Array.isArray(course.useAreas) ? course.useAreas : [],
    languageIds,
    languages,
    speakerIds,
    /** Populated on GET /courses/:id and player-context — avoids separate GET /speakers */
    speakers,
    marketData: course.marketData || '',
    isBundle: course.isBundle ?? false,
    bundleCourseIds: Array.isArray(course.bundleCourseIds) ? course.bundleCourseIds : [],
    isRecommended: course.isRecommended ?? false,
    isFavorite: course.isFavorite ?? false,
    isEnrolled: course.isEnrolled ?? false,
    modulesCount: Number(course.modulesCount ?? course.moduleCount ?? 0),
    sectionsCount: Number(course.sectionsCount ?? course.sectionCount ?? course.lessonCount ?? 0),
    totalDurationSeconds: Number(course.totalDurationSeconds ?? 0),
    totalDuration:
      String(course.totalDuration || '').trim() ||
      formatCourseDurationLabel(Number(course.totalDurationSeconds ?? 0)),
    /** True when access comes only from owning a bundle (not a direct enrollment row). */
    accessViaBundle: course.accessViaBundle ?? false,
    relatedCourses,
    reviewStats,
    reviews,
    createdAt: course.createdAt || new Date(),
    updatedAt: course.updatedAt || new Date(),
  };
};

export const courseService = {
  async getGroupedCourses(params = {}) {
    try {
      const queryParams = buildPaginationParams(params);
      const response = await axios.get('/courses/grouped/list', { params: queryParams });
      const groups = response.data?.data?.groups || [];

      return {
        groups: groups.map((group) => ({
          ...group,
          items: (group.items || []).map(transformCourse),
        })),
      };
    } catch (error) {
      console.error('Error fetching grouped courses:', error);
      throw error;
    }
  },

  async getCourseGroups() {
    const response = await axios.get('/courses/groups');
    return response.data?.data || [];
  },

  async getCourseFormOptions() {
    const response = await axios.get('/courses/form-options');
    return response.data?.data || {
      levels: [],
      roles: [],
      aiLevels: [],
      goals: [],
      useAreas: [],
    };
  },

  async getCourseOptions(type) {
    const response = await axios.get('/courses/options', { params: { type } });
    return response.data?.data || [];
  },

  async createCourseOption(type, label) {
    const response = await axios.post('/courses/options', { type, label });
    return response.data?.data || null;
  },

  async updateCourseOption(id, label) {
    const response = await axios.put(`/courses/options/${id}`, { label });
    return response.data?.data || null;
  },

  async deleteCourseOption(id) {
    const response = await axios.delete(`/courses/options/${id}`);
    return response.data?.data || null;
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

  /**
   * Build sectionId -> progress map from player-context modules (same data as nested sectionProgress).
   */
  sectionProgressMapFromModules(modules) {
    const map = {};
    (Array.isArray(modules) ? modules : []).forEach((mod) => {
      (mod.sections || []).forEach((sec) => {
        const sp = sec.sectionProgress;
        if (sec.id && sp && typeof sp === 'object') {
          map[sec.id] = sp;
        }
      });
    });
    return map;
  },

  // Player context: full payload for learning player (course, enrollment, modules with sections & progress)
  async getCoursePlayerContext(courseId) {
    try {
      const response = await axios.get(`/courses/${courseId}/player-context`);
      const payload = response.data?.data || response.data || {};
      const baseCourse = payload.course ? transformCourse(payload.course) : null;
      const enrolled = Boolean(payload.enrolled);
      const rawModules = Array.isArray(payload.modules) ? payload.modules : [];

      const modules = rawModules.map((m) => ({
        id: normalizeId(m),
        courseId: m.courseId || m.course_id || '',
        sortOrder: m.sortOrder != null ? Number(m.sortOrder) : 0,
        title: m.title || '',
        description: m.description || '',
        sections: (m.sections || []).map((s) => transformSection(s)),
      }));

      return {
        course: baseCourse,
        enrolled,
        modules,
      };
    } catch (error) {
      console.error('Error fetching course player context:', error);
      throw error;
    }
  },

  // My Progress overview in one request (all eligible courses + modules + progress summary)
  async getMyProgressOverview() {
    try {
      const response = await axios.get('/courses/progress/my-overview');
      const rows = response.data?.data || [];
      return Array.isArray(rows) ? rows : [];
    } catch (error) {
      console.error('Error fetching my progress overview:', error);
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
      if (courseData.categoryId) {
        formData.append('categoryId', courseData.categoryId);
      }
      if (Array.isArray(courseData.roles)) {
        formData.append('roles', JSON.stringify(courseData.roles));
      }
      if (Array.isArray(courseData.aiLevel)) {
        formData.append('aiLevel', JSON.stringify(courseData.aiLevel));
      }
      if (Array.isArray(courseData.goals)) {
        formData.append('goals', JSON.stringify(courseData.goals));
      }
      if (Array.isArray(courseData.useAreas)) {
        formData.append('useAreas', JSON.stringify(courseData.useAreas));
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
      formData.append('isBundle', String(courseData.isBundle === true));
      formData.append(
        'bundleCourseIds',
        JSON.stringify(
          courseData.isBundle && Array.isArray(courseData.bundleCourseIds) ? courseData.bundleCourseIds : []
        )
      );
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
   * @param {Array<{ title: string, description?: string, sortOrder?: number, sections?: Array<{ title: string, videoUrl?: string, description?: string, content?: string, watchtime?: string, durationTime?: string, images?: string[], attachments?: string[], sortOrder?: number }> }>} modules
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
                secPromise.then(async () => {
                  const pendingFiles = (sec.learningMaterials || []).filter(
                    (item) => item instanceof File
                  );
                  const existingUrls = (sec.learningMaterials || []).filter(
                    (item) => typeof item === 'string'
                  );
                  let learningMaterials = existingUrls;
                  if (pendingFiles.length > 0) {
                    const uploaded = await this.uploadSectionLearningMaterials(pendingFiles);
                    learningMaterials = [...existingUrls, ...uploaded];
                  }

                  return this.createModuleSection(courseId, created.id, {
                    title: sec.title || 'Untitled section',
                    subtitle: sec.subtitle,
                    videoUrl: sec.videoUrl,
                    description: sec.description,
                    content: sec.content,
                    watchtime: sec.watchtime,
                    durationTime: sec.durationTime,
                    images: sec.images,
                    attachments: sec.attachments,
                    learningMaterials:
                      learningMaterials.length > 0 ? learningMaterials : undefined,
                    sortOrder: sec.sortOrder,
                  });
                }),
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
      if (courseData.categoryId !== undefined) {
        formData.append('categoryId', courseData.categoryId || '');
      }
      if (courseData.roles !== undefined) {
        formData.append('roles', JSON.stringify(Array.isArray(courseData.roles) ? courseData.roles : []));
      }
      if (courseData.aiLevel !== undefined) {
        formData.append('aiLevel', JSON.stringify(Array.isArray(courseData.aiLevel) ? courseData.aiLevel : []));
      }
      if (courseData.goals !== undefined) {
        formData.append('goals', JSON.stringify(Array.isArray(courseData.goals) ? courseData.goals : []));
      }
      if (courseData.useAreas !== undefined) {
        formData.append('useAreas', JSON.stringify(Array.isArray(courseData.useAreas) ? courseData.useAreas : []));
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
      formData.append('isBundle', String(courseData.isBundle === true));
      formData.append(
        'bundleCourseIds',
        JSON.stringify(
          courseData.isBundle && Array.isArray(courseData.bundleCourseIds) ? courseData.bundleCourseIds : []
        )
      );

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
        id: normalizeId(m),
        courseId: m.courseId || m.course_id || '',
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
        id: normalizeId(m),
        courseId: m.courseId || m.course_id || '',
        sortOrder: m.sortOrder != null ? Number(m.sortOrder) : 0,
        title: m.title || '',
        description: m.description || '',
        sections: (m.sections || []).map((s) => transformSection(s)),
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

  /** Enable Spotlightr forward seek server-side; returns direct MP4 URL when Spotlightr API allows. */
  async prepareSpotlightrPlayback(watchUrl) {
    const url = String(watchUrl || '').trim();
    if (!url) return { directUrl: null, settingsUpdated: false };
    try {
      const response = await axios.post('/courses/spotlightr/prepare-playback', { url });
      return response.data?.data ?? { directUrl: null, settingsUpdated: false };
    } catch (error) {
      if (error?.response?.status === 401) return { directUrl: null, settingsUpdated: false };
      console.error('Error preparing Spotlightr playback:', error);
      return { directUrl: null, settingsUpdated: false };
    }
  },

  async getMyCertificates() {
    try {
      const response = await axios.get('/courses/certificates/my');
      const rows = Array.isArray(response.data?.data) ? response.data.data : [];
      return rows.map((row) => ({
        id: row?.id || '',
        courseId: row?.courseId || '',
        certificateNo: row?.certificateNo || '',
        completedAt: row?.completedAt || null,
        courseTitle: row?.courseTitle || 'Untitled Course',
        marketData: row?.marketData || '',
        learnerName: row?.learnerName || 'Learner',
      }));
    } catch (error) {
      if (error?.response?.status === 401) return [];
      console.error('Error fetching certificates:', error);
      throw error;
    }
  },

  async issueCourseCertificate(courseId) {
    try {
      const response = await axios.post(`/courses/${courseId}/certificates/issue`);
      return response.data?.data ?? response.data ?? null;
    } catch (error) {
      console.error('Error issuing certificate:', error);
      throw error;
    }
  },

  async getAdminCertificates(params = {}) {
    try {
      const response = await axios.get('/courses/certificates/admin/list', { params });
      const rows = Array.isArray(response.data?.data) ? response.data.data : [];
      const data = rows.map((row) => ({
        id: row?.id || '',
        courseId: row?.courseId || '',
        userId: row?.userId || '',
        certificateNo: row?.certificateNo || '',
        completedAt: row?.completedAt || null,
        createdAt: row?.createdAt || null,
        courseTitle: row?.courseTitle || 'Untitled Course',
        learnerName: row?.learnerName || 'Learner',
        learnerEmail: row?.learnerEmail || '',
        status: row?.status || 'active',
      }));
      const pagination = response.data?.pagination || null;
      return { data, pagination };
    } catch (error) {
      console.error('Error fetching admin certificates:', error);
      throw error;
    }
  },

  async deleteAdminCertificate(certificateId) {
    try {
      const response = await axios.delete(`/courses/certificates/admin/${certificateId}`);
      return response.data?.data ?? response.data ?? null;
    } catch (error) {
      console.error('Error deleting admin certificate:', error);
      throw error;
    }
  },

  async blockAdminCertificate(certificateId) {
    try {
      const response = await axios.post(`/courses/certificates/admin/${certificateId}/block`);
      return response.data?.data ?? response.data ?? null;
    } catch (error) {
      console.error('Error blocking admin certificate:', error);
      throw error;
    }
  },

  async unblockAdminCertificate(certificateId) {
    try {
      const response = await axios.post(`/courses/certificates/admin/${certificateId}/unblock`);
      return response.data?.data ?? response.data ?? null;
    } catch (error) {
      console.error('Error unblocking admin certificate:', error);
      throw error;
    }
  },

  // Use keepalive request for unload/refresh/logout transitions.
  updateSectionProgressOnUnload(courseId, sectionId, payload = {}) {
    try {
      if (!isUuid(sectionId)) return;
      const baseURL = axios?.defaults?.baseURL || '';
      if (!baseURL || !courseId || !sectionId) return;
      fetch(`${baseURL}/courses/${courseId}/sections/${sectionId}/progress`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
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
      return list.map((s) => transformSection(s));
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

  async detectSectionVideoDuration(url) {
    const trimmed = String(url || '').trim();
    if (!trimmed) return null;
    try {
      const response = await axios.post('/courses/modules/sections/detect-video-duration', { url: trimmed });
      const seconds = Number(response.data?.data?.seconds);
      return Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds) : null;
    } catch {
      return null;
    }
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

  async uploadSectionLearningMaterials(files) {
    if (!files?.length) return [];
    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append('files', file);
    });
    const response = await axios.post('/courses/modules/sections/upload-learning-materials', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const urls = response.data?.data?.urls || response.data?.urls || [];
    return urls.map((url) => resolveAssetUrl(url));
  },

  async createModuleSection(courseId, moduleId, data) {
    try {
      const response = await axios.post(`/courses/${courseId}/modules/${moduleId}/sections`, {
        title: data.title,
        subtitle: data.subtitle || undefined,
        videoUrl: data.videoUrl || undefined,
        description: data.description || undefined,
        content: data.content || undefined,
        watchtime: data.watchtime !== undefined ? data.watchtime : undefined,
        durationTime: data.durationTime !== undefined ? data.durationTime : undefined,
        images: Array.isArray(data.images) && data.images.length > 0 ? data.images : undefined,
        attachments:
          Array.isArray(data.attachments) && data.attachments.length > 0
            ? data.attachments
            : undefined,
        learningMaterials:
          Array.isArray(data.learningMaterials) && data.learningMaterials.length > 0
            ? data.learningMaterials
            : undefined,
        sortOrder: data.sortOrder,
      });
      const s = response.data?.data || response.data;
      return transformSection(s);
    } catch (error) {
      console.error('Error creating module section:', error);
      throw error;
    }
  },

  async updateModuleSection(id, data) {
    try {
      const response = await axios.put(`/courses/modules/sections/${id}`, {
        title: data.title,
        subtitle: data.subtitle !== undefined ? data.subtitle : undefined,
        videoUrl: data.videoUrl !== undefined ? data.videoUrl : undefined,
        description: data.description !== undefined ? data.description : undefined,
        content: data.content !== undefined ? data.content : undefined,
        watchtime: data.watchtime !== undefined ? data.watchtime : null,
        durationTime: data.durationTime !== undefined ? data.durationTime : null,
        images: data.images !== undefined ? data.images : undefined,
        attachments: data.attachments !== undefined ? data.attachments : undefined,
        learningMaterials:
          data.learningMaterials !== undefined ? data.learningMaterials : undefined,
        sortOrder: data.sortOrder,
      });
      const s = response.data?.data || response.data;
      return transformSection(s);
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
      const d = response.data?.data ?? response.data ?? {};
      return {
        enrolled: Boolean(d.enrolled),
        accessViaBundle: Boolean(d.accessViaBundle),
      };
    } catch (error) {
      if (error?.response?.status === 401) {
        return { enrolled: false, accessViaBundle: false };
      }
      console.error('Error fetching course enrolled status:', error);
      return { enrolled: false, accessViaBundle: false };
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

  /** Question bank (Admin list includes answers; learner list does not). */
  async getCourseQuestionBank(courseId) {
    try {
      const response = await axios.get(`/courses/${courseId}/question-bank`);
      return Array.isArray(response.data?.data) ? response.data.data : [];
    } catch (error) {
      console.error('Error fetching course question bank:', error);
      throw error;
    }
  },

  async createCourseQuestion(courseId, body) {
    try {
      const response = await axios.post(`/courses/${courseId}/question-bank`, body);
      return response.data?.data ?? response.data;
    } catch (error) {
      console.error('Error creating course question:', error);
      throw error;
    }
  },

  async updateCourseQuestion(questionId, body) {
    try {
      const response = await axios.put(`/courses/question-bank/${questionId}`, body);
      return response.data?.data ?? response.data;
    } catch (error) {
      console.error('Error updating course question:', error);
      throw error;
    }
  },

  async deleteCourseQuestion(questionId) {
    try {
      const response = await axios.delete(`/courses/question-bank/${questionId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting course question:', error);
      throw error;
    }
  },

  async checkCourseQuestionAnswer(courseId, questionId, payload) {
    try {
      const response = await axios.post(
        `/courses/${courseId}/question-bank/${questionId}/check`,
        payload
      );
      return response.data?.data ?? response.data;
    } catch (error) {
      console.error('Error checking question answer:', error);
      throw error;
    }
  },

  async getCourseQuestionAttempts(courseId, params = {}) {
    try {
      const query = {
        ...params,
        courseId: courseId || params.courseId || undefined,
      };
      const response = await axios.get('/courses/question-bank/attempts', { params: query });
      return response.data?.data || { items: [], users: [], total: 0, page: 1, limit: 10 };
    } catch (error) {
      console.error('Error fetching course question attempts:', error);
      throw error;
    }
  },

  async startCourseQuestionAttempt(courseId, payload = {}) {
    try {
      const response = await axios.post(`/courses/${courseId}/question-bank/attempts`, payload);
      return response.data?.data ?? response.data;
    } catch (error) {
      console.error('Error starting question attempt:', error);
      throw error;
    }
  },

  async completeCourseQuestionAttempt(courseId, attemptId, payload = {}) {
    try {
      const response = await axios.put(
        `/courses/${courseId}/question-bank/attempts/${attemptId}/complete`,
        payload
      );
      return response.data?.data ?? response.data;
    } catch (error) {
      console.error('Error completing question attempt:', error);
      throw error;
    }
  },

  async deleteCourseQuestionAttempt(attemptId) {
    try {
      const response = await axios.delete(`/courses/question-bank/attempts/${attemptId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting question attempt:', error);
      throw error;
    }
  },

  async deleteCourseQuestionAttempts(params = {}) {
    try {
      const response = await axios.delete('/courses/question-bank/attempts', { params });
      return response.data;
    } catch (error) {
      console.error('Error deleting question attempts:', error);
      throw error;
    }
  },

  async uploadAssignmentSubmission(courseId, questionId, files) {
    try {
      const formData = new FormData();
      const list = Array.isArray(files) ? files : [files];
      list.filter(Boolean).forEach((file) => formData.append('files', file));
      const response = await axios.post(
        `/courses/${courseId}/question-bank/${questionId}/assignment/upload`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return response.data?.data ?? response.data;
    } catch (error) {
      console.error('Error uploading assignment:', error);
      throw error;
    }
  },

  async submitAssignmentSubmission(courseId, questionId) {
    try {
      const response = await axios.post(
        `/courses/${courseId}/question-bank/${questionId}/assignment/submit`
      );
      return response.data?.data ?? response.data;
    } catch (error) {
      console.error('Error submitting assignment:', error);
      throw error;
    }
  },

  async deleteAssignmentSubmission(courseId, questionId, params = {}) {
    try {
      const response = await axios.delete(
        `/courses/${courseId}/question-bank/${questionId}/assignment/submission`,
        { params }
      );
      return response.data;
    } catch (error) {
      console.error('Error deleting assignment submission:', error);
      throw error;
    }
  },

  async getAssignmentSubmissions(courseId, params = {}) {
    try {
      const response = await axios.get(
        `/courses/${courseId}/question-bank/assignments/submissions`,
        { params }
      );
      return Array.isArray(response.data?.data) ? response.data.data : [];
    } catch (error) {
      console.error('Error fetching assignment submissions:', error);
      throw error;
    }
  },

  async manualVerifyAssignmentSubmission(courseId, submissionId, payload) {
    try {
      const response = await axios.patch(
        `/courses/${courseId}/question-bank/assignments/submissions/${submissionId}/manual-verify`,
        payload
      );
      return response.data?.data ?? response.data;
    } catch (error) {
      console.error('Error verifying assignment submission:', error);
      throw error;
    }
  },

  async regradeAssignmentSubmission(courseId, submissionId) {
    try {
      const response = await axios.post(
        `/courses/${courseId}/question-bank/assignments/submissions/${submissionId}/regrade`
      );
      return response.data?.data ?? response.data;
    } catch (error) {
      console.error('Error regrading assignment submission:', error);
      throw error;
    }
  },

  async getMyAssignmentSummary() {
    try {
      const response = await axios.get('/courses/assignments/my-summary');
      return Array.isArray(response.data?.data) ? response.data.data : [];
    } catch (error) {
      console.error('Error fetching assignment summary:', error);
      throw error;
    }
  },

  async uploadAssignmentReferenceFile(courseId, questionId, file) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await axios.post(
        `/courses/${courseId}/question-bank/${questionId}/assignment/guide/upload`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return response.data?.data ?? response.data;
    } catch (error) {
      console.error('Error uploading assignment guide file:', error);
      throw error;
    }
  },

  async uploadAssessmentQuestionFile(courseId, questionId, file) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await axios.post(
        `/courses/${courseId}/question-bank/${questionId}/assignment/question/upload`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return response.data?.data ?? response.data;
    } catch (error) {
      console.error('Error uploading assessment question file:', error);
      throw error;
    }
  },

  async uploadAssessmentAnswerSheetFile(courseId, questionId, file) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await axios.post(
        `/courses/${courseId}/question-bank/${questionId}/assignment/answer-sheet/upload`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return response.data?.data ?? response.data;
    } catch (error) {
      console.error('Error uploading assessment answer sheet:', error);
      throw error;
    }
  },

  async uploadAssessmentGuideFile(courseId, questionId, file) {
    return this.uploadAssignmentReferenceFile(courseId, questionId, file);
  },
};

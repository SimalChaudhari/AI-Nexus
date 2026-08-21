import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { CourseEntity } from '../course/courses.entity';
import { CourseModuleEntity } from '../course/course-module.entity';
import { CourseModuleSectionEntity } from '../course/course-module-section.entity';
import { resolveCoursePillarIndex } from '../course/course-program-cpe-summary.util';
import { IntlPathwayModuleEntity } from './intl-pathway-module.entity';
import { IntlPathwayRoleEntity } from './intl-pathway-role.entity';
import {
  CreateIntlPathwayModuleDto,
  CreateIntlPathwayRoleDto,
  UpdateIntlPathwayModuleDto,
  UpdateIntlPathwayRoleDto,
} from './intl-pathway.dto';
import { INTL_PATHWAY_MODULE_SEED, INTL_PATHWAY_ROLE_SEED } from './intl-pathway-seed';

type LmsCandidate = {
  pillarIndex: number;
  title: string;
  moduleTitle: string;
  courseTitle: string;
  videoUrl: string;
  minutes: number | null;
  courseId: string;
  moduleId: string;
  sectionId: string;
};

function normalizeUuid(value?: string | null): string | null {
  const text = String(value || '').trim();
  return text || null;
}

function normalizeTitle(value?: string | null): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeVideoUrlKey(value?: string | null): string {
  return String(value || '')
    .trim()
    .replace(/\/+$/, '')
    .split('?')[0]
    .split('#')[0]
    .toLowerCase();
}

function extractModuleCode(value?: string | null): string | null {
  const match = String(value || '').match(/\b(\d{2}-\d{2})\b/);
  return match ? match[1] : null;
}

function parseDurationToMinutes(value?: string | null): number | null {
  const text = String(value || '').trim();
  if (!text) return null;
  // Raw seconds → exact fractional minutes (no round-up).
  if (/^\d+$/.test(text)) {
    const seconds = Number(text);
    return Number.isFinite(seconds) && seconds > 0 ? seconds / 60 : null;
  }
  const hms = text.match(/^(\d+):(\d{1,2}):(\d{1,2})$/);
  if (hms) {
    const totalSeconds = Number(hms[1]) * 3600 + Number(hms[2]) * 60 + Number(hms[3]);
    return totalSeconds > 0 ? totalSeconds / 60 : null;
  }
  const ms = text.match(/^(\d+):(\d{1,2})$/);
  if (ms) {
    const totalSeconds = Number(ms[1]) * 60 + Number(ms[2]);
    return totalSeconds > 0 ? totalSeconds / 60 : null;
  }
  return null;
}

@Injectable()
export class IntlPathwayService {
  constructor(
    @InjectRepository(IntlPathwayModuleEntity)
    private readonly moduleRepository: Repository<IntlPathwayModuleEntity>,
    @InjectRepository(IntlPathwayRoleEntity)
    private readonly roleRepository: Repository<IntlPathwayRoleEntity>,
    @InjectRepository(CourseEntity)
    private readonly courseRepository: Repository<CourseEntity>,
    @InjectRepository(CourseModuleEntity)
    private readonly courseModuleRepository: Repository<CourseModuleEntity>,
    @InjectRepository(CourseModuleSectionEntity)
    private readonly courseModuleSectionRepository: Repository<CourseModuleSectionEntity>,
  ) {}

  // ---- Modules ----

  async getModulesPublic(): Promise<IntlPathwayModuleEntity[]> {
    return this.moduleRepository.find({
      where: { deleted: false },
      order: { sortOrder: 'ASC', code: 'ASC' },
    });
  }

  async getModulesAdmin(): Promise<IntlPathwayModuleEntity[]> {
    return this.moduleRepository.find({
      order: { sortOrder: 'ASC', code: 'ASC' },
    });
  }

  async getModuleByIdAdmin(id: string): Promise<IntlPathwayModuleEntity> {
    const row = await this.moduleRepository.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Pathway module not found');
    return row;
  }

  async createModule(dto: CreateIntlPathwayModuleDto) {
    const code = String(dto.code || '').trim();
    const existing = await this.moduleRepository.findOne({ where: { code } });
    if (existing && !existing.deleted) {
      throw new BadRequestException(`Module code ${code} already exists`);
    }

    const payload = {
      code,
      title: String(dto.title || '').trim(),
      pillar: String(dto.pillar || '').trim(),
      minutes: Number(dto.minutes) || 0,
      videoUrl: dto.videoUrl != null ? String(dto.videoUrl).trim() || null : null,
      courseId: normalizeUuid(dto.courseId),
      moduleId: normalizeUuid(dto.moduleId),
      sectionId: normalizeUuid(dto.sectionId),
      bullets: Array.isArray(dto.bullets) ? dto.bullets : [],
      sortOrder: dto.sortOrder != null ? Number(dto.sortOrder) : 0,
      deleted: dto.deleted ?? false,
    };

    if (existing) {
      Object.assign(existing, payload, { deleted: false });
      const saved = await this.moduleRepository.save(existing);
      return { message: 'Pathway module restored/updated successfully', data: saved };
    }

    const created = this.moduleRepository.create(payload);
    const saved = await this.moduleRepository.save(created);
    return { message: 'Pathway module created successfully', data: saved };
  }

  async updateModule(id: string, dto: UpdateIntlPathwayModuleDto) {
    const row = await this.getModuleByIdAdmin(id);

    if (dto.code !== undefined) {
      const code = String(dto.code).trim();
      const clash = await this.moduleRepository.findOne({ where: { code } });
      if (clash && clash.id !== id && !clash.deleted) {
        throw new BadRequestException(`Module code ${code} already exists`);
      }
      row.code = code;
    }
    if (dto.title !== undefined) row.title = String(dto.title).trim();
    if (dto.pillar !== undefined) row.pillar = String(dto.pillar).trim();
    if (dto.minutes !== undefined) row.minutes = Number(dto.minutes) || 0;
    if (dto.videoUrl !== undefined) {
      row.videoUrl = dto.videoUrl != null ? String(dto.videoUrl).trim() || null : null;
    }
    if (dto.courseId !== undefined) row.courseId = normalizeUuid(dto.courseId);
    if (dto.moduleId !== undefined) row.moduleId = normalizeUuid(dto.moduleId);
    if (dto.sectionId !== undefined) row.sectionId = normalizeUuid(dto.sectionId);
    if (dto.bullets !== undefined) row.bullets = Array.isArray(dto.bullets) ? dto.bullets : [];
    if (dto.sortOrder !== undefined) row.sortOrder = Number(dto.sortOrder) || 0;
    if (dto.deleted !== undefined) row.deleted = !!dto.deleted;

    const saved = await this.moduleRepository.save(row);
    return { message: 'Pathway module updated successfully', data: saved };
  }

  async deleteModule(id: string) {
    const row = await this.moduleRepository.findOne({ where: { id, deleted: false } });
    if (!row) throw new NotFoundException('Pathway module not found');
    row.deleted = true;
    await this.moduleRepository.save(row);
    return { message: 'Pathway module deleted successfully' };
  }

  // ---- Roles ----

  async getRolesPublic(): Promise<IntlPathwayRoleEntity[]> {
    return this.roleRepository.find({
      where: { deleted: false },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async getRolesAdmin(): Promise<IntlPathwayRoleEntity[]> {
    return this.roleRepository.find({
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async getRoleByIdAdmin(id: string): Promise<IntlPathwayRoleEntity> {
    const row = await this.roleRepository.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Pathway role not found');
    return row;
  }

  async createRole(dto: CreateIntlPathwayRoleDto) {
    const name = String(dto.name || '').trim();
    const existing = await this.roleRepository.findOne({ where: { name } });
    if (existing && !existing.deleted) {
      throw new BadRequestException(`Role ${name} already exists`);
    }

    const payload = {
      name,
      blurb: dto.blurb != null ? String(dto.blurb) : null,
      reqExclude: Array.isArray(dto.reqExclude) ? dto.reqExclude : [],
      reqAdd: Array.isArray(dto.reqAdd) ? dto.reqAdd : [],
      reqNote: dto.reqNote != null ? String(dto.reqNote) : null,
      scores: dto.scores && typeof dto.scores === 'object' ? dto.scores : {},
      sortOrder: dto.sortOrder != null ? Number(dto.sortOrder) : 0,
      deleted: dto.deleted ?? false,
    };

    if (existing) {
      Object.assign(existing, payload, { deleted: false });
      const saved = await this.roleRepository.save(existing);
      return { message: 'Pathway role restored/updated successfully', data: saved };
    }

    const created = this.roleRepository.create(payload);
    const saved = await this.roleRepository.save(created);
    return { message: 'Pathway role created successfully', data: saved };
  }

  async updateRole(id: string, dto: UpdateIntlPathwayRoleDto) {
    const row = await this.getRoleByIdAdmin(id);

    if (dto.name !== undefined) {
      const name = String(dto.name).trim();
      const clash = await this.roleRepository.findOne({ where: { name } });
      if (clash && clash.id !== id && !clash.deleted) {
        throw new BadRequestException(`Role ${name} already exists`);
      }
      row.name = name;
    }
    if (dto.blurb !== undefined) row.blurb = dto.blurb != null ? String(dto.blurb) : null;
    if (dto.reqExclude !== undefined) {
      row.reqExclude = Array.isArray(dto.reqExclude) ? dto.reqExclude : [];
    }
    if (dto.reqAdd !== undefined) row.reqAdd = Array.isArray(dto.reqAdd) ? dto.reqAdd : [];
    if (dto.reqNote !== undefined) row.reqNote = dto.reqNote != null ? String(dto.reqNote) : null;
    if (dto.scores !== undefined) {
      row.scores = dto.scores && typeof dto.scores === 'object' ? dto.scores : {};
    }
    if (dto.sortOrder !== undefined) row.sortOrder = Number(dto.sortOrder) || 0;
    if (dto.deleted !== undefined) row.deleted = !!dto.deleted;

    const saved = await this.roleRepository.save(row);
    return { message: 'Pathway role updated successfully', data: saved };
  }

  async deleteRole(id: string) {
    const row = await this.roleRepository.findOne({ where: { id, deleted: false } });
    if (!row) throw new NotFoundException('Pathway role not found');
    row.deleted = true;
    await this.roleRepository.save(row);
    return { message: 'Pathway role deleted successfully' };
  }

  /** Public planner payload: modules + roles. Admin videoUrl wins; LMS fills empty links by title. */
  async getPlannerCatalog(includeVideoUrls = false) {
    // Sequential reads avoid pg "client already executing a query" on pooled connections.
    const modules = await this.getModulesPublic();
    const roles = await this.getRolesPublic();
    const enrichedModules = await this.enrichModulesWithLmsVideos(modules);
    // Persist LMS course/module/section ids when we resolved them from the live tree.
    const dirty = enrichedModules.filter((row, index) => {
      const original = modules[index];
      if (!original) return false;
      return (
        (!original.courseId && row.courseId) ||
        (!original.moduleId && row.moduleId) ||
        (!original.sectionId && row.sectionId) ||
        (!original.videoUrl && row.videoUrl)
      );
    });
    if (dirty.length) {
      await this.moduleRepository.save(
        dirty.map((row) => {
          const entity = modules.find((m) => m.id === row.id) || row;
          entity.courseId = row.courseId || entity.courseId || null;
          entity.moduleId = row.moduleId || entity.moduleId || null;
          entity.sectionId = row.sectionId || entity.sectionId || null;
          if (!entity.videoUrl && row.videoUrl) entity.videoUrl = row.videoUrl;
          return entity;
        }),
      );
    }
    return {
      modules: this.sanitizePublicModules(enrichedModules, includeVideoUrls),
      roles,
    };
  }

  /** Guests get catalog metadata only — video URLs require an international login. */
  sanitizePublicModules<T extends { videoUrl?: string | null }>(
    modules: T[],
    includeVideoUrls: boolean,
  ) {
    return modules.map((module) => {
      const videoUrl = String(module.videoUrl || '').trim() || null;
      return {
        ...module,
        hasVideo: Boolean(videoUrl),
        videoUrl: includeVideoUrls ? videoUrl : null,
      };
    });
  }

  /**
   * Wipe pathway modules + roles and reseed from the frontend design catalog
   * (pathway-modules.js / pathway-roles.js mirrored in intl-pathway-seed.ts).
   */
  async reseedFromDesign() {
    await this.moduleRepository.clear();
    await this.roleRepository.clear();

    const modules = INTL_PATHWAY_MODULE_SEED.map((m, index) =>
      this.moduleRepository.create({
        code: m.code,
        title: m.title,
        pillar: m.pillar,
        minutes: m.minutes,
        videoUrl: null,
        bullets: Array.isArray(m.bullets) ? [...m.bullets] : [],
        sortOrder: index,
        deleted: false,
      }),
    );
    await this.moduleRepository.save(modules);

    const roles = INTL_PATHWAY_ROLE_SEED.map((r) =>
      this.roleRepository.create({
        name: r.name,
        blurb: r.blurb,
        reqExclude: [...(r.reqExclude || [])],
        reqAdd: [...((r as any).reqAdd || [])],
        reqNote: (r as any).reqNote || null,
        scores: { ...(r.scores || {}) },
        sortOrder: r.sortOrder,
        deleted: false,
      }),
    );
    await this.roleRepository.save(roles);

    return {
      message: `Reseeded ${modules.length} modules and ${roles.length} roles from design catalog`,
      data: { modules: modules.length, roles: roles.length },
    };
  }

  /**
   * Admin cascade picker: Course (pillar) → Module → Section.
   * Sections include videoUrl so selecting a section auto-fills pathway fields.
   */
  async getCourseTree() {
    const courses = await this.courseRepository.find({
      where: { isBundle: false },
      order: { programPillarIndex: 'ASC', createdAt: 'ASC' },
    });

    const pillarCourses = courses
      .map((course) => ({
        course,
        pillarIndex: resolveCoursePillarIndex(course),
      }))
      .filter((row) => row.pillarIndex != null && row.pillarIndex >= 1 && row.pillarIndex <= 3) as Array<{
      course: CourseEntity;
      pillarIndex: number;
    }>;

    if (!pillarCourses.length) return [];

    const courseIds = pillarCourses.map((r) => r.course.id);
    const modules = await this.courseModuleRepository.find({
      where: { courseId: In(courseIds) },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    const moduleIds = modules.map((m) => m.id);
    const sections = moduleIds.length
      ? await this.courseModuleSectionRepository.find({
          where: { moduleId: In(moduleIds) },
          order: { sortOrder: 'ASC', createdAt: 'ASC' },
        })
      : [];

    const sectionsByModule = new Map<string, typeof sections>();
    sections.forEach((section) => {
      const list = sectionsByModule.get(section.moduleId) || [];
      list.push(section);
      sectionsByModule.set(section.moduleId, list);
    });

    const modulesByCourse = new Map<string, typeof modules>();
    modules.forEach((mod) => {
      const list = modulesByCourse.get(mod.courseId) || [];
      list.push(mod);
      modulesByCourse.set(mod.courseId, list);
    });

    return pillarCourses.map(({ course, pillarIndex }) => {
      const courseModules = modulesByCourse.get(course.id) || [];
      return {
        courseId: course.id,
        courseTitle: String(course.title || '').trim(),
        pillar: String(pillarIndex).padStart(2, '0'),
        pillarIndex,
        modules: courseModules.map((mod) => {
          const modSections = sectionsByModule.get(mod.id) || [];
          return {
            moduleId: mod.id,
            moduleTitle: String(mod.title || '').trim() || 'Untitled module',
            sections: modSections.map((section) => ({
              sectionId: section.id,
              title: String(section.title || '').trim() || 'Untitled section',
              videoUrl: String(section.videoUrl || '').trim() || null,
              minutes:
                parseDurationToMinutes(section.durationTime) ||
                parseDurationToMinutes(section.watchtime),
              hasVideo: Boolean(String(section.videoUrl || '').trim()),
            })),
          };
        }),
      };
    });
  }

  /** Keep flat lesson list for older callers. */
  async getCourseLessonOptions() {
    const tree = await this.getCourseTree();
    const options: Array<{
      id: string;
      title: string;
      moduleTitle: string;
      videoUrl: string;
      minutes: number | null;
      pillar: string;
      courseTitle: string;
      courseId: string;
      moduleId: string;
      sectionId: string;
    }> = [];

    tree.forEach((course) => {
      course.modules.forEach((mod) => {
        mod.sections.forEach((section) => {
          if (!section.videoUrl) return;
          options.push({
            id: section.sectionId,
            title: section.title,
            moduleTitle: mod.moduleTitle,
            videoUrl: section.videoUrl,
            minutes: section.minutes,
            pillar: course.pillar,
            courseTitle: course.courseTitle,
            courseId: course.courseId,
            moduleId: mod.moduleId,
            sectionId: section.sectionId,
          });
        });
      });
    });

    return options;
  }

  /**
   * Rebuild/upsert pathway modules from live Course → Module → Section data.
   * Codes are generated per pillar as 01-00, 01-01, ... in course/module/section order.
   */
  async syncModulesFromCourses() {
    const tree = await this.getCourseTree();
    const existing = await this.moduleRepository.find();
    const byCode = new Map(existing.map((row) => [row.code, row]));

    const nextRows: IntlPathwayModuleEntity[] = [];
    const pillarCounters: Record<string, number> = { '01': 0, '02': 0, '03': 0 };
    let sortOrder = 0;

    for (const course of tree) {
      const pillar = course.pillar;
      for (const mod of course.modules) {
        for (const section of mod.sections) {
          // Prefer sections with video; still include titled sections so admin can map later
          if (!section.title) continue;
          const idx = pillarCounters[pillar] ?? 0;
          pillarCounters[pillar] = idx + 1;
          const code = `${pillar}-${String(idx).padStart(2, '0')}`;
          const payload = {
            code,
            title: section.title,
            pillar,
            minutes: section.minutes && section.minutes > 0 ? section.minutes : 0,
            videoUrl: section.videoUrl,
            courseId: course.courseId,
            moduleId: mod.moduleId,
            sectionId: section.sectionId,
            bullets: [],
            sortOrder: sortOrder++,
            deleted: false,
          };

          const current = byCode.get(code);
          if (current) {
            Object.assign(current, payload);
            nextRows.push(current);
          } else {
            nextRows.push(this.moduleRepository.create(payload));
          }
        }
      }
    }

    if (!nextRows.length) {
      return { message: 'No course sections found to sync', data: { count: 0 } };
    }

    await this.moduleRepository.save(nextRows);

    // Soft-delete pathway modules whose codes were not in this sync set
    const keep = new Set(nextRows.map((r) => r.code));
    const toDelete = existing.filter((row) => !keep.has(row.code) && !row.deleted);
    if (toDelete.length) {
      toDelete.forEach((row) => {
        row.deleted = true;
      });
      await this.moduleRepository.save(toDelete);
    }

    return {
      message: `Synced ${nextRows.length} pathway modules from courses`,
      data: { count: nextRows.length, deleted: toDelete.length },
    };
  }

  private async enrichModulesWithLmsVideos(modules: IntlPathwayModuleEntity[]) {
    // Always enrich missing LMS ids — each pathway code needs its own section (Fort-style).
    const needsEnrichment = modules.some(
      (m) =>
        !String(m.videoUrl || '').trim() ||
        !m.courseId ||
        !m.moduleId ||
        !m.sectionId,
    );
    if (!needsEnrichment) {
      return modules.map((m) => ({ ...m }));
    }

    let candidates: LmsCandidate[] = [];
    try {
      candidates = await this.loadLmsVideoCandidates();
    } catch {
      return modules.map((m) => ({ ...m }));
    }
    if (!candidates.length) {
      return modules.map((m) => ({ ...m }));
    }

    const byCode: Record<string, LmsCandidate> = {};
    const byTitle: Record<string, LmsCandidate> = {};
    const byVideoUrl: Record<string, LmsCandidate> = {};

    candidates.forEach((c) => {
      const code = extractModuleCode(c.title) || extractModuleCode(c.moduleTitle);
      if (code && !byCode[code]) byCode[code] = c;
      const titleKey = normalizeTitle(c.title);
      const moduleKey = normalizeTitle(c.moduleTitle);
      if (titleKey && !byTitle[titleKey]) byTitle[titleKey] = c;
      if (moduleKey && !byTitle[moduleKey]) byTitle[moduleKey] = c;
      const videoKey = normalizeVideoUrlKey(c.videoUrl);
      if (videoKey && !byVideoUrl[videoKey]) byVideoUrl[videoKey] = c;
    });

    // Never assign the same LMS section to two pathway modules (that made only "first" progress).
    const usedSectionIds = new Set(
      modules.filter((m) => m.sectionId).map((m) => String(m.sectionId)),
    );

    return modules.map((module) => {
      const adminUrl = String(module.videoUrl || '').trim();
      // Already linked to an LMS section — still fill empty videoUrl from that section.
      if (module.courseId && module.moduleId && module.sectionId) {
        if (adminUrl) {
          return { ...module, videoUrl: adminUrl };
        }
        const linked = candidates.find(
          (c) => String(c.sectionId || '') === String(module.sectionId || ''),
        );
        const fromSection = String(linked?.videoUrl || '').trim();
        return {
          ...module,
          videoUrl: fromSection || null,
          minutes:
            linked?.minutes && linked.minutes > 0 ? linked.minutes : module.minutes,
        };
      }

      const titleKey = normalizeTitle(module.title);
      const tryMatch = (matched: LmsCandidate | null): LmsCandidate | null => {
        if (!matched?.sectionId) return null;
        const sid = String(matched.sectionId);
        if (usedSectionIds.has(sid) && String(module.sectionId || '') !== sid) return null;
        return matched;
      };

      let matched =
        tryMatch(byCode[module.code] || null) ||
        tryMatch(byTitle[titleKey] || null) ||
        tryMatch(adminUrl ? byVideoUrl[normalizeVideoUrlKey(adminUrl)] || null : null);

      // Exact-title only fallback — no fuzzy includes() (caused shared sectionIds).
      if (!matched && titleKey) {
        matched = tryMatch(byTitle[titleKey] || null);
      }

      if (!matched) {
        return { ...module, videoUrl: adminUrl || null };
      }

      usedSectionIds.add(String(matched.sectionId));
      return {
        ...module,
        videoUrl: adminUrl || matched.videoUrl || null,
        minutes: matched.minutes && matched.minutes > 0 ? matched.minutes : module.minutes,
        courseId: module.courseId || matched.courseId || null,
        moduleId: module.moduleId || matched.moduleId || null,
        sectionId: module.sectionId || matched.sectionId || null,
      };
    });
  }

  private async loadLmsVideoCandidates(): Promise<LmsCandidate[]> {
    const courses = await this.courseRepository.find({
      where: { isBundle: false },
      order: { programPillarIndex: 'ASC', createdAt: 'ASC' },
    });

    const pillarCourses = courses
      .map((course) => ({
        course,
        pillarIndex: resolveCoursePillarIndex(course),
      }))
      .filter((row) => row.pillarIndex != null && row.pillarIndex >= 1 && row.pillarIndex <= 3) as Array<{
      course: CourseEntity;
      pillarIndex: number;
    }>;

    if (!pillarCourses.length) return [];

    const courseIds = pillarCourses.map((r) => r.course.id);
    const pillarByCourseId = new Map(pillarCourses.map((r) => [r.course.id, r.pillarIndex]));
    const titleByCourseId = new Map(
      pillarCourses.map((r) => [r.course.id, String(r.course.title || '').trim()])
    );

    const modules = await this.courseModuleRepository.find({
      where: { courseId: In(courseIds) },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    if (!modules.length) return [];

    const moduleById = new Map(modules.map((m) => [m.id, m]));
    const sections = await this.courseModuleSectionRepository.find({
      where: { moduleId: In(modules.map((m) => m.id)) },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });

    const candidates: LmsCandidate[] = [];
    for (const section of sections) {
      const videoUrl = String(section.videoUrl || '').trim();
      if (!videoUrl) continue;
      const mod = moduleById.get(section.moduleId);
      if (!mod) continue;
      const pillarIndex = pillarByCourseId.get(mod.courseId);
      if (!pillarIndex) continue;

      const sectionTitle = String(section.title || '').trim();
      const moduleTitle = String(mod.title || '').trim();

      candidates.push({
        pillarIndex,
        title: sectionTitle || moduleTitle,
        moduleTitle,
        courseTitle: titleByCourseId.get(mod.courseId) || '',
        videoUrl,
        minutes:
          parseDurationToMinutes(section.durationTime) ||
          parseDurationToMinutes(section.watchtime),
        courseId: mod.courseId,
        moduleId: mod.id,
        sectionId: section.id,
      });
    }

    return candidates;
  }
}

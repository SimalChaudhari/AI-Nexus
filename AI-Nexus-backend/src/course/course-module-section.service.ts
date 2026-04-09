import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseModuleSectionEntity } from './course-module-section.entity';
import {
  CreateCourseModuleSectionDto,
  UpdateCourseModuleSectionDto,
} from './course-module-section.dto';
import { CourseModuleService } from './course-module.service';
import { LocalStorageService } from '../service/local-storage.service';

function normalizeWatchtime(value?: string | null): string | null {
  const text = String(value || '').trim();
  if (!text) return null;

  const hhmmss = text.match(/^(\d{1,3}):(\d{1,2}):(\d{1,2})$/);
  if (hhmmss) {
    const h = Number(hhmmss[1]);
    const m = Number(hhmmss[2]);
    const s = Number(hhmmss[3]);
    if (Number.isNaN(h) || Number.isNaN(m) || Number.isNaN(s) || m > 59 || s > 59) return null;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  const mmss = text.match(/^(\d{1,4}):(\d{1,2})$/);
  if (mmss) {
    const m = Number(mmss[1]);
    const s = Number(mmss[2]);
    if (Number.isNaN(m) || Number.isNaN(s) || s > 59) return null;
    const total = (m * 60) + s;
    const hh = Math.floor(total / 3600);
    const mm = Math.floor((total % 3600) / 60);
    const ss = total % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  }

  if (/^\d+$/.test(text)) {
    const total = Number(text);
    if (Number.isNaN(total)) return null;
    const hh = Math.floor(total / 3600);
    const mm = Math.floor((total % 3600) / 60);
    const ss = total % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  }

  return null;
}

// Many frontends send absolute URLs (e.g. "http://localhost:5000/uploads/...").
// This helper extracts the "/uploads/..." part so LocalStorageService can work.
function extractUploadPath(url?: string | null): string | null {
  if (!url) return null;
  const idx = url.indexOf('/uploads/');
  if (idx === -1) return null;
  return url.slice(idx);
}

@Injectable()
export class CourseModuleSectionService {
  constructor(
    @InjectRepository(CourseModuleSectionEntity)
    private readonly sectionRepository: Repository<CourseModuleSectionEntity>,
    private readonly moduleService: CourseModuleService,
    private readonly localStorageService: LocalStorageService,
  ) {}

  private async deleteSectionMediaFiles(section: CourseModuleSectionEntity): Promise<void> {
    if (!section) return;
    if (section.videoUrl) {
      const path = extractUploadPath(section.videoUrl);
      if (path) {
        await this.localStorageService.deleteFileByUrl(path).catch(() => undefined);
      }
    }
    if (Array.isArray(section.images)) {
      await Promise.all(
        section.images.map((url) => {
          const path = extractUploadPath(url);
          return path
            ? this.localStorageService.deleteFileByUrl(path).catch(() => undefined)
            : Promise.resolve();
        }),
      );
    }
    if (Array.isArray(section.attachments)) {
      await Promise.all(
        section.attachments.map((url) => {
          const path = extractUploadPath(url);
          return path
            ? this.localStorageService.deleteFileByUrl(path).catch(() => undefined)
            : Promise.resolve();
        }),
      );
    }
  }

  async findByModuleId(moduleId: string): Promise<CourseModuleSectionEntity[]> {
    return this.sectionRepository.find({
      where: { moduleId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async create(
    moduleId: string,
    dto: CreateCourseModuleSectionDto,
  ): Promise<CourseModuleSectionEntity> {
    await this.moduleService.getById(moduleId);
    const maxOrder = await this.sectionRepository
      .createQueryBuilder('s')
      .select('MAX(s.sortOrder)', 'max')
      .where('s.moduleId = :moduleId', { moduleId })
      .getRawOne();
    const nextOrder = maxOrder?.max != null ? Number(maxOrder.max) + 1 : 0;
    const sortOrder = dto.sortOrder ?? nextOrder;
    const section = this.sectionRepository.create({
      moduleId,
      title: dto.title,
      videoUrl: dto.videoUrl,
      description: dto.description,
      content: dto.content,
      watchtime: normalizeWatchtime(dto.watchtime),
      durationTime: normalizeWatchtime(dto.durationTime),
      images: dto.images,
      attachments: dto.attachments,
      sortOrder,
    });
    return this.sectionRepository.save(section);
  }

  async update(
    id: string,
    dto: UpdateCourseModuleSectionDto,
  ): Promise<CourseModuleSectionEntity> {
    const section = await this.sectionRepository.findOne({ where: { id } });
    if (!section) throw new NotFoundException('Course module section not found');
    const prevVideoUrl = section.videoUrl;
    const prevImages = Array.isArray(section.images) ? [...section.images] : [];
    const prevAttachments = Array.isArray(section.attachments) ? [...section.attachments] : [];

    if (dto.title !== undefined) section.title = dto.title;
    if (dto.videoUrl !== undefined) section.videoUrl = dto.videoUrl;
    if (dto.description !== undefined) section.description = dto.description;
    if (dto.content !== undefined) section.content = dto.content;
    // When watchtime is missing, null, or empty string, store null so progress uses video length
    if (dto.watchtime !== undefined) {
      section.watchtime = normalizeWatchtime(dto.watchtime);
    }
    if (dto.durationTime !== undefined) {
      section.durationTime = normalizeWatchtime(dto.durationTime);
    }
    if (dto.images !== undefined) section.images = dto.images;
    if (dto.attachments !== undefined) section.attachments = dto.attachments;
    if (dto.sortOrder !== undefined) section.sortOrder = dto.sortOrder;

    // Clean up media files that are no longer referenced
    const nextImages = Array.isArray(section.images) ? section.images : [];
    const nextAttachments = Array.isArray(section.attachments) ? section.attachments : [];

    if (prevVideoUrl && prevVideoUrl !== section.videoUrl) {
      const path = extractUploadPath(prevVideoUrl);
      if (path) {
        await this.localStorageService.deleteFileByUrl(path).catch(() => undefined);
      }
    }

    const removedImages = prevImages.filter((url) => !nextImages.includes(url));
    const removedAttachments = prevAttachments.filter((url) => !nextAttachments.includes(url));

    await Promise.all([
      ...removedImages.map((url) => {
        const path = extractUploadPath(url);
        return path
          ? this.localStorageService.deleteFileByUrl(path).catch(() => undefined)
          : Promise.resolve();
      }),
      ...removedAttachments.map((url) => {
        const path = extractUploadPath(url);
        return path
          ? this.localStorageService.deleteFileByUrl(path).catch(() => undefined)
          : Promise.resolve();
      }),
    ]);

    return this.sectionRepository.save(section);
  }

  async delete(id: string): Promise<{ message: string }> {
    const section = await this.sectionRepository.findOne({ where: { id } });
    if (!section) throw new NotFoundException('Course module section not found');
    await this.deleteSectionMediaFiles(section);
    await this.sectionRepository.remove(section);
    return { message: 'Section deleted successfully' };
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { AppSettingsEntity } from './app-settings.entity';
import { LocalStorageService } from '../service/local-storage.service';
import { UserEntity } from '../user/users.entity';
import { CourseEntity } from '../course/courses.entity';

type PersonaCourseMapping = { persona: string; courseIds: string[] };

@Injectable()
export class AppSettingsService {
  private readonly recommendationsCacheTtlMs = 60_000;
  private readonly personaMappingsCacheTtlMs = 60_000;
  private personaMappingsCache:
    | { value: PersonaCourseMapping[]; expiresAt: number }
    | null = null;
  private recommendationsCache = new Map<
    string,
    { value: { persona: string | null; courseIds: string[] }; expiresAt: number }
  >();

  constructor(
    @InjectRepository(AppSettingsEntity)
    private readonly appSettingsRepository: Repository<AppSettingsEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(CourseEntity)
    private readonly courseRepository: Repository<CourseEntity>,
    private readonly localStorageService: LocalStorageService
  ) {}

  private invalidateRecommendationCaches() {
    this.personaMappingsCache = null;
    this.recommendationsCache.clear();
  }

  async getSettings(): Promise<AppSettingsEntity> {
    const settings = await this.appSettingsRepository.find({
      order: { createdAt: 'ASC' },
      take: 1,
    });

    if (settings.length > 0) {
      return settings[0];
    }

    const created = this.appSettingsRepository.create({
      logoUrl: null,
      homeHeroImageUrl: null,
      personaCourseMappings: [],
    });
    return this.appSettingsRepository.save(created);
  }

  async uploadLogo(file: Express.Multer.File): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();

    await this.localStorageService.clearFolder('logo');

    const relativeUrl = await this.localStorageService.saveFile(file, 'logo', {
      fileName: 'site-logo',
    });

    settings.logoUrl = relativeUrl;
    const saved = await this.appSettingsRepository.save(settings);

    return {
      message: 'Logo uploaded successfully',
      settings: saved,
    };
  }

  async removeLogo(): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();

    await this.localStorageService.clearFolder('logo');

    settings.logoUrl = null;
    const saved = await this.appSettingsRepository.save(settings);

    return {
      message: 'Logo removed successfully',
      settings: saved,
    };
  }

  async uploadHomeHeroImage(file: Express.Multer.File): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();

    await this.localStorageService.clearFolder('home-hero');

    const relativeUrl = await this.localStorageService.saveFile(file, 'home-hero', {
      fileName: 'home-hero-bg',
    });

    settings.homeHeroImageUrl = relativeUrl;
    const saved = await this.appSettingsRepository.save(settings);

    return {
      message: 'Home hero image uploaded successfully',
      settings: saved,
    };
  }

  async removeHomeHeroImage(): Promise<{ message: string; settings: AppSettingsEntity }> {
    const settings = await this.getSettings();

    await this.localStorageService.clearFolder('home-hero');

    settings.homeHeroImageUrl = null;
    const saved = await this.appSettingsRepository.save(settings);

    return {
      message: 'Home hero image removed successfully',
      settings: saved,
    };
  }

  async getPublicSettings(): Promise<{ logoUrl: string | null; homeHeroImageUrl: string | null }> {
    const settings = await this.getSettings();

    return {
      logoUrl: settings.logoUrl ?? null,
      homeHeroImageUrl: settings.homeHeroImageUrl ?? null,
    };
  }

  private normalizeMappings(input: unknown): PersonaCourseMapping[] {
    if (!Array.isArray(input)) return [];
    return input
      .map((row) => {
        const persona = typeof row?.persona === 'string' ? row.persona.trim() : '';
        const courseIds = Array.isArray(row?.courseIds)
          ? [...new Set(row.courseIds.map((id: string) => String(id || '').trim()).filter(Boolean))]
          : [];
        if (!persona) return null;
        return { persona, courseIds };
      })
      .filter((row): row is PersonaCourseMapping => Boolean(row));
  }

  async getPersonaCourseMappings(): Promise<PersonaCourseMapping[]> {
    const now = Date.now();
    if (this.personaMappingsCache && this.personaMappingsCache.expiresAt > now) {
      return this.personaMappingsCache.value;
    }
    const settings = await this.getSettings();
    const value = this.normalizeMappings(settings.personaCourseMappings);
    this.personaMappingsCache = {
      value,
      expiresAt: now + this.personaMappingsCacheTtlMs,
    };
    return value;
  }

  async updatePersonaCourseMappings(mappings: unknown): Promise<{
    message: string;
    settings: AppSettingsEntity;
  }> {
    const normalized = this.normalizeMappings(mappings);
    const allCourseIds = [...new Set(normalized.flatMap((row) => row.courseIds))];
    if (allCourseIds.length > 0) {
      const existing = await this.courseRepository.find({
        where: { id: In(allCourseIds) },
        select: ['id'],
      });
      const existingSet = new Set(existing.map((row) => row.id));
      const filtered = normalized.map((row) => ({
        persona: row.persona,
        courseIds: row.courseIds.filter((id: string) => existingSet.has(id)),
      }));
      const settings = await this.getSettings();
      settings.personaCourseMappings = filtered;
      const saved = await this.appSettingsRepository.save(settings);
      this.invalidateRecommendationCaches();
      return { message: 'Persona course mappings updated successfully', settings: saved };
    }

    const settings = await this.getSettings();
    settings.personaCourseMappings = normalized;
    const saved = await this.appSettingsRepository.save(settings);
    this.invalidateRecommendationCaches();
    return { message: 'Persona course mappings updated successfully', settings: saved };
  }

  async getRecommendationsForUser(userId: string): Promise<{
    persona: string | null;
    courseIds: string[];
  }> {
    const now = Date.now();
    const cached = this.recommendationsCache.get(userId);
    if (cached && cached.expiresAt > now) {
      return cached.value;
    }

    const user = await this.userRepository.findOne({ where: { id: userId }, select: ['id', 'persona'] });
    const persona = user?.persona?.trim() || null;
    if (!persona) {
      const value = { persona: null, courseIds: [] };
      this.recommendationsCache.set(userId, {
        value,
        expiresAt: now + this.recommendationsCacheTtlMs,
      });
      return value;
    }

    const mappings = await this.getPersonaCourseMappings();
    const match = mappings.find((row) => row.persona.toLowerCase() === persona.toLowerCase());
    const value = {
      persona,
      courseIds: match?.courseIds || [],
    };
    this.recommendationsCache.set(userId, {
      value,
      expiresAt: now + this.recommendationsCacheTtlMs,
    });
    return value;
  }
}

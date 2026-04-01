import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CreatePromptProviderProfileDto,
  CreatePromptCatalogItemDto,
  UpdatePromptProviderProfileDto,
  UpdatePromptCatalogItemDto,
} from './prompt-catalog.dto';
import { PromptCatalogItemEntity, PromptProvider } from './prompt-catalog.entity';
import { PromptProviderProfileEntity } from './prompt-provider-profile.entity';
import { LocalStorageService } from '../service/local-storage.service';

@Injectable()
export class PromptCatalogService {
  constructor(
    @InjectRepository(PromptCatalogItemEntity)
    private readonly promptCatalogRepository: Repository<PromptCatalogItemEntity>,
    @InjectRepository(PromptProviderProfileEntity)
    private readonly providerProfileRepository: Repository<PromptProviderProfileEntity>,
    private readonly localStorageService: LocalStorageService
  ) {}

  async getAdminList(): Promise<
    Array<
      Omit<PromptCatalogItemEntity, 'providers'> & {
        providers: Array<{
          value: PromptProvider;
          label: string;
          icon: string;
          color: string;
          bgColor: string;
        }>;
      }
    >
  > {
    const [rows, profiles] = await Promise.all([
      this.promptCatalogRepository.find({
        order: {
          category: 'ASC',
          sectionOrder: 'ASC',
          itemOrder: 'ASC',
          createdAt: 'ASC',
        },
      }),
      this.providerProfileRepository.find({
        order: { createdAt: 'ASC' },
      }),
    ]);

    const profileByProvider = new Map<PromptProvider, PromptProviderProfileEntity>();
    profiles.forEach((profile) => {
      if (!profileByProvider.has(profile.provider)) {
        profileByProvider.set(profile.provider, profile);
      }
    });

    return rows.map((row) => ({
      ...row,
      providers: (row.providers || []).map((provider) => {
        const profile = profileByProvider.get(provider);
        return {
          value: provider,
          label: profile?.title || provider,
          icon: profile?.icon || '',
          color: profile?.color || 'primary.main',
          bgColor: profile?.bgColor || profile?.color || 'primary.main',
          redirectUrl: profile?.redirectUrl || '',
        };
      }),
    }));
  }

  async getPublicCatalog() {
    const rows = await this.promptCatalogRepository.find({
      where: { isActive: true },
      order: {
        category: 'ASC',
        sectionOrder: 'ASC',
        itemOrder: 'ASC',
      },
    });

    const providerProfiles = await this.providerProfileRepository.find({
      where: { isActive: true },
      order: { createdAt: 'ASC' },
    });
    const providerIds = providerProfiles.map((p) => p.provider);

    const providers = providerIds.map(
      (provider) => {
        const providerRows = rows.filter((row) => Array.isArray(row.providers) && row.providers.includes(provider));
        const byCategory = new Map<string, PromptCatalogItemEntity[]>();
        providerRows.forEach((row) => {
          const categoryKey = row.category || 'default';
          const current = byCategory.get(categoryKey) || [];
          current.push(row);
          byCategory.set(categoryKey, current);
        });

        const promptPacks: Record<string, Array<{ title: string; items: Array<{ useCase: string; prompt: string }> }>> = {};

        byCategory.forEach((categoryRows, category) => {
          const bySection = new Map<string, PromptCatalogItemEntity[]>();
          categoryRows.forEach((row) => {
            const sectionKey = `${row.sectionOrder}::${row.sectionTitle}`;
            const current = bySection.get(sectionKey) || [];
            current.push(row);
            bySection.set(sectionKey, current);
          });

          const sections = Array.from(bySection.entries())
            .sort((a, b) => {
              const [ao] = a[0].split('::');
              const [bo] = b[0].split('::');
              return Number(ao) - Number(bo);
            })
            .map(([key, sectionRows]) => {
              const [, sectionTitle] = key.split('::');
              return {
                title: sectionTitle,
                items: sectionRows
                  .sort((a, b) => a.itemOrder - b.itemOrder)
                  .map((item) => ({
                    useCase: item.useCase,
                    prompt: item.prompt,
                  })),
              };
            });

          promptPacks[category] = sections;
        });

        const profile = providerProfiles.find((p) => p.provider === provider);
        return {
          provider,
          title: profile?.title || provider,
          description: profile?.description || '',
          color: profile?.color || 'primary.main',
          bgColor: profile?.bgColor || profile?.color || 'primary.main',
          icon: profile?.icon || 'solar:chat-round-dots-bold-duotone',
          detailTitle: profile?.detailTitle || provider,
          redirectUrl: profile?.redirectUrl || '',
          promptPacks,
        };
      }
    );

    return { providers, providerProfiles };
  }

  async create(dto: CreatePromptCatalogItemDto) {
    const primaryProvider = dto.providers?.[0] || PromptProvider.CHATGPT;
    const row = this.promptCatalogRepository.create({
      ...dto,
      providers: dto.providers,
      providerLegacy: primaryProvider,
      category: dto.category ?? null,
      sectionOrder: dto.sectionOrder ?? 0,
      itemOrder: dto.itemOrder ?? 0,
      isActive: dto.isActive ?? true,
    });
    const saved = await this.promptCatalogRepository.save(row);
    return { message: 'Prompt catalog item created successfully', item: saved };
  }

  async update(id: string, dto: UpdatePromptCatalogItemDto) {
    const row = await this.promptCatalogRepository.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Prompt catalog item not found');

    const previousUploadUrls = this.extractPromptCatalogUploadUrlsFromRow(row);

    Object.assign(row, dto);
    if (dto.providers?.length) {
      row.providerLegacy = dto.providers[0];
    }
    const saved = await this.promptCatalogRepository.save(row);

    const nextUploadUrls = this.extractPromptCatalogUploadUrlsFromRow(saved);
    const removedUploadUrls = [...previousUploadUrls].filter((url) => !nextUploadUrls.has(url));
    await this.deleteUnreferencedPromptCatalogUploads(removedUploadUrls, id);

    return { message: 'Prompt catalog item updated successfully', item: saved };
  }

  async delete(id: string) {
    const row = await this.promptCatalogRepository.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Prompt catalog item not found');

    const removedUploadUrls = [...this.extractPromptCatalogUploadUrlsFromRow(row)];
    await this.promptCatalogRepository.remove(row);
    await this.deleteUnreferencedPromptCatalogUploads(removedUploadUrls, id);

    return { message: 'Prompt catalog item deleted successfully' };
  }

  async getAdminProviderProfiles() {
    return this.providerProfileRepository.find({
      order: { createdAt: 'ASC' },
    });
  }

  async getAdminProviderOptions() {
    const profiles = await this.providerProfileRepository.find({
      where: { isActive: true },
      order: { createdAt: 'ASC' },
    });

    const promptRows = await this.promptCatalogRepository.find({
      select: ['providers'],
    });

    const usedProviders = new Set<PromptProvider>();
    promptRows.forEach((row) => {
      (row.providers || []).forEach((provider) => usedProviders.add(provider));
    });

    const uniqueByProvider = new Map<PromptProvider, PromptProviderProfileEntity>();
    profiles.forEach((profile) => {
      if (!uniqueByProvider.has(profile.provider)) {
        uniqueByProvider.set(profile.provider, profile);
      }
    });

    return Array.from(uniqueByProvider.values()).map((profile) => ({
      value: profile.provider,
      label: profile.title || profile.provider,
      color: profile.color,
      bgColor: profile.bgColor || profile.color,
      icon: profile.icon,
      redirectUrl: profile.redirectUrl || '',
      used: usedProviders.has(profile.provider),
    }));
  }

  async createProviderProfile(dto: CreatePromptProviderProfileDto) {
    const exists = await this.providerProfileRepository.findOne({
      where: { provider: dto.provider },
    });
    if (exists) {
      throw new NotFoundException(`Provider profile for '${dto.provider}' already exists`);
    }
    const row = this.providerProfileRepository.create({
      ...dto,
      isActive: dto.isActive ?? true,
    });
    const saved = await this.providerProfileRepository.save(row);
    return { message: 'Provider profile created successfully', item: saved };
  }

  async updateProviderProfile(id: string, dto: UpdatePromptProviderProfileDto) {
    const row = await this.providerProfileRepository.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Provider profile not found');
    Object.assign(row, dto);
    const saved = await this.providerProfileRepository.save(row);
    return { message: 'Provider profile updated successfully', item: saved };
  }

  async deleteProviderProfile(id: string) {
    const row = await this.providerProfileRepository.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Provider profile not found');
    await this.providerProfileRepository.remove(row);
    return { message: 'Provider profile deleted successfully' };
  }

  private extractPromptCatalogUploadUrlsFromRow(row: Pick<PromptCatalogItemEntity, 'useCase' | 'prompt'>) {
    const uploadUrls = new Set<string>();
    this.extractUploadUrlsFromHtml(row.useCase).forEach((url) => uploadUrls.add(url));
    this.extractUploadUrlsFromHtml(row.prompt).forEach((url) => uploadUrls.add(url));
    return uploadUrls;
  }

  private extractUploadUrlsFromHtml(html?: string | null): Set<string> {
    const urls = new Set<string>();
    if (!html) return urls;

    const imgSrcPattern = /<img[^>]+src\s*=\s*['"]([^'"]+)['"]/gi;
    let match: RegExpExecArray | null = imgSrcPattern.exec(html);

    while (match) {
      const normalized = this.normalizeUploadUrl(match[1]);
      if (normalized?.startsWith('/uploads/prompt-catalog/')) {
        urls.add(normalized);
      }
      match = imgSrcPattern.exec(html);
    }

    return urls;
  }

  private normalizeUploadUrl(rawUrl?: string | null): string | null {
    if (!rawUrl) return null;

    const clean = rawUrl.trim().split('#')[0].split('?')[0];
    if (!clean) return null;

    if (clean.startsWith('/uploads/')) {
      return clean;
    }

    try {
      const parsed = new URL(clean);
      if (parsed.pathname?.startsWith('/uploads/')) {
        return parsed.pathname;
      }
    } catch {
      return null;
    }

    return null;
  }

  private async deleteUnreferencedPromptCatalogUploads(urls: string[], excludeRowId: string) {
    if (!urls.length) return;

    const rows = await this.promptCatalogRepository.find({
      select: ['id', 'useCase', 'prompt'],
    });

    const referencedByOtherRows = new Set<string>();
    rows
      .filter((item) => item.id !== excludeRowId)
      .forEach((item) => {
        const itemUrls = this.extractPromptCatalogUploadUrlsFromRow(item);
        itemUrls.forEach((url) => referencedByOtherRows.add(url));
      });

    const orphanUrls = urls.filter((url) => !referencedByOtherRows.has(url));
    if (!orphanUrls.length) return;

    await Promise.all(orphanUrls.map((url) => this.localStorageService.deleteFileByUrl(url)));
  }
}

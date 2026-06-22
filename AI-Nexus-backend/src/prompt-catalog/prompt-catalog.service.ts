import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  fetchPromptAdvancePromptsJson,
  fetchPromptAdvancePromptsJsonByAssistant,
  PromptAdvanceAssistant,
} from './utils/prompt-advance-prompts.util';
import { PromptCatalogItemEntity, PromptProvider } from './prompt-catalog.entity';
import { PromptProviderProfileEntity } from './prompt-provider-profile.entity';
import { UpdatePromptCatalogItemDto, CreatePromptCatalogItemDto } from './prompt-catalog.dto';
import {
  adminCategoryKeyFromTitle,
  buildManualPromptMergeKey,
  displaySectionTitle,
  isManualPromptMergeKey,
  plainTextForMergeKey,
  promptCatalogMergeKey,
} from './prompt-catalog-keys.util';

@Injectable()
export class PromptCatalogService {
  constructor(
    @InjectRepository(PromptCatalogItemEntity)
    private readonly promptCatalogRepository: Repository<PromptCatalogItemEntity>,
    @InjectRepository(PromptProviderProfileEntity)
    private readonly providerProfileRepository: Repository<PromptProviderProfileEntity>
  ) {}

  async getPromptAdvancePromptsJson() {
    return fetchPromptAdvancePromptsJson();
  }

  async getPromptAdvanceAssistantPromptsJson(assistant: PromptAdvanceAssistant) {
    return fetchPromptAdvancePromptsJsonByAssistant(assistant);
  }

  async getProviderPromptDetail(provider: PromptProvider) {
    const profile = await this.providerProfileRepository.findOne({
      where: { provider, isActive: true },
    });
    if (!profile) {
      throw new NotFoundException('Prompt provider not found');
    }

    const items = await this.promptCatalogRepository
      .createQueryBuilder('item')
      .where(':provider = ANY(item.providers)', { provider })
      .andWhere('item.isActive = true')
      .orderBy('item.sectionOrder', 'ASC')
      .addOrderBy('item.itemOrder', 'ASC')
      .addOrderBy('item.createdAt', 'ASC')
      .getMany();

    const sectionMap = new Map<string, { title: string; items: Array<{ useCase: string; prompt: string }> }>();
    items.forEach((item) => {
      const title = item.sectionTitle || 'Prompts';
      if (!sectionMap.has(title)) {
        sectionMap.set(title, { title, items: [] });
      }
      sectionMap.get(title)!.items.push({
        useCase: item.useCase,
        prompt: item.prompt,
      });
    });

    return {
      title: profile.detailTitle || `${profile.title} Prompts`,
      subtitle: '',
      sections: Array.from(sectionMap.values()),
      toolTitle: profile.title,
      toolIcon: profile.icon,
      redirectUrl: profile.redirectUrl || '',
      color: profile.color,
      bgColor: profile.bgColor,
    };
  }

  /** Normalized category key (matches admin UI: plain text, lowercased, empty → __uncategorized__). */
  private static adminCategoryKeyExpr(alias = 'item'): string {
    return `COALESCE(NULLIF(LOWER(TRIM(regexp_replace(regexp_replace(COALESCE(${alias}."sectionTitle", ''), '<[^>]+>', ' ', 'gi'), '[[:space:]]+', ' ', 'g'))), ''), '__uncategorized__')`;
  }

  async listAdminPromptItems(options?: {
    page?: number;
    limit?: number;
    search?: string;
    provider?: PromptProvider;
    categoryKey?: string;
  }) {
    const page = Number.isInteger(options?.page) && (options?.page || 0) > 0 ? Number(options?.page) : 1;
    const limitRaw = Number.isInteger(options?.limit) && (options?.limit || 0) > 0 ? Number(options?.limit) : 5;
    const limit = Math.min(limitRaw, 100);
    const search = String(options?.search || '').trim();
    const categoryKey =
      options?.categoryKey != null && String(options.categoryKey).trim() !== ''
        ? String(options.categoryKey).trim()
        : undefined;

    const query = this.promptCatalogRepository
      .createQueryBuilder('item')
      .orderBy('item.sectionOrder', 'ASC')
      .addOrderBy('item.itemOrder', 'ASC')
      .addOrderBy('item.createdAt', 'ASC');

    if (options?.provider) {
      query.andWhere(':provider = ANY(item.providers)', { provider: options.provider });
    }

    if (categoryKey !== undefined) {
      query.andWhere(`${PromptCatalogService.adminCategoryKeyExpr('item')} = :categoryKey`, {
        categoryKey,
      });
    }

    if (search) {
      query.andWhere(
        '(item."sectionTitle" ILIKE :search OR item."useCase" ILIKE :search OR item."prompt" ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    const totalItems = await query.clone().getCount();
    const data = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    const totalPages = totalItems > 0 ? Math.ceil(totalItems / limit) : 0;
    return {
      data,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1 && totalPages > 0,
        search: search || null,
        provider: options?.provider ?? null,
        categoryKey: categoryKey ?? null,
      },
    };
  }

  /**
   * Paginated unique categories (deduped by normalized section title) with aggregated providers.
   */
  async listAdminCategoryGroups(options?: { page?: number; limit?: number; search?: string }) {
    const page = Number.isInteger(options?.page) && (options?.page || 0) > 0 ? Number(options?.page) : 1;
    const limitRaw = Number.isInteger(options?.limit) && (options?.limit || 0) > 0 ? Number(options?.limit) : 5;
    const limit = Math.min(limitRaw, 100);
    const search = String(options?.search || '').trim();
    const offset = (page - 1) * limit;

    const catExpr = PromptCatalogService.adminCategoryKeyExpr('item');
    const params: unknown[] = [];
    let p = 1;
    let searchFilter = '';
    if (search) {
      params.push(`%${search}%`);
      searchFilter = `AND (item."sectionTitle" ILIKE $${p} OR item."useCase" ILIKE $${p} OR item."prompt" ILIKE $${p})`;
      p += 1;
    }

    const countSql = `
      SELECT COUNT(*)::int AS cnt
      FROM (
        SELECT DISTINCT ${catExpr} AS ck
        FROM "prompt_catalog_items" item
        WHERE item."isActive" = true
        ${searchFilter}
      ) t
    `;
    const countRows = await this.promptCatalogRepository.query(countSql, params);
    const totalItems = Number(countRows?.[0]?.cnt ?? 0) || 0;

    const limPl = `$${p}`;
    const offPl = `$${p + 1}`;
    params.push(limit, offset);

    const dataSql = `
      SELECT
        g.ck AS "category_key",
        g.min_so AS "min_section_order",
        g.sample_title AS "sample_section_title",
        g.prov_arr AS "provider_ids"
      FROM (
        SELECT
          n.ck AS ck,
          MIN(n."sectionOrder") AS min_so,
          MIN(n."sectionTitle") AS sample_title,
          ARRAY_AGG(DISTINCT p::text ORDER BY p::text) AS prov_arr
        FROM (
          SELECT
            item."sectionTitle" AS "sectionTitle",
            item."sectionOrder" AS "sectionOrder",
            item.providers AS providers,
            ${catExpr} AS ck
          FROM "prompt_catalog_items" item
          WHERE item."isActive" = true
          ${searchFilter}
        ) n
        CROSS JOIN LATERAL unnest(n.providers) AS p
        GROUP BY n.ck
      ) g
      ORDER BY g.min_so ASC, g.ck ASC
      LIMIT ${limPl} OFFSET ${offPl}
    `;

    const rows = await this.promptCatalogRepository.query(dataSql, params);

    const normalizePgTextArray = (val: unknown): string[] => {
      if (Array.isArray(val)) {
        return val.map(String);
      }
      if (typeof val === 'string') {
        const s = val.trim();
        if (s.startsWith('{') && s.endsWith('}')) {
          return s
            .slice(1, -1)
            .split(',')
            .map((x) => x.replace(/^"|"$/g, '').trim())
            .filter(Boolean);
        }
      }
      return [];
    };

    const data = (rows as Record<string, unknown>[]).map((r) => ({
      categoryKey: String(r.category_key ?? ''),
      minSectionOrder: Number(r.min_section_order) || 0,
      sampleSectionTitle: String(r.sample_section_title ?? ''),
      providerIds: normalizePgTextArray(r.provider_ids),
    }));

    const totalPages = totalItems > 0 ? Math.ceil(totalItems / limit) : 0;
    return {
      data,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1 && totalPages > 0,
        search: search || null,
      },
    };
  }

  async getAdminPromptItemById(id: string) {
    const item = await this.promptCatalogRepository.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException('Prompt item not found');
    }
    return item;
  }

  private async resolvePromptOrders(sectionTitle: string, sectionOrder?: number, itemOrder?: number) {
    if (Number.isInteger(sectionOrder) && sectionOrder! >= 0 && Number.isInteger(itemOrder) && itemOrder! >= 0) {
      return { sectionOrder: sectionOrder!, itemOrder: itemOrder! };
    }

    const categoryKey = adminCategoryKeyFromTitle(sectionTitle);
    const catExpr = PromptCatalogService.adminCategoryKeyExpr('item');

    const sectionAnchor = await this.promptCatalogRepository
      .createQueryBuilder('item')
      .where(`${catExpr} = :categoryKey`, { categoryKey })
      .orderBy('item.sectionOrder', 'ASC')
      .getOne();

    if (sectionAnchor) {
      const maxItemRow = await this.promptCatalogRepository
        .createQueryBuilder('item')
        .where(`${catExpr} = :categoryKey`, { categoryKey })
        .orderBy('item.itemOrder', 'DESC')
        .getOne();

      return {
        sectionOrder: sectionAnchor.sectionOrder,
        itemOrder: (maxItemRow?.itemOrder ?? 0) + 1,
      };
    }

    const maxSectionOrder = await this.promptCatalogRepository
      .createQueryBuilder('item')
      .select('MAX(item.sectionOrder)', 'max')
      .getRawOne<{ max: string | null }>();

    return {
      sectionOrder: (Number(maxSectionOrder?.max) || 0) + 1,
      itemOrder: 1,
    };
  }

  async createPromptItem(dto: CreatePromptCatalogItemDto) {
    const sectionTitle = displaySectionTitle(String(dto.sectionTitle || '').trim());
    const useCase = String(dto.useCase || '').trim();
    const prompt = String(dto.prompt || '').trim();
    const providers = Array.isArray(dto.providers) ? [...new Set(dto.providers)] : [];

    if (!sectionTitle) {
      throw new BadRequestException('Section title is required');
    }
    if (!useCase) {
      throw new BadRequestException('Use case is required');
    }
    if (!prompt) {
      throw new BadRequestException('Prompt is required');
    }
    if (!providers.length) {
      throw new BadRequestException('At least one provider is required');
    }

    const { sectionOrder, itemOrder } = await this.resolvePromptOrders(
      sectionTitle,
      dto.sectionOrder,
      dto.itemOrder
    );

    const item = this.promptCatalogRepository.create({
      providers,
      providerLegacy: providers[0] || null,
      category: dto.category?.trim() || null,
      sectionTitle,
      sectionOrder,
      itemOrder,
      useCase,
      prompt,
      syncMergeKey: buildManualPromptMergeKey(),
      adminPromptLocked: true,
      isActive: dto.isActive ?? true,
    });

    return this.promptCatalogRepository.save(item);
  }

  async updatePromptItem(id: string, dto: UpdatePromptCatalogItemDto) {
    const item = await this.promptCatalogRepository.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException('Prompt item not found');
    }

    Object.assign(item, dto);
    if (dto.providers && dto.providers.length > 0) {
      item.providerLegacy = dto.providers[0];
    }
    if (!item.syncMergeKey) {
      item.syncMergeKey = promptCatalogMergeKey(
        plainTextForMergeKey(item.sectionTitle),
        plainTextForMergeKey(item.useCase)
      );
    }
    item.adminPromptLocked = true;
    return this.promptCatalogRepository.save(item);
  }

  async deletePromptItem(id: string) {
    const item = await this.promptCatalogRepository.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException('Prompt item not found');
    }
    await this.promptCatalogRepository.delete(id);
    return { message: 'Prompt deleted successfully' };
  }

  async syncFromExternalProviders() {
    const providers = await this.providerProfileRepository.find({ where: { isActive: true } });
    const mergedMap = new Map<
      string,
      {
        providers: Set<PromptProvider>;
        sectionTitle: string;
        sectionOrder: number;
        itemOrder: number;
        useCase: string;
        prompt: string;
      }
    >();

    for (const provider of providers) {
      const payload = await fetchPromptAdvancePromptsJsonByAssistant(provider.provider as PromptAdvanceAssistant);
      const categories = Array.isArray(payload?.categories) ? payload.categories : [];

      let sectionOrder = 0;
      for (const category of categories) {
        sectionOrder += 1;
        const sectionTitle = String(category?.category || 'Prompts');
        const prompts = Array.isArray(category?.prompts) ? category.prompts : [];

        let itemOrder = 0;
        for (const promptItem of prompts) {
          itemOrder += 1;
          const useCase = String(promptItem?.title || '');
          const prompt = String(promptItem?.prompt || '');
          const key = promptCatalogMergeKey(sectionTitle, useCase);

          const existing = mergedMap.get(key);
          if (existing) {
            existing.providers.add(provider.provider as PromptProvider);
            existing.sectionOrder = Math.min(existing.sectionOrder, sectionOrder);
            existing.itemOrder = Math.min(existing.itemOrder, itemOrder);
            if (prompt.length > existing.prompt.length) {
              existing.prompt = prompt;
            }
            existing.sectionTitle = displaySectionTitle(existing.sectionTitle);
            continue;
          }

          mergedMap.set(key, {
            providers: new Set([provider.provider as PromptProvider]),
            sectionTitle: displaySectionTitle(sectionTitle),
            sectionOrder,
            itemOrder,
            useCase,
            prompt,
          });
        }
      }
    }

    const existingRows = await this.promptCatalogRepository.find();
    const manualRows = existingRows.filter((row) => isManualPromptMergeKey(row.syncMergeKey));
    for (const row of existingRows) {
      if (!row.syncMergeKey) {
        row.syncMergeKey = promptCatalogMergeKey(
          plainTextForMergeKey(row.sectionTitle),
          plainTextForMergeKey(row.useCase)
        );
      }
    }
    if (existingRows.length > 0) {
      await this.promptCatalogRepository.save(existingRows);
    }

    const preservedPromptByKey = new Map<string, string>();
    for (const row of existingRows) {
      if (!row.adminPromptLocked || !row.syncMergeKey) {
        continue;
      }
      preservedPromptByKey.set(row.syncMergeKey, row.prompt);
    }

    await this.promptCatalogRepository.clear();

    const entries = Array.from(mergedMap.entries())
      .map(([mergeKey, item]) => ({ mergeKey, item }))
      .sort((a, b) => {
        if (a.item.sectionOrder !== b.item.sectionOrder) return a.item.sectionOrder - b.item.sectionOrder;
        if (a.item.itemOrder !== b.item.itemOrder) return a.item.itemOrder - b.item.itemOrder;
        return a.item.useCase.localeCompare(b.item.useCase);
      })
      .map(({ mergeKey, item }) => {
        const providersList = Array.from(item.providers);
        const preserved = preservedPromptByKey.get(mergeKey);
        const promptBody = preserved !== undefined ? preserved : item.prompt;
        return this.promptCatalogRepository.create({
          providers: providersList,
          providerLegacy: providersList[0] || null,
          category: null,
          sectionTitle: item.sectionTitle,
          sectionOrder: item.sectionOrder,
          itemOrder: item.itemOrder,
          useCase: item.useCase,
          prompt: promptBody,
          syncMergeKey: mergeKey,
          adminPromptLocked: preserved !== undefined,
          isActive: true,
        });
      });

    if (entries.length > 0) {
      await this.promptCatalogRepository.save(entries);
    }

    if (manualRows.length > 0) {
      const manualEntities = manualRows.map((row) =>
        this.promptCatalogRepository.create({
          providers: row.providers,
          providerLegacy: row.providerLegacy ?? row.providers?.[0] ?? null,
          category: row.category,
          sectionTitle: row.sectionTitle,
          sectionOrder: row.sectionOrder,
          itemOrder: row.itemOrder,
          useCase: row.useCase,
          prompt: row.prompt,
          syncMergeKey: row.syncMergeKey,
          adminPromptLocked: true,
          isActive: row.isActive,
        })
      );
      await this.promptCatalogRepository.save(manualEntities);
    }

    return {
      message: 'Prompts synced from external source successfully',
      manualPreserved: manualRows.length,
    };
  }
}

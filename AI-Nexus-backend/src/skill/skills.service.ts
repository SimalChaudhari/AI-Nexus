import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Not, Repository } from 'typeorm';
import { SkillEntity, SkillExtraField } from './skills.entity';
import { CreateSkillDto, UpdateSkillDto } from './skills.dto';
import {
  PaginatedQueryOptions,
  PaginatedResultWithMeta,
  PaginationService,
} from '../common/pagination/pagination.service';

export type SkillListQueryOptions = PaginatedQueryOptions & {
  usePagination?: boolean;
  includeInactive?: boolean;
};

export type SkillPaginatedListResult = PaginatedResultWithMeta<SkillEntity>;

@Injectable()
export class SkillService {
  constructor(
    @InjectRepository(SkillEntity)
    private readonly skillRepository: Repository<SkillEntity>,
    private readonly paginationService: PaginationService,
  ) {}

  private normalizeName(name: string): string {
    return name.trim().toLowerCase();
  }

  private normalizeExtraFields(fields?: SkillExtraField[] | null): SkillExtraField[] {
    if (!Array.isArray(fields)) return [];
    return fields
      .map((field) => ({
        key: String(field?.key || '').trim(),
        value: String(field?.value ?? '').trim(),
      }))
      .filter((field) => field.key);
  }

  async getAll(queryOptions?: SkillListQueryOptions): Promise<SkillEntity[] | SkillPaginatedListResult> {
    const usePagination = Boolean(queryOptions?.usePagination);
    const includeInactive = Boolean(queryOptions?.includeInactive);
    const normalized = this.paginationService.normalizePaginatedQuery(
      {
        page: queryOptions?.page,
        limit: queryOptions?.limit,
        search: queryOptions?.search,
      },
      10,
      100,
    );

    const query = this.skillRepository.createQueryBuilder('skill');

    if (!includeInactive) {
      query.andWhere('skill.isActive = true');
    }

    if (normalized.hasSearch) {
      query.andWhere(
        new Brackets((qb) => {
          qb.where('skill.name ILIKE :search', { search: `%${normalized.search}%` })
            .orWhere('skill.title ILIKE :search', { search: `%${normalized.search}%` })
            .orWhere('skill.description ILIKE :search', { search: `%${normalized.search}%` });
        }),
      );
    }

    query.orderBy('skill.sortOrder', 'ASC').addOrderBy('skill.createdAt', 'DESC');

    if (!usePagination) {
      return query.getMany();
    }

    return this.paginationService.paginateQueryBuilder({
      queryBuilder: query,
      page: normalized.page,
      limit: normalized.limit,
      search: normalized.hasSearch ? normalized.search : null,
    });
  }

  async getById(id: string, options?: { includeInactive?: boolean }): Promise<SkillEntity> {
    const skill = await this.skillRepository.findOne({ where: { id } });
    if (!skill) {
      throw new NotFoundException('Skill not found');
    }
    if (!options?.includeInactive && !skill.isActive) {
      throw new NotFoundException('Skill not found');
    }
    return skill;
  }

  async getByName(name: string, options?: { includeInactive?: boolean }): Promise<SkillEntity> {
    const skill = await this.skillRepository.findOne({
      where: { name: this.normalizeName(name) },
    });
    if (!skill) {
      throw new NotFoundException('Skill not found');
    }
    if (!options?.includeInactive && !skill.isActive) {
      throw new NotFoundException('Skill not found');
    }
    return skill;
  }

  private async assertUniqueName(name: string, excludeId?: string): Promise<void> {
    const existing = await this.skillRepository.findOne({
      where: excludeId ? { name, id: Not(excludeId) } : { name },
    });
    if (existing) {
      throw new ConflictException('A skill with this name already exists');
    }
  }

  async create(createSkillDto: CreateSkillDto): Promise<{ message: string; skill: SkillEntity }> {
    const name = this.normalizeName(createSkillDto.name);
    await this.assertUniqueName(name);

    const skill = this.skillRepository.create({
      name,
      title: createSkillDto.title.trim(),
      description: createSkillDto.description.trim(),
      license: createSkillDto.license?.trim() || null,
      sourceUrl: createSkillDto.sourceUrl?.trim() || null,
      content: createSkillDto.content,
      extraFields: this.normalizeExtraFields(createSkillDto.extraFields),
      sortOrder: createSkillDto.sortOrder ?? 0,
      isActive: createSkillDto.isActive ?? true,
    });

    await this.skillRepository.save(skill);
    return {
      message: 'Skill created successfully',
      skill,
    };
  }

  async update(
    id: string,
    updateSkillDto: UpdateSkillDto,
  ): Promise<{ message: string; skill: SkillEntity }> {
    const skill = await this.skillRepository.findOne({ where: { id } });
    if (!skill) {
      throw new NotFoundException('Skill not found');
    }

    if (updateSkillDto.name !== undefined) {
      const name = this.normalizeName(updateSkillDto.name);
      await this.assertUniqueName(name, id);
      skill.name = name;
    }
    if (updateSkillDto.title !== undefined) {
      skill.title = updateSkillDto.title.trim();
    }
    if (updateSkillDto.description !== undefined) {
      skill.description = updateSkillDto.description.trim();
    }
    if (updateSkillDto.license !== undefined) {
      skill.license = updateSkillDto.license?.trim() || null;
    }
    if (updateSkillDto.sourceUrl !== undefined) {
      skill.sourceUrl = updateSkillDto.sourceUrl?.trim() || null;
    }
    if (updateSkillDto.content !== undefined) {
      skill.content = updateSkillDto.content;
    }
    if (updateSkillDto.extraFields !== undefined) {
      skill.extraFields = this.normalizeExtraFields(updateSkillDto.extraFields);
    }
    if (updateSkillDto.sortOrder !== undefined) {
      skill.sortOrder = updateSkillDto.sortOrder;
    }
    if (updateSkillDto.isActive !== undefined) {
      skill.isActive = updateSkillDto.isActive;
    }

    await this.skillRepository.save(skill);
    return {
      message: 'Skill updated successfully',
      skill,
    };
  }

  async delete(id: string): Promise<{ message: string }> {
    const skill = await this.skillRepository.findOne({ where: { id } });
    if (!skill) {
      throw new NotFoundException('Skill not found');
    }

    await this.skillRepository.remove(skill);
    return { message: 'Skill deleted successfully' };
  }
}

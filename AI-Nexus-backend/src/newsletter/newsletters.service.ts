import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { NewsletterEntity } from './newsletters.entity';
import { CreateNewsletterDto, UpdateNewsletterDto } from './newsletters.dto';
import { LocalStorageService } from '../service/local-storage.service';
import {
  PaginatedQueryOptions,
  PaginatedResultWithMeta,
  PaginationService,
} from '../common/pagination/pagination.service';

export type NewsletterListQueryOptions = PaginatedQueryOptions & {
  usePagination?: boolean;
  includeUnpublished?: boolean;
};

export type NewsletterPaginatedListResult = PaginatedResultWithMeta<NewsletterEntity>;

const HTML_EXT = /\.(html|htm)$/i;
const PDF_EXT = /\.pdf$/i;

@Injectable()
export class NewsletterService {
  constructor(
    @InjectRepository(NewsletterEntity)
    private readonly newsletterRepository: Repository<NewsletterEntity>,
    private readonly paginationService: PaginationService,
    private readonly localStorageService: LocalStorageService,
  ) {}

  private parsePublishAt(value?: string | null): Date | null {
    if (value === undefined || value === null || String(value).trim() === '') {
      return null;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid publish date and time');
    }
    return date;
  }

  private parseBoolean(value: unknown, fallback: boolean): boolean {
    if (value === undefined || value === null || value === '') return fallback;
    if (typeof value === 'boolean') return value;
    const normalized = String(value).trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
    return fallback;
  }

  private assertFileMatchesFormat(file: Express.Multer.File, format: 'html' | 'pdf') {
    const name = file.originalname || '';
    const mime = String(file.mimetype || '').toLowerCase();
    if (format === 'html') {
      const ok = HTML_EXT.test(name) || mime.includes('html');
      if (!ok) throw new BadRequestException('Upload an .html file for HTML newsletters');
      return;
    }
    const ok = PDF_EXT.test(name) || mime.includes('pdf');
    if (!ok) throw new BadRequestException('Upload a .pdf file for PDF newsletters');
  }

  async getAll(
    queryOptions?: NewsletterListQueryOptions,
  ): Promise<NewsletterEntity[] | NewsletterPaginatedListResult> {
    const usePagination = Boolean(queryOptions?.usePagination);
    const includeUnpublished = Boolean(queryOptions?.includeUnpublished);
    const normalized = this.paginationService.normalizePaginatedQuery(
      {
        page: queryOptions?.page,
        limit: queryOptions?.limit,
        search: queryOptions?.search,
      },
      10,
      100,
    );

    const query = this.newsletterRepository.createQueryBuilder('newsletter');

    if (!includeUnpublished) {
      query
        .andWhere('newsletter.isActive = true')
        .andWhere('(newsletter.publishAt IS NULL OR newsletter.publishAt <= :now)', {
          now: new Date(),
        });
    }

    if (normalized.hasSearch) {
      query.andWhere(
        new Brackets((qb) => {
          qb.where('newsletter.title ILIKE :search', { search: `%${normalized.search}%` }).orWhere(
            'newsletter.summary ILIKE :search',
            { search: `%${normalized.search}%` },
          );
        }),
      );
    }

    query
      .orderBy('newsletter.sortOrder', 'ASC')
      .addOrderBy('newsletter.publishAt', 'DESC')
      .addOrderBy('newsletter.createdAt', 'DESC');

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

  async getById(id: string, options?: { includeUnpublished?: boolean }): Promise<NewsletterEntity> {
    const newsletter = await this.newsletterRepository.findOne({ where: { id } });
    if (!newsletter) {
      throw new NotFoundException('Newsletter not found');
    }
    if (!options?.includeUnpublished) {
      const isLive =
        newsletter.isActive && (!newsletter.publishAt || newsletter.publishAt <= new Date());
      if (!isLive) {
        throw new NotFoundException('Newsletter not found');
      }
    }
    return newsletter;
  }

  async getHtmlContent(id: string, options?: { includeUnpublished?: boolean }): Promise<string> {
    const newsletter = await this.getById(id, options);
    if (newsletter.format !== 'html') {
      throw new BadRequestException('This newsletter is not an HTML file');
    }
    const file = await this.localStorageService.readFileByUrl(newsletter.fileUrl);
    if (!file) {
      throw new NotFoundException('Newsletter file not found');
    }
    return file.buffer.toString('utf8');
  }

  async create(
    dto: CreateNewsletterDto,
    file?: Express.Multer.File,
  ): Promise<{ message: string; newsletter: NewsletterEntity }> {
    if (!file) {
      throw new BadRequestException('Upload an HTML or PDF file');
    }
    this.assertFileMatchesFormat(file, dto.format);
    const fileUrl = await this.localStorageService.saveFile(file, 'newsletters');

    const newsletter = this.newsletterRepository.create({
      title: dto.title.trim(),
      summary: dto.summary?.trim() || null,
      format: dto.format,
      fileUrl,
      originalFileName: file.originalname || null,
      publishAt: this.parsePublishAt(dto.publishAt),
      sortOrder: dto.sortOrder ?? 0,
      isActive: this.parseBoolean(dto.isActive, true),
    });

    await this.newsletterRepository.save(newsletter);
    return { message: 'Newsletter created successfully', newsletter };
  }

  async update(
    id: string,
    dto: UpdateNewsletterDto,
    file?: Express.Multer.File,
  ): Promise<{ message: string; newsletter: NewsletterEntity }> {
    const newsletter = await this.newsletterRepository.findOne({ where: { id } });
    if (!newsletter) {
      throw new NotFoundException('Newsletter not found');
    }

    const nextFormat = dto.format || newsletter.format;
    if (dto.format && dto.format !== newsletter.format && !file) {
      throw new BadRequestException('Upload a new file when changing between HTML and PDF');
    }
    if (file) {
      this.assertFileMatchesFormat(file, nextFormat);
      await this.localStorageService.deleteFileByUrl(newsletter.fileUrl);
      newsletter.fileUrl = await this.localStorageService.saveFile(file, 'newsletters');
      newsletter.originalFileName = file.originalname || newsletter.originalFileName;
    }

    if (dto.title !== undefined) newsletter.title = dto.title.trim();
    if (dto.summary !== undefined) newsletter.summary = dto.summary?.trim() || null;
    if (dto.format !== undefined) newsletter.format = dto.format;
    if (dto.publishAt !== undefined) newsletter.publishAt = this.parsePublishAt(dto.publishAt);
    if (dto.sortOrder !== undefined) newsletter.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) newsletter.isActive = this.parseBoolean(dto.isActive, newsletter.isActive);

    await this.newsletterRepository.save(newsletter);
    return { message: 'Newsletter updated successfully', newsletter };
  }

  async delete(id: string): Promise<{ message: string }> {
    const newsletter = await this.newsletterRepository.findOne({ where: { id } });
    if (!newsletter) {
      throw new NotFoundException('Newsletter not found');
    }
    await this.localStorageService.deleteFileByUrl(newsletter.fileUrl);
    await this.newsletterRepository.remove(newsletter);
    return { message: 'Newsletter deleted successfully' };
  }
}

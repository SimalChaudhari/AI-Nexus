import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CartEntity, CartItem } from './cart.entity';
import { CourseEntity } from '../course/courses.entity';
import { CourseModuleEntity } from '../course/course-module.entity';
import { CourseModuleSectionEntity } from '../course/course-module-section.entity';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartEntity)
    private readonly cartRepo: Repository<CartEntity>,
    @InjectRepository(CourseEntity)
    private readonly courseRepo: Repository<CourseEntity>,
    @InjectRepository(CourseModuleEntity)
    private readonly courseModuleRepo: Repository<CourseModuleEntity>,
    @InjectRepository(CourseModuleSectionEntity)
    private readonly courseModuleSectionRepo: Repository<CourseModuleSectionEntity>,
  ) {}

  private parseMarketData(raw: unknown): Record<string, unknown> {
    if (!raw) return {};
    try {
      if (typeof raw === 'string') return JSON.parse(raw) as Record<string, unknown>;
      if (typeof raw === 'object') return raw as Record<string, unknown>;
    } catch {
      return {};
    }
    return {};
  }

  private buildSubDescription(description?: string): string | undefined {
    const text = String(description || '').trim();
    if (!text) return undefined;
    const compact = text.replace(/\s+/g, ' ');
    return compact.length > 140 ? `${compact.slice(0, 137)}...` : compact;
  }

  private async enrichItems(items: CartItem[]): Promise<CartItem[]> {
    const normalized = this.normalizeItems(items);
    if (normalized.length === 0) return [];

    const ids = [...new Set(normalized.map((item) => item.id).filter(Boolean))];
    if (ids.length === 0) return normalized;

    const courses = await this.courseRepo.find({
      where: { id: In(ids) },
      select: ['id', 'title', 'description', 'image', 'amount', 'level', 'marketData'],
    });

    const modulesAgg = await this.courseModuleRepo
      .createQueryBuilder('module')
      .select('module.courseId', 'courseId')
      .addSelect('COUNT(module.id)::int', 'count')
      .where('module.courseId IN (:...ids)', { ids })
      .groupBy('module.courseId')
      .getRawMany<{ courseId: string; count: number }>();

    const sectionsAgg = await this.courseModuleSectionRepo
      .createQueryBuilder('section')
      .innerJoin(CourseModuleEntity, 'module', 'module.id = section.moduleId')
      .select('module.courseId', 'courseId')
      .addSelect('COUNT(section.id)::int', 'count')
      .where('module.courseId IN (:...ids)', { ids })
      .groupBy('module.courseId')
      .getRawMany<{ courseId: string; count: number }>();

    const modulesMap = new Map(modulesAgg.map((row) => [row.courseId, Number(row.count) || 0]));
    const sectionsMap = new Map(sectionsAgg.map((row) => [row.courseId, Number(row.count) || 0]));
    const courseMap = new Map(courses.map((course) => [course.id, course]));

    return normalized.map((item) => {
      const course = courseMap.get(item.id);
      if (!course) return item;
      const market = this.parseMarketData(course.marketData);
      const mode =
        (typeof market.mode === 'string' && market.mode) ||
        (typeof market.deliveryMode === 'string' && market.deliveryMode) ||
        'Online';
      const cpeHoursRaw = market.cpeHours ?? market.cpe ?? market.hours;
      const lessonCountRaw = market.lessonCount ?? market.lessons;
      const cpeHours = Number(cpeHoursRaw);
      const lessonCount = Number(lessonCountRaw);
      const description = course.description || item.description;
      return {
        ...item,
        name: item.name || course.title,
        coverUrl: item.coverUrl || course.image || '',
        price: Number(item.price) || Number(course.amount) || 0,
        description,
        subDescription: this.buildSubDescription(description),
        level: course.level || item.level,
        mode,
        deliveryMode: mode,
        cpeHours: Number.isFinite(cpeHours) ? cpeHours : undefined,
        lessonCount: Number.isFinite(lessonCount) ? lessonCount : undefined,
        modulesCount: modulesMap.get(item.id) ?? item.modulesCount ?? 0,
        sectionsCount: sectionsMap.get(item.id) ?? item.sectionsCount ?? 0,
      };
    });
  }

  async getCart(userId: string): Promise<{ items: CartItem[]; discount?: number }> {
    const row = await this.cartRepo.findOne({ where: { userId } });
    const items = row?.items ?? [];
    const discount = row?.discount != null ? Number(row.discount) : 0;
    const enriched = await this.enrichItems(Array.isArray(items) ? items : []);
    return { items: enriched, discount };
  }

  /** Normalize: courses are always quantity 1. */
  private normalizeItems(items: CartItem[]): CartItem[] {
    return (Array.isArray(items) ? items : []).map((i) => ({ ...i, quantity: 1 }));
  }

  async setCart(
    userId: string,
    items: CartItem[],
    discount?: number | null,
  ): Promise<{ items: CartItem[]; discount?: number }> {
    const normalized = this.normalizeItems(items);
    const discountNum = discount != null ? Number(discount) : null;
    const existing = await this.cartRepo.findOne({ where: { userId } });
    if (existing) {
      existing.items = normalized;
      if (discountNum !== null) existing.discount = discountNum;
      await this.cartRepo.save(existing);
      const enriched = await this.enrichItems(normalized);
      return { items: enriched, discount: Number(existing.discount ?? 0) };
    }
    const created = await this.cartRepo.save(
      this.cartRepo.create({ userId, items: normalized, discount: discountNum ?? 0 }),
    );
    const enriched = await this.enrichItems(normalized);
    return { items: enriched, discount: Number(created.discount ?? 0) };
  }

  /** Add one course to cart. If already in cart, no change (one per course). */
  async addItem(userId: string, item: CartItem): Promise<{ items: CartItem[] }> {
    const { items } = await this.getCart(userId);
    if (items.some((i) => i.id === item.id)) {
      const enriched = await this.enrichItems(items);
      return { items: enriched };
    }
    return this.setCart(userId, [...items, { ...item, quantity: 1 }]);
  }

  /** Remove item by course id. */
  async removeItem(userId: string, itemId: string): Promise<{ items: CartItem[] }> {
    const { items } = await this.getCart(userId);
    const next = items.filter((i) => i.id !== itemId);
    return this.setCart(userId, next);
  }

  /** Courses are always quantity 1; this is a no-op for compatibility. */
  async updateItemQuantity(userId: string, _itemId: string, _quantity: number): Promise<{ items: CartItem[] }> {
    return this.getCart(userId);
  }
}

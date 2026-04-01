import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartEntity, CartItem } from './cart.entity';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartEntity)
    private readonly cartRepo: Repository<CartEntity>,
  ) {}

  async getCart(userId: string): Promise<{ items: CartItem[]; discount?: number }> {
    const row = await this.cartRepo.findOne({ where: { userId } });
    const items = row?.items ?? [];
    const discount = row?.discount != null ? Number(row.discount) : 0;
    return { items: Array.isArray(items) ? items : [], discount };
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
      return { items: normalized, discount: Number(existing.discount ?? 0) };
    }
    const created = await this.cartRepo.save(
      this.cartRepo.create({ userId, items: normalized, discount: discountNum ?? 0 }),
    );
    return { items: normalized, discount: Number(created.discount ?? 0) };
  }

  /** Add one course to cart. If already in cart, no change (one per course). */
  async addItem(userId: string, item: CartItem): Promise<{ items: CartItem[] }> {
    const { items } = await this.getCart(userId);
    if (items.some((i) => i.id === item.id)) return { items: this.normalizeItems(items) };
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

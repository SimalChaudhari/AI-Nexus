import { Entity, Column, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/** Cart item shape: id (course id), name, price, quantity. */
export type CartItem = {
  id: string;
  name?: string;
  coverUrl?: string;
  price: number;
  quantity: number;
};

@Entity('user_cart')
export class CartEntity {
  @PrimaryColumn({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'jsonb', default: [] })
  items!: CartItem[];

  /** Optional discount amount (e.g. in same currency as items). */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, nullable: true })
  discount!: number | null;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}

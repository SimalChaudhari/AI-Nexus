import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { UserEntity } from '../user/users.entity';

export enum OrderStatus {
  Completed = 'completed',
  Pending = 'pending',
  Failed = 'failed',
  Cancelled = 'cancelled',
  Refunded = 'refunded',
}

@Entity('orders')
@Index(['userId'])
@Index(['createdAt'])
export class OrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: UserEntity;

  /** Comma-separated course IDs (from client_reference_id) */
  @Column({ type: 'text' })
  courseIds!: string;

  /** Line items snapshot: JSON array of { id, name, price, quantity } */
  @Column({ type: 'jsonb', nullable: true })
  items!: { id: string; name: string; price: number; quantity: number }[] | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalAmount!: number;

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency!: string;

  @Column({ type: 'varchar', length: 20, default: OrderStatus.Completed })
  status!: OrderStatus;

  @Column({ type: 'varchar', length: 50, nullable: true })
  paymentStatus!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  wooshpaySessionId!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  wooshpayPaymentIntentId!: string | null;

  @Column({ type: 'varchar', length: 512 })
  clientReferenceId!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  eventType!: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}

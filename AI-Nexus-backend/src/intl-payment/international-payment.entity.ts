import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { InternationalUserEntity } from '../intl-auth/international-user.entity';

export enum InternationalPaymentStatus {
  Pending = 'pending',
  Paid = 'paid',
  Failed = 'failed',
  Canceled = 'canceled',
}

@Entity('international_payments')
@Index(['userId'])
@Index(['status'])
@Index(['wooshpaySessionId'])
export class InternationalPaymentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => InternationalUserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: InternationalUserEntity;

  /** Short WooshPay client_reference_id (unique per attempt). */
  @Column({ type: 'varchar', length: 64, unique: true })
  clientReferenceId!: string;

  @Column({ type: 'varchar', length: 32, default: InternationalPaymentStatus.Pending })
  status!: InternationalPaymentStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  amount!: number;

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency!: string;

  @Column({ type: 'varchar', length: 8, nullable: true })
  countryCode!: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  countryOfResidence!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  promoCode!: string | null;

  @Column({ type: 'boolean', default: false })
  promoApplied!: boolean;

  @Column({ type: 'boolean', default: false })
  applyGst!: boolean;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  gstAmount!: number;

  @Column({ type: 'jsonb', nullable: true })
  items!: {
    id: string;
    name: string;
    price: number;
    quantity: number;
    membershipType?: string;
  }[] | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  wooshpaySessionId!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  wooshpayPaymentIntentId!: string | null;

  /** Wallet/card actually used (Google Pay, Apple Pay, Card, …). */
  @Column({ type: 'varchar', length: 80, nullable: true })
  paymentMethod!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  eventType!: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  failureReason!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  paidAt!: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}

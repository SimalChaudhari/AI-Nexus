import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum AffiliateSaleStatus {
  Pending = 'pending',
  Paid = 'paid',
  Canceled = 'canceled',
  Failed = 'failed',
}

@Entity('affiliate_sales')
export class AffiliateSaleEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  draftUserId!: string;

  @Column({ type: 'uuid', nullable: true })
  userId!: string | null;

  @Index()
  @Column({ type: 'varchar', length: 64, nullable: true })
  affiliateCode!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  voucherCode!: string | null;

  @Column({ type: 'boolean', default: false })
  discountApplied!: boolean;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  originalAmount!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  payableAmount!: number;

  @Column({ type: 'varchar', length: 10, default: 'SGD' })
  currency!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64, nullable: true })
  paymentRefId!: string | null;

  @Column({
    type: 'varchar',
    length: 32,
    default: AffiliateSaleStatus.Pending,
  })
  status!: AffiliateSaleStatus;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  paidAt!: Date | null;
}

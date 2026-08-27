import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/** Which admin surface / signup flow owns this promo code. */
export type VoucherCodeSite = 'payment' | 'international';

/** International signup plan this promo assigns. `both` keeps Student / Full on signup. */
export type VoucherMembershipType = 'student' | 'full' | 'both';

@Entity('voucher_codes')
@Index(['code', 'site'], { unique: true })
export class VoucherCodeEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64 })
  code!: string;

  /** payment = SG Payment menu; international = International Promo & Pricing. */
  @Column({ type: 'varchar', length: 32, default: 'payment' })
  site!: VoucherCodeSite;

  @Column({ type: 'varchar', length: 255, nullable: true })
  label!: string | null;

  /** International only: Student or Full / Role assigned when this code is used. `both` = either plan. */
  @Column({ type: 'varchar', length: 16, nullable: true })
  membershipType!: VoucherMembershipType | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt!: Date | null;

  @Column({ type: 'int', nullable: true })
  maxRedemptions!: number | null;

  @Column({ type: 'int', default: 0 })
  redemptionCount!: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}

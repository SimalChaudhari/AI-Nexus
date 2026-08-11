import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Singleton-style row for International site membership pricing (SGD base amounts).
 * Country checkout amounts are FX-converted from these values at runtime.
 */
@Entity('intl_membership_settings')
export class IntlMembershipSettingsEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Standard membership fee in SGD before FX conversion. */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 365 })
  baseAmountSgd!: number;

  /** Promo / voucher payable amount in SGD before FX conversion. */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 100 })
  voucherDiscountAmountSgd!: number;

  @Column({ type: 'varchar', length: 64, nullable: true })
  referralCode!: string | null;

  /** Path suffix used to build international signup referral links. */
  @Column({ type: 'varchar', length: 200, default: '/auth/sign-up?ref=' })
  referralLinkPath!: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}

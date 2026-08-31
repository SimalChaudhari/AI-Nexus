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

  /** Standard membership fee in SGD before FX conversion (Full / Role plan). */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 365 })
  baseAmountSgd!: number;

  /** Student membership fee in SGD before FX conversion. */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 150 })
  studentAmountSgd!: number;

  /** Promo / voucher payable amount in SGD before FX conversion (fallback if country has no exact amount). */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 100 })
  voucherDiscountAmountSgd!: number;

  /** Exact promo payable amount per country code (ASEAN + China). No FX when set. */
  @Column({ type: 'jsonb', nullable: true })
  promoAmountsByCountry!: Record<string, number> | null;

  /** Manual country pricing: basePrice, discountPrice, active, promoCode, promoPricesByCode. */
  @Column({ type: 'jsonb', nullable: true })
  countryPricing!: Record<string, {
    basePrice: number | null;
    discountPrice: number | null;
    studentBasePrice?: number | null;
    studentDiscountPrice?: number | null;
    active: boolean;
    promoCode: string | null;
    promoPricesByCode?: Record<string, {
      discountPrice: number | null;
      studentDiscountPrice?: number | null;
    }>;
  }> | null;

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

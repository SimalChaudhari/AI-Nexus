import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('company_enrollment_invites')
export class CompanyEnrollmentInviteEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  companyCode!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  label!: string | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  /** 0 = unlimited enrollment */
  @Column({ type: 'int', default: 0 })
  maxEnrollment!: number;

  @Column({ type: 'int', default: 0 })
  enrolledCount!: number;

  /** QR / invite link expiry. Null = no QR expiry. */
  @Column({ type: 'timestamp', nullable: true })
  qrValidTill!: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}

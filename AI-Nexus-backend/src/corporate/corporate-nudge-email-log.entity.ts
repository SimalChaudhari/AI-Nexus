import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** Permanent audit trail of every corporate nudge email send attempt. */
@Entity('corporate_nudge_email_logs')
@Index(['companyCode'])
@Index(['userId'])
@Index(['campaignId'])
@Index(['sentAt'])
@Index(['toEmail'])
export class CorporateNudgeEmailLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120 })
  companyCode!: string;

  /** Null for one-off single-learner nudges. */
  @Column({ type: 'uuid', nullable: true })
  campaignId!: string | null;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 320 })
  toEmail!: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  learnerName!: string | null;

  @Column({ type: 'varchar', length: 255 })
  subject!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  progressLabel!: string | null;

  /** sent | failed | skipped */
  @Column({ type: 'varchar', length: 32 })
  status!: string;

  @Column({ type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ type: 'uuid', nullable: true })
  sentByUserId!: string | null;

  @Column({ type: 'varchar', length: 32, default: 'single' })
  source!: string;

  @Column({ type: 'timestamp' })
  sentAt!: Date;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}

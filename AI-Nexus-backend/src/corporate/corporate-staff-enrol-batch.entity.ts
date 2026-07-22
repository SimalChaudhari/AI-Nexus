import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('corporate_staff_enrol_batches')
@Index(['companyCode'])
@Index(['createdAt'])
export class CorporateStaffEnrolBatchEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120 })
  companyCode!: string;

  @Column({ type: 'uuid', nullable: true })
  createdByUserId!: string | null;

  /** single | csv */
  @Column({ type: 'varchar', length: 32, default: 'single' })
  source!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  fileName!: string | null;

  @Column({ type: 'int', default: 0 })
  totalReceived!: number;

  @Column({ type: 'int', default: 0 })
  passedCount!: number;

  @Column({ type: 'int', default: 0 })
  skippedCount!: number;

  @Column({ type: 'varchar', length: 512, nullable: true })
  message!: string | null;

  /** Per-row outcomes for the tracking page. */
  @Column({ type: 'jsonb', nullable: true })
  rows!: Array<{
    email: string;
    name?: string;
    status: 'passed' | 'skipped';
    step?: string;
    reason?: string | null;
  }> | null;

  @Column({ type: 'jsonb', nullable: true })
  summary!: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  batches!: Array<{
    batchNo: number;
    size: number;
    succeeded: number;
    failed: number;
  }> | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}

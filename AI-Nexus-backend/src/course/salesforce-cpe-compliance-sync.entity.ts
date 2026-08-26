import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../user/users.entity';
import { CourseEntity } from './courses.entity';

/**
 * Last successful Salesforce CPE compliance POST per learner / Pillar 3 course / CPE year.
 * Used so we only call cpecompliancefornexus on first earned hours or when hours change.
 */
@Entity('salesforce_cpe_compliance_sync')
@Unique(['userId', 'courseId', 'cpeYear'])
@Index(['userId'])
@Index(['courseId'])
export class SalesforceCpeComplianceSyncEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'uuid' })
  courseId!: string;

  @Column({ type: 'uuid', nullable: true })
  programId?: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: UserEntity;

  @ManyToOne(() => CourseEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course!: CourseEntity;

  @Column({ type: 'varchar', length: 8 })
  cpeYear!: string;

  @Column({ type: 'numeric', precision: 6, scale: 2, default: 0 })
  lastNoOfCpeHours!: number;

  @Column({ type: 'numeric', precision: 6, scale: 2, default: 0 })
  lastHoursAllocated!: number;

  @Column({ type: 'varchar', length: 255, default: '' })
  lastCourseTitle!: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  salesforceRecordId?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  lastSyncedAt?: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}

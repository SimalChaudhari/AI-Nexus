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

import { InternationalUserEntity } from '../intl-auth/international-user.entity';

/**
 * Same coverage fields as Fort `course_section_watch_progress`.
 * UI key is pathway `pathwayCode` (01-00, 01-01, …) — one progress row per module card,
 * like Fort’s one row per section. LMS courseId/moduleId/sectionId are stored for linkage.
 */
@Entity('intl_pathway_watch_progress')
@Unique(['userId', 'pathwayCode'])
@Index(['userId'])
@Index(['sectionId'])
@Index(['moduleId'])
@Index(['pathwayCode'])
export class IntlPathwayWatchProgressEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => InternationalUserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: InternationalUserEntity;

  @Column({ type: 'uuid' })
  userId!: string;

  /** Pathway module code (01-00) — Fort-equivalent of section lesson id for this site. */
  @Column({ type: 'varchar', length: 20 })
  pathwayCode!: string;

  /** LMS `courses.id` (optional until admin links Course → Module → Section). */
  @Column({ type: 'uuid', nullable: true })
  courseId?: string | null;

  /** LMS `course_modules.id` */
  @Column({ type: 'uuid', nullable: true })
  moduleId?: string | null;

  /** LMS `course_module_sections.id` */
  @Column({ type: 'uuid', nullable: true })
  sectionId?: string | null;

  @Column({ type: 'double precision', default: 0 })
  lastPositionSeconds!: number;

  @Column({ type: 'int', default: 0 })
  watchedSeconds!: number;

  /** Merged [start,end] second ranges on the video timeline (unique coverage). */
  @Column({ type: 'json', nullable: true })
  watchedCoverageRanges?: [number, number][] | null;

  @Column({ type: 'int', default: 0 })
  durationSeconds!: number;

  @Column({ type: 'int', default: 0 })
  videoDurationSeconds!: number;

  @Column({ type: 'int', default: 0 })
  remainingSeconds!: number;

  @Column({ type: 'int', default: 0 })
  requiredSeconds!: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  completionPercent!: number;

  @Column({ type: 'boolean', default: false })
  isCompleted!: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true })
  sourceVideoUrl?: string | null;

  @Column({ type: 'timestamp' })
  lastAccessedAt!: Date;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}

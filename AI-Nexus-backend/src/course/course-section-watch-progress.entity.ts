import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from '../user/users.entity';
import { CourseEntity } from './courses.entity';
import { CourseModuleSectionEntity } from './course-module-section.entity';

@Entity('course_section_watch_progress')
@Unique(['userId', 'courseId', 'sectionId'])
export class CourseSectionWatchProgressEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: UserEntity;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => CourseEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course!: CourseEntity;

  @Column({ type: 'uuid' })
  courseId!: string;

  @ManyToOne(() => CourseModuleSectionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sectionId' })
  section!: CourseModuleSectionEntity;

  @Column({ type: 'uuid' })
  sectionId!: string;

  @Column({ type: 'int', default: 0 })
  lastPositionSeconds!: number;

  @Column({ type: 'int', default: 0 })
  watchedSeconds!: number;

  /** Merged [start,end] second ranges on the video timeline (unique coverage; rewatches overlap). */
  @Column({ type: 'json', nullable: true })
  watchedCoverageRanges?: [number, number][] | null;

  @Column({ type: 'int', default: 0 })
  durationSeconds!: number;

  @Column({ type: 'int', default: 0 })
  remainingSeconds!: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  completionPercent!: number;

  @Column({ type: 'boolean', default: false })
  isCompleted!: boolean;

  @Column({ type: 'timestamp' })
  lastAccessedAt!: Date;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}


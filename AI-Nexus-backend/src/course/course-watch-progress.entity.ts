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

@Entity('course_watch_progress')
@Unique(['userId', 'courseId'])
export class CourseWatchProgressEntity {
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

  @Column({ type: 'int', default: 0 })
  watchedSeconds!: number;

  @Column({ type: 'int', default: 0 })
  totalDurationSeconds!: number;

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


import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum CourseQuestionAttemptStatus {
  Started = 'started',
  Completed = 'completed',
}

@Entity('course_question_bank_attempt')
export class CourseQuestionBankAttemptEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'uuid' })
  courseId!: string;

  @Column({ type: 'uuid', nullable: true })
  moduleId!: string | null;

  @Column({ type: 'int', default: 1 })
  attemptNumber!: number;

  @Column({ type: 'varchar', length: 24, default: CourseQuestionAttemptStatus.Started })
  status!: CourseQuestionAttemptStatus;

  @Column({ type: 'timestamp', nullable: true })
  startedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  completedAt!: Date | null;

  @Column({ type: 'int', default: 0 })
  totalQuestions!: number;

  @Column({ type: 'int', default: 0 })
  answeredQuestions!: number;

  @Column({ type: 'int', default: 0 })
  correctAnswers!: number;

  @Column({ type: 'float', default: 0 })
  scorePercent!: number;

  @Column({ type: 'boolean', default: false })
  isCompleted!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  answers!: Record<string, unknown>[] | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}


import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

import {
  AssignmentEvaluationStatus,
  AssignmentSubmissionAttemptRecord,
} from './course-assignment-submission-evaluation.types';
import { AssignmentSubmissionFileRecord } from './course-assignment-file.types';

@Entity('course_question_assignment_submissions')
export class CourseQuestionAssignmentSubmissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  questionId!: string;

  @Column({ type: 'uuid' })
  courseId!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'text', nullable: true })
  fileUrl?: string | null;

  @Column({ type: 'text', nullable: true })
  originalFileName?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  submissionFiles?: AssignmentSubmissionFileRecord[] | null;

  @Column({ type: 'timestamp', nullable: true })
  submittedAt?: Date | null;

  @Column({ type: 'varchar', length: 32, default: 'pending' })
  evaluationStatus!: AssignmentEvaluationStatus;

  @Column({ type: 'int', nullable: true })
  aiScore?: number | null;

  @Column({ type: 'boolean', nullable: true })
  aiPassed?: boolean | null;

  @Column({ type: 'text', nullable: true })
  aiFeedback?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  aiRawResult?: Record<string, unknown> | null;

  @Column({ type: 'timestamp', nullable: true })
  aiEvaluatedAt?: Date | null;

  @Column({ type: 'boolean', nullable: true })
  manualPassed?: boolean | null;

  @Column({ type: 'text', nullable: true })
  manualFeedback?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  manualVerifiedAt?: Date | null;

  @Column({ type: 'uuid', nullable: true })
  manualVerifiedBy?: string | null;

  @Column({ type: 'int', default: 1 })
  attemptCount!: number;

  @Column({ type: 'jsonb', nullable: true })
  attemptHistory?: AssignmentSubmissionAttemptRecord[] | null;

  @CreateDateColumn({ type: 'timestamp' })
  uploadedAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}

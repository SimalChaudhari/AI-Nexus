import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { AssessmentAnswerSource } from '../assessment-evaluation.types';

@Entity('assessment_submission_answers')
@Index(['submissionId', 'assessmentQuestionId'], { unique: true })
export class AssessmentSubmissionAnswerEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  submissionId!: string;

  @Column({ type: 'uuid' })
  assessmentQuestionId!: string;

  @Column({ type: 'text' })
  answerText!: string;

  @Column({ type: 'varchar', length: 16, default: 'file' })
  source!: AssessmentAnswerSource;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

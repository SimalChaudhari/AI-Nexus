import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import {
  AssessmentQuestionEvaluationStatus,
  PerQuestionEvaluationResult,
} from '../assessment-evaluation.types';

@Entity('assessment_question_evaluations')
@Index(['submissionId', 'assessmentQuestionId'], { unique: true })
export class AssessmentQuestionEvaluationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  submissionId!: string;

  @Column({ type: 'uuid' })
  assessmentQuestionId!: string;

  @Column({ type: 'varchar', length: 24, default: 'pending' })
  status!: AssessmentQuestionEvaluationStatus;

  @Column({ type: 'jsonb', nullable: true })
  result!: PerQuestionEvaluationResult | null;

  @Column({ type: 'int', nullable: true })
  promptTokens!: number | null;

  @Column({ type: 'int', nullable: true })
  completionTokens!: number | null;

  @Column({ type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  evaluatedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

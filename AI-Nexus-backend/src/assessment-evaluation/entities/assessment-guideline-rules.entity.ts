import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { AssessmentGuidelineRulesPayload } from '../assessment-evaluation.types';

@Entity('assessment_guideline_rules')
@Index(['blueprintId'], { unique: true })
export class AssessmentGuidelineRulesEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  blueprintId!: string;

  @Column({ type: 'varchar', length: 64 })
  sourceFileHash!: string;

  @Column({ type: 'jsonb' })
  rules!: AssessmentGuidelineRulesPayload;

  @Column({ type: 'int', nullable: true })
  sourceTokenEstimate!: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

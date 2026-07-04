import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { AssessmentBlueprintStatus } from '../assessment-evaluation.types';

@Entity('assessment_blueprints')
@Index(['questionBankId'], { unique: true })
export class AssessmentBlueprintEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  questionBankId!: string;

  @Column({ type: 'uuid' })
  courseId!: string;

  @Column({ type: 'varchar', length: 32, default: 'pending' })
  status!: AssessmentBlueprintStatus;

  @Column({ type: 'int', default: 0 })
  totalMarks!: number;

  @Column({ type: 'int', nullable: true })
  passingPercentage!: number | null;

  @Column({ type: 'text', nullable: true })
  processingError!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  sourceContentHash!: string | null;

  @Column({ type: 'uuid', nullable: true })
  guidelineRulesId!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  processedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

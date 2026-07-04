import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('assessment_questions')
@Index(['blueprintId', 'questionNumber'], { unique: true })
export class AssessmentQuestionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  blueprintId!: string;

  @Column({ type: 'int' })
  questionNumber!: number;

  @Column({ type: 'varchar', length: 16 })
  label!: string;

  @Column({ type: 'text' })
  promptText!: string;

  @Column({ type: 'text' })
  expectedAnswerText!: string;

  @Column({ type: 'numeric', precision: 8, scale: 2, default: 1 })
  maxScore!: number;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum CourseQuestionType {
  Mcq = 'mcq',
  TrueFalse = 'true_false',
  ShortText = 'short_text',
}

@Entity('course_question_bank')
export class CourseQuestionBankEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  courseId!: string;

  /** Optional link to a course module (one bank per module, not per lesson). */
  @Column({ type: 'uuid', nullable: true })
  moduleId?: string | null;

  @Column({ type: 'text' })
  prompt!: string;

  @Column({ type: 'varchar', length: 32, default: CourseQuestionType.Mcq })
  questionType!: string;

  /** MCQ choices */
  @Column({ type: 'jsonb', nullable: true })
  options?: string[] | null;

  /** MCQ: 0-based index into options */
  @Column({ type: 'int', nullable: true })
  correctIndex?: number | null;

  /** true_false: "true" | "short_text": reference answer */
  @Column({ type: 'text', nullable: true })
  correctAnswer?: string | null;

  @Column({ type: 'text', nullable: true })
  explanation?: string | null;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}

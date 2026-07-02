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
  Assignment = 'assignment',
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

  /** assignment: optional list of user ids; empty/null means all enrolled learners */
  @Column({ type: 'jsonb', nullable: true })
  assignedUserIds?: string[] | null;

  /** assignment: learner question file (PDF/DOC/ZIP, etc.) */
  @Column({ type: 'text', nullable: true })
  questionFileUrl?: string | null;

  @Column({ type: 'text', nullable: true })
  questionFileName?: string | null;

  /** assignment: official answer sheet used by AI grading */
  @Column({ type: 'text', nullable: true })
  answerSheetFileUrl?: string | null;

  @Column({ type: 'text', nullable: true })
  answerSheetFileName?: string | null;

  /** assignment: optional learner guide (PDF/DOC/DOCX) */
  @Column({ type: 'text', nullable: true })
  guideFileUrl?: string | null;

  @Column({ type: 'text', nullable: true })
  guideFileName?: string | null;

  /** assignment: minimum score to pass (0–100). Falls back to env default when null. */
  @Column({ type: 'int', nullable: true })
  passingPercentage?: number | null;

  /** @deprecated Use guideFileUrl — kept for legacy assessments */
  @Column({ type: 'text', nullable: true })
  referenceFileUrl?: string | null;

  /** @deprecated Use guideFileName */
  @Column({ type: 'text', nullable: true })
  referenceFileName?: string | null;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}

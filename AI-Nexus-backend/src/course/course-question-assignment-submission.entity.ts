import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

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

  @Column({ type: 'text' })
  fileUrl!: string;

  @Column({ type: 'text' })
  originalFileName!: string;

  @CreateDateColumn({ type: 'timestamp' })
  uploadedAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}

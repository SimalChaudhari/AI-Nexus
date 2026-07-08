import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('course_module_sections')
export class CourseModuleSectionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  moduleId!: string;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  subtitle?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  videoUrl?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text', nullable: true })
  content?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  watchtime?: string | null;

  /** Full video length from metadata (HH:MM:SS); separate from admin watchtime / completion threshold */
  @Column({ type: 'varchar', length: 50, nullable: true })
  durationTime?: string | null;

  /**
   * Admin threshold (1–100). When set, unique watch coverage at or above this % of video duration
   * marks the lesson completed. Overrides absolute watchtime when present.
   */
  @Column({ type: 'int', nullable: true })
  completionPercentage?: number | null;

  @Column({ type: 'jsonb', nullable: true })
  images?: string[];

  @Column({ type: 'jsonb', nullable: true })
  attachments?: string[];

  @Column({ type: 'jsonb', nullable: true })
  learningMaterials?: string[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}

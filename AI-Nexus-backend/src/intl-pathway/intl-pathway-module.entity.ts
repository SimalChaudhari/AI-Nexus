import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('intl_pathway_modules')
export class IntlPathwayModuleEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 20 })
  code!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'varchar', length: 10 })
  pillar!: string;

  @Column({ type: 'int', default: 0 })
  minutes!: number;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  videoUrl?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  bullets?: string[] | null;

  /** LMS `courses.id` (Fort course). */
  @Column({ type: 'uuid', nullable: true })
  courseId?: string | null;

  /** LMS `course_modules.id` — one module can have many sections. */
  @Column({ type: 'uuid', nullable: true })
  moduleId?: string | null;

  /** LMS `course_module_sections.id` — watch progress keys off this (Fort sectionId). */
  @Index()
  @Column({ type: 'uuid', nullable: true })
  sectionId?: string | null;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ type: 'boolean', default: false })
  deleted!: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}

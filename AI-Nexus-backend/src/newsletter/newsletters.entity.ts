import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type NewsletterFormat = 'html' | 'pdf';

@Entity('newsletters')
export class NewsletterEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true, default: null })
  summary?: string | null;

  @Column({ type: 'varchar', length: 8, default: 'html' })
  format!: NewsletterFormat;

  @Column({ type: 'varchar', length: 2048 })
  fileUrl!: string;

  @Column({ type: 'varchar', length: 255, nullable: true, default: null })
  originalFileName?: string | null;

  /** When set, the newsletter is public only after this time. */
  @Column({ type: 'timestamp', nullable: true, default: null })
  publishAt?: Date | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type SkillExtraField = {
  key: string;
  value: string;
};

@Entity('skills')
export class SkillEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** YAML `name` — lowercase letters, numbers, hyphens (e.g. charlie, pptx). */
  @Column({ type: 'varchar', length: 64, unique: true })
  name!: string;

  /** Display title (usually the SKILL.md H1). */
  @Column({ type: 'varchar', length: 255 })
  title!: string;

  /** YAML `description` — when to use this skill. */
  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'varchar', length: 255, nullable: true, default: null })
  license?: string | null;

  @Column({ type: 'varchar', length: 2048, nullable: true, default: null })
  sourceUrl?: string | null;

  /** Markdown body of SKILL.md (everything after the YAML frontmatter). */
  @Column({ type: 'text' })
  content!: string;

  /** Extra YAML / custom key-value fields (license extras, flags, etc.). */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  extraFields!: SkillExtraField[];

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}

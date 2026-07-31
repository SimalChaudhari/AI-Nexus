import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('intl_pathway_roles')
export class IntlPathwayRoleEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  blurb?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  reqExclude?: string[] | null;

  @Column({ type: 'jsonb', nullable: true })
  reqAdd?: string[] | null;

  @Column({ type: 'text', nullable: true })
  reqNote?: string | null;

  /** moduleCode -> tier (1 optional, 2 recommended, 3 essential) */
  @Column({ type: 'jsonb', nullable: true })
  scores?: Record<string, number> | null;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ type: 'boolean', default: false })
  deleted!: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}

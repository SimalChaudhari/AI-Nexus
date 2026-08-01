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

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ type: 'boolean', default: false })
  deleted!: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}

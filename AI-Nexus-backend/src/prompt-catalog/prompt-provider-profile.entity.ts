import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { PromptProvider } from './prompt-catalog.entity';

@Entity('prompt_provider_profiles')
export class PromptProviderProfileEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: PromptProvider, unique: true })
  provider!: PromptProvider;

  @Column({ type: 'varchar' })
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'varchar', default: 'primary.main' })
  color!: string;

  @Column({ type: 'varchar', default: 'primary.main' })
  bgColor!: string;

  @Column({ type: 'varchar' })
  icon!: string;

  @Column({ type: 'varchar' })
  detailTitle!: string;

  @Column({ type: 'varchar', nullable: true, default: null })
  redirectUrl?: string | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}


import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PromptProvider {
  CHATGPT = 'chatgpt',
  GEMINI = 'gemini',
  CLAUDE = 'claude',
}

@Entity('prompt_catalog_items')
export class PromptCatalogItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: PromptProvider,
    array: true,
    default: [PromptProvider.CHATGPT],
  })
  providers!: PromptProvider[];

  /**
   * Legacy single-provider column kept for backward DB compatibility.
   * New logic uses `providers` array; this is auto-filled from the first selected provider.
   */
  @Column({
    name: 'provider',
    type: 'enum',
    enum: PromptProvider,
    nullable: true,
    select: false,
  })
  providerLegacy?: PromptProvider | null;

  @Column({ type: 'varchar', nullable: true, default: null })
  category?: string | null;

  @Column({ type: 'varchar' })
  sectionTitle!: string;

  @Column({ type: 'int', default: 0 })
  sectionOrder!: number;

  @Column({ type: 'int', default: 0 })
  itemOrder!: number;

  @Column({ type: 'text' })
  useCase!: string;

  @Column({ type: 'text' })
  prompt!: string;

  /**
   * Stable key matching `promptCatalogMergeKey` during external sync (topic + use case).
   * Used to re-apply admin-edited prompt bodies after sync.
   */
  @Column({ type: 'varchar', length: 2048, nullable: true, default: null })
  syncMergeKey?: string | null;

  /** When true, `syncFromExternalProviders` keeps this row's `prompt` for the same merge key. */
  @Column({ type: 'boolean', default: false })
  adminPromptLocked!: boolean;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}

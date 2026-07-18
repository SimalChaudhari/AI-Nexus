import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('corporate_bulk_enrolment_uploads')
@Index(['companyCode'])
@Index(['createdAt'])
export class CorporateBulkEnrolmentUploadEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120 })
  companyCode!: string;

  @Column({ type: 'uuid', nullable: true })
  uploadedByUserId!: string | null;

  /** Original client file name (for display / Content-Disposition). */
  @Column({ type: 'varchar', length: 255 })
  originalFileName!: string;

  /** Private on-disk file name under storage/corporate-bulk-enrolments (not publicly served). */
  @Column({ type: 'varchar', length: 255 })
  storedFileName!: string;

  @Column({ type: 'bigint', default: 0 })
  sizeBytes!: number;

  @Column({ type: 'varchar', length: 120, nullable: true })
  mimeType!: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}

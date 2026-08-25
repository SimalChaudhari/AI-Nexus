import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { InternationalUserEntity } from '../intl-auth/international-user.entity';

export enum IntlPathwayCertificateStatus {
  Active = 'active',
  Blocked = 'blocked',
}

@Entity('intl_pathway_certificates')
@Unique(['userId', 'planKey'])
@Unique(['certificateNo'])
@Index(['userId'])
export class IntlPathwayCertificateEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => InternationalUserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: InternationalUserEntity;

  @Column({ type: 'uuid' })
  userId!: string;

  /** student | full */
  @Column({ type: 'varchar', length: 20 })
  planKey!: string;

  @Column({ type: 'varchar', length: 80 })
  certificateNo!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  pdfUrl?: string | null;

  @Column({ type: 'timestamp' })
  completedAt!: Date;

  @Column({ type: 'varchar', length: 20, default: IntlPathwayCertificateStatus.Active })
  status!: IntlPathwayCertificateStatus;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}

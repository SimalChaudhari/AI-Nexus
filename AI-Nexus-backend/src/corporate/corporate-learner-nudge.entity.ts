import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity('corporate_learner_nudges')
@Unique(['companyCode', 'userId'])
@Index(['companyCode'])
@Index(['userId'])
export class CorporateLearnerNudgeEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120 })
  companyCode!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'timestamp' })
  lastNudgedAt!: Date;

  @Column({ type: 'int', default: 1 })
  nudgeCount!: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { UserEntity } from '../user/users.entity';

@Entity('push_subscriptions')
@Unique('UQ_push_subscriptions_endpoint', ['endpoint'])
export class PushSubscriptionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('IDX_push_subscriptions_userId')
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: UserEntity;

  @Column({ type: 'text' })
  endpoint!: string;

  @Column({ type: 'varchar', length: 255 })
  p256dh!: string;

  @Column({ type: 'varchar', length: 255 })
  auth!: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}

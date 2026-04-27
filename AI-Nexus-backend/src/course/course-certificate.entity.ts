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
import { UserEntity } from '../user/users.entity';
import { CourseEntity } from './courses.entity';

export enum CourseCertificateStatus {
  Active = 'active',
  Blocked = 'blocked',
  Deleted = 'deleted',
}

@Entity('course_certificates')
@Unique(['userId', 'courseId'])
@Unique(['certificateNo'])
@Index(['userId'])
@Index(['courseId'])
export class CourseCertificateEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'uuid' })
  courseId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: UserEntity;

  @ManyToOne(() => CourseEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course!: CourseEntity;

  @Column({ type: 'varchar', length: 80 })
  certificateNo!: string;

  @Column({ type: 'timestamp' })
  completedAt!: Date;

  @Column({
    type: 'enum',
    enum: CourseCertificateStatus,
    default: CourseCertificateStatus.Active,
  })
  status!: CourseCertificateStatus;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt?: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}

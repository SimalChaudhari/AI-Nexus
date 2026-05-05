import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum CourseOptionType {
  Level = 'level',
  Role = 'role',
  AiLevel = 'aiLevel',
  Goal = 'goal',
  UseArea = 'useArea',
}

@Entity('course_options')
export class CourseOptionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  type!: CourseOptionType;

  @Column({ type: 'varchar' })
  label!: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}


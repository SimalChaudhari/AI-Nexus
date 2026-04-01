import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Unique, Index } from 'typeorm';
import { UserEntity } from '../user/users.entity';
import { CourseModuleSectionEntity } from './course-module-section.entity';

@Entity('course_section_favorites')
@Unique(['userId', 'sectionId'])
@Index(['userId'])
@Index(['sectionId'])
export class CourseSectionFavoriteEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid' })
    userId!: string;

    @Column({ type: 'uuid' })
    sectionId!: string;

    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user!: UserEntity;

    @ManyToOne(() => CourseModuleSectionEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'sectionId' })
    section!: CourseModuleSectionEntity;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;
}

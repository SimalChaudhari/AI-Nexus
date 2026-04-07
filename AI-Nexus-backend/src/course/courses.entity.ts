import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum CourseLevel {
    Beginner = 'Beginner',
    Intermediate = 'Intermediate',
    Advanced = 'Advanced',
}

@Entity('courses')
export class CourseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar' })
    title!: string;

    @Column({ type: 'text', nullable: true })
    description?: string;

    @Column({ type: 'text', nullable: true })
    image?: string | null; // Store file path

    @Column({ type: 'boolean', default: false })
    freeOrPaid!: boolean; // false = free, true = paid

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
    amount?: number; // Price amount if paid

    @Column({ type: 'varchar', default: CourseLevel.Beginner })
    level!: string;

    /** Language IDs this course is available in (array of UUIDs) */
    @Column({ type: 'jsonb', nullable: true })
    languageIds?: string[];

    /** speaker IDs (instructors/speakers) for this course */
    @Column({ type: 'jsonb', nullable: true })
    speakerIds?: string[];

    /** Optional market data (plain string, stored as JSON string in jsonb column) */
    @Column({
      type: 'jsonb',
      nullable: true,
      transformer: {
        to: (value: string | null | undefined) =>
          value == null || value === '' ? null : JSON.stringify(value),
        from: (value: string | null | undefined) =>
          value == null ? undefined : (typeof value === 'string' ? value : JSON.stringify(value)),
      },
    })
    marketData?: string;

    /** When true, this course is a bundle listing other courses (see bundleCourseIds). */
    @Column({ type: 'boolean', default: false })
    isBundle!: boolean;

    /** Course IDs included in this bundle (only meaningful when isBundle is true). */
    @Column({ type: 'jsonb', nullable: true })
    bundleCourseIds?: string[] | null;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt!: Date;
}


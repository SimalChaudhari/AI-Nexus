import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum CategoryStatus {
    Active = 'active',
    Inactive = 'inactive',
}

@Entity('categories')
export class CategoryEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar' })
    title!: string;

    @Column({ type: 'varchar', nullable: true })
    icon?: string;

    @Column({
        type: 'enum',
        enum: CategoryStatus,
        default: CategoryStatus.Active,
    })
    status!: CategoryStatus;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt!: Date;
}


import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

export enum ProgramStatus {
    Active = 'active',
    Inactive = 'inactive',
}

@Entity('programs')
export class ProgramEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar' })
    title!: string;

    @Column({ type: 'text', nullable: true })
    description?: string | null;

    @Column({
        type: 'enum',
        enum: ProgramStatus,
        default: ProgramStatus.Active,
    })
    status!: ProgramStatus;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt!: Date;
}

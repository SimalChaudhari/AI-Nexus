import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    ManyToMany,
    JoinColumn,
    JoinTable,
} from 'typeorm';
import { LabelEntity } from '../label/labels.entity';
import { TagEntity } from '../tag/tags.entity';

@Entity('workflows')
export class WorkflowEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar' })
    title!: string;

    @Column({ type: 'text', nullable: true })
    description?: string;

    @Column({ type: 'text', nullable: true })
    image?: string | null; // Store file path

    @Column({ type: 'jsonb', nullable: true })
    flowData?: {
        nodes?: any[];
        edges?: any[];
    };

    @Column({ type: 'uuid', nullable: true })
    labelId?: string;

    @ManyToOne(() => LabelEntity, { cascade: false, nullable: true })
    @JoinColumn({ name: 'labelId' })
    label?: LabelEntity;

    @ManyToMany(() => TagEntity, { cascade: false })
    @JoinTable({
        name: 'workflow_tags',
        joinColumn: { name: 'workflowId', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'tagId', referencedColumnName: 'id' },
    })
    tags?: TagEntity[];

    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt!: Date;
}


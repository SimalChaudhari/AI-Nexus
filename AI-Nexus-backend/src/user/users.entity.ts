import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum UserRole {
    Admin = 'Admin',
    User = 'User',
}

export enum UserStatus {
    Active = 'active',
    Banned = 'banned',
}

export enum AuthProvider {
    LOCAL = 'LOCAL',
    OAUTH = 'OAUTH',
}

@Entity('users')
export class UserEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', unique: true })
    username!: string;

    @Column({ type: 'varchar' })
    firstname!: string;

    @Column({ type: 'varchar' })
    lastname!: string;

    @Column({ type: 'varchar', unique: true })
    email!: string;

    /** Empty for OAuth users; required for LOCAL. */
    @Column({ type: 'varchar', nullable: true })
    password!: string | null;

    @Column({
        type: 'enum',
        enum: AuthProvider,
        default: AuthProvider.LOCAL,
    })
    authProvider: AuthProvider = AuthProvider.LOCAL;

    @Column({ nullable: true, type: 'varchar' })
    socialId?: string | null;

    @Column({ nullable: true, type: 'varchar' })
    socialAccessToken?: string | null;

    @Column({ nullable: true, type: 'varchar' })
    avatarUrl?: string | null;

    @Column({ type: 'boolean', default: false })
    isVerified!: boolean;

    @Column({
        type: 'enum',
        enum: UserRole,
        default: UserRole.User,
    })
    role!: UserRole;

    @Column({
        type: 'enum',
        enum: UserStatus,
        default: UserStatus.Active,
    })
    status!: UserStatus;

    @Column({ nullable: true, type: 'varchar' })
    verificationToken?: string | null;

    @Column({ nullable: true, type: 'timestamp' })
    verificationTokenExpires?: Date | null;

    @Column({ nullable: true, type: 'varchar' })
    resetToken?: string | null;

    @Column({ nullable: true, type: 'timestamp' })
    resetTokenExpires?: Date | null;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt!: Date;
}

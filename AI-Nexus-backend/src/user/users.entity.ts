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

    @Column({ type: 'varchar', unique: true, nullable: true })
    username!: string | null;

    @Column({ type: 'varchar' })
    firstname!: string;

    @Column({ type: 'varchar' })
    lastname!: string;

    @Column({ type: 'varchar', unique: true, nullable: true })
    email!: string | null;

    @Column({ type: 'varchar', nullable: true })
    persona!: string | null;

    @Column({ type: 'varchar', nullable: true })
    aiExperienceLevel!: string | null;

    @Column({ type: 'jsonb', nullable: true })
    aiLearningGoals!: string[] | null;

    @Column({ type: 'jsonb', nullable: true })
    aiUseAreas!: string[] | null;

    @Column({ type: 'varchar', nullable: true })
    financeRole!: string | null;

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

    @Column({ type: 'boolean', default: false })
    isDraft!: boolean;

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

    @Column({ nullable: true, type: 'varchar' })
    signupAccessTokenHash!: string | null;

    @Column({ nullable: true, type: 'timestamp' })
    signupAccessTokenExpiresAt!: Date | null;

    @Column({ type: 'varchar', nullable: true })
    nricFinType!: string | null;

    @Column({ type: 'varchar', nullable: true })
    nricFinSeries!: string | null;

    @Column({ type: 'varchar', nullable: true })
    nricFinValue!: string | null;

    @Column({ type: 'varchar', nullable: true })
    nricFinMasked!: string | null;

    @Column({ type: 'varchar', nullable: true })
    nricFinCanonicalValue!: string | null;

    @Column({ type: 'varchar', nullable: true })
    nricFinCanonicalMasked!: string | null;

    @Column({ type: 'text', nullable: true })
    nricFinValueEncrypted!: string | null;

    @Column({ type: 'varchar', nullable: true })
    nricFinCanonicalHash!: string | null;

    @Column({ type: 'varchar', nullable: true })
    nricExtractedFullName!: string | null;

    @Column({ type: 'varchar', nullable: true })
    nricExtractedDateOfBirth!: string | null;

    @Column({ type: 'varchar', nullable: true })
    nricExtractedNationality!: string | null;

    @Column({ type: 'varchar', nullable: true })
    nricExtractedSex!: string | null;

    @Column({ type: 'text', nullable: true })
    nricExtractedAddress!: string | null;

    @Column({ type: 'float', nullable: true })
    nricVerificationConfidence!: number | null;

    @Column({ type: 'boolean', default: false })
    spPrStatusVerified!: boolean;

    @Column({ nullable: true, type: 'varchar' })
    nricVerificationSource!: string | null;

    @Column({ nullable: true, type: 'timestamp' })
    spPrStatusVerifiedAt!: Date | null;

    @Column({ type: 'boolean', nullable: true })
    eligibilityIsSingaporePr!: boolean | null;

    @Column({ type: 'boolean', nullable: true })
    eligibilityIsIscaMember!: boolean | null;

    @Column({ type: 'boolean', nullable: true })
    eligibilityWantsMembership!: boolean | null;

    @Column({ type: 'varchar', nullable: true })
    eligibilityType!: string | null;

    @Column({ type: 'jsonb', nullable: true })
    eligibilitySnapshot!: Record<string, unknown> | null;

    @Column({ nullable: true, type: 'timestamp' })
    eligibilityCheckedAt!: Date | null;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt!: Date;
}

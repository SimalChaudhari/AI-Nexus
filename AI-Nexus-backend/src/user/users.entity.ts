import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum UserRole {
    Admin = 'Admin',
    User = 'User',
    /** HR / company portal account (password now; SSO later). */
    Corporate = 'Corporate',
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

    /**
     * Not globally unique: one Individual (`User`) + one `Corporate` row may share an email.
     * Uniqueness is enforced in app logic / indexes per (email, role) when needed.
     */
    @Column({ type: 'varchar', nullable: true })
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

    /** E.164 or formatted contact number (mobile / phone) */
    @Column({ nullable: true, type: 'varchar', length: 48 })
    contactNumber?: string | null;

    /** Optional organization/company invite/reference code entered during signup/profile edit */
    @Column({ nullable: true, type: 'varchar', length: 64 })
    companyCode?: string | null;

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
    nricFinCanonicalValue!: string | null;

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

    /** Salesforce Account record Id returned by /services/apexrest/userinfonexus */
    @Column({ type: 'varchar', nullable: true })
    salesforceAccountId!: string | null;

    /** Salesforce account type, e.g. "Non member", "Associate", "Member" */
    @Column({ type: 'varchar', nullable: true })
    salesforceAccountType!: string | null;

    /** Salesforce member class label from the nexus user info endpoint */
    @Column({ type: 'varchar', nullable: true })
    salesforceMemberClass!: string | null;

    /** Username/email returned by the Salesforce nexus endpoint (may differ from local username) */
    @Column({ type: 'varchar', nullable: true })
    salesforceUsername!: string | null;

    /** True when Salesforce confirms the user is an existing SCAQ Programme candidate */
    @Column({ type: 'boolean', nullable: true })
    isSCAQCandidate!: boolean | null;

    /** True when Salesforce confirms the user is already an Associate member */
    @Column({ type: 'boolean', nullable: true })
    isAssociateMember!: boolean | null;

    /** Raw payload from the Salesforce nexus user info endpoint (audit/debug) */
    @Column({ type: 'jsonb', nullable: true })
    salesforceUserInfoRaw!: Record<string, unknown> | null;

    /** Last time we synced Salesforce nexus user info for this user */
    @Column({ nullable: true, type: 'timestamp' })
    salesforceSyncedAt!: Date | null;

    /** True when fee-waiver job role audit (HR or certificate) is verified */
    @Column({ type: 'boolean', nullable: true })
    feeWaiverJobVerified!: boolean | null;

    /** Last successful platform login (password or SSO session issue). Not token refresh. */
    @Column({ nullable: true, type: 'timestamp' })
    lastLoginAt!: Date | null;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt!: Date;
}

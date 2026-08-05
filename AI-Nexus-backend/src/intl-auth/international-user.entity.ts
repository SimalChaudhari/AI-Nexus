import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum InternationalAuthProvider {
  LOCAL = 'LOCAL',
  OAUTH = 'OAUTH',
}

export enum InternationalUserStatus {
  Active = 'active',
  Banned = 'banned',
}

@Entity('international_users')
export class InternationalUserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 120 })
  email!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 120, nullable: true })
  username!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  salutation!: string | null;

  @Column({ type: 'varchar', length: 80 })
  firstname!: string;

  @Column({ type: 'varchar', length: 80 })
  lastname!: string;

  /** Empty for future OAuth users; required for LOCAL. */
  @Column({ type: 'varchar', nullable: true })
  password!: string | null;

  @Column({
    type: 'varchar',
    length: 16,
    default: InternationalAuthProvider.LOCAL,
  })
  authProvider: InternationalAuthProvider = InternationalAuthProvider.LOCAL;

  @Column({ type: 'varchar', nullable: true })
  socialId!: string | null;

  @Column({ type: 'varchar', nullable: true })
  socialAccessToken!: string | null;

  @Column({ type: 'varchar', nullable: true })
  avatarUrl!: string | null;

  @Column({ type: 'varchar', length: 48, nullable: true })
  contactNumber!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  companyCode!: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  company!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  jobFunction!: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  jobFunctionOther!: string | null;

  @Column({ type: 'int', nullable: true })
  yearsOfExperience!: number | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  countryOfResidence!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  promoCode!: string | null;

  @Column({ type: 'boolean', default: true })
  isVerified!: boolean;

  @Column({
    type: 'varchar',
    length: 16,
    default: InternationalUserStatus.Active,
  })
  status!: InternationalUserStatus;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}

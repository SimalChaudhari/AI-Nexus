import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';

import { AuthProvider, UserEntity, UserRole, UserStatus } from '../user/users.entity';

/** Demo HR login until Corporate SSO is wired. */
export const CORPORATE_DEMO_EMAIL = 'corporate.hr@ainexus.demo';
export const CORPORATE_DEMO_USERNAME = 'corporatehr';
export const CORPORATE_DEMO_PASSWORD = 'Corporate@123';

@Injectable()
export class CorporateDemoSeedService implements OnModuleInit {
  private readonly logger = new Logger(CorporateDemoSeedService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  private async ensureCorporateRoleEnum(queryRunner?: undefined) {
    await this.userRepository.query(`
      DO $$ BEGIN
        ALTER TYPE "users_role_enum" ADD VALUE 'Corporate';
      EXCEPTION
        WHEN duplicate_object THEN NULL;
        WHEN undefined_object THEN NULL;
      END $$;
    `);
  }

  async onModuleInit() {
    try {
      await this.ensureCorporateRoleEnum();
      await this.ensureDemoCorporateAccount();
    } catch (err) {
      this.logger.error('Failed to seed corporate demo account', err as Error);
    }
  }

  private resolveDemoCompanyCode(): string {
    const fromEnv = String(process.env.CORPORATE_DEMO_COMPANY_CODE || '').trim();
    // Always use a dedicated demo code — never copy a live signup UEN from the DB.
    return fromEnv || 'DEMO-CORP';
  }

  private async ensureDemoCorporateAccount() {
    const companyCode = this.resolveDemoCompanyCode();
    const passwordHash = await bcrypt.hash(CORPORATE_DEMO_PASSWORD, 10);

    let user = await this.userRepository.findOne({
      where: [{ email: CORPORATE_DEMO_EMAIL }, { username: CORPORATE_DEMO_USERNAME }],
    });

    if (!user) {
      user = this.userRepository.create({
        email: CORPORATE_DEMO_EMAIL,
        username: CORPORATE_DEMO_USERNAME,
        firstname: 'Corporate',
        lastname: 'HR',
        password: passwordHash,
        authProvider: AuthProvider.LOCAL,
        role: UserRole.Corporate,
        status: UserStatus.Active,
        isVerified: true,
        isDraft: false,
        companyCode,
        financeRole: 'HR Admin',
      });
      await this.userRepository.save(user);
      this.logger.log(
        `Corporate demo account created: ${CORPORATE_DEMO_EMAIL} / ${CORPORATE_DEMO_PASSWORD} (companyCode=${companyCode})`,
      );
      return;
    }

    let changed = false;
    if (user.role !== UserRole.Corporate) {
      user.role = UserRole.Corporate;
      changed = true;
    }
    if (!user.isVerified) {
      user.isVerified = true;
      changed = true;
    }
    if (user.isDraft) {
      user.isDraft = false;
      changed = true;
    }
    if (user.status !== UserStatus.Active) {
      user.status = UserStatus.Active;
      changed = true;
    }
    // Always keep demo HR on the dedicated company code (do not inherit old UENs).
    if (String(user.companyCode || '').trim() !== companyCode) {
      user.companyCode = companyCode;
      changed = true;
    }
    if (!user.password) {
      user.password = passwordHash;
      changed = true;
    }
    // Keep password reset to demo password on each boot for easy local testing.
    if (process.env.CORPORATE_DEMO_RESET_PASSWORD !== '0') {
      user.password = passwordHash;
      changed = true;
    }

    if (changed) {
      await this.userRepository.save(user);
      this.logger.log(
        `Corporate demo account updated: ${CORPORATE_DEMO_EMAIL} (companyCode=${user.companyCode})`,
      );
    }
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { AuthProvider, UserEntity, UserRole, UserStatus } from '../user/users.entity';
import { AppSettingsService } from '../app-settings/app-settings.service';
import { AffiliateCodeEntity } from './affiliate-code.entity';
import { AffiliateClickEntity } from './affiliate-click.entity';
import { AffiliateSaleEntity, AffiliateSaleStatus } from './affiliate-sale.entity';
import { VoucherCodeEntity } from './voucher-code.entity';
import { AffiliateSignupCheckoutDto, ValidateAffiliateCodeDto } from './affiliate.dto';

export type AffiliateCodeType = 'affiliate' | 'voucher' | null;

export type AffiliatePricingResult = {
  valid: boolean;
  discountApplied: boolean;
  affiliateCode: string | null;
  voucherCode: string | null;
  affiliateValid: boolean;
  voucherValid: boolean;
  affiliateMessage: string | null;
  voucherMessage: string | null;
  appliedCode: string | null;
  codeType: AffiliateCodeType;
  originalAmount: number;
  payableAmount: number;
  currency: string;
  itemName: string;
};

@Injectable()
export class AffiliateService {
  constructor(
    @InjectRepository(AffiliateCodeEntity)
    private readonly affiliateCodeRepo: Repository<AffiliateCodeEntity>,
    @InjectRepository(VoucherCodeEntity)
    private readonly voucherCodeRepo: Repository<VoucherCodeEntity>,
    @InjectRepository(AffiliateClickEntity)
    private readonly clickRepo: Repository<AffiliateClickEntity>,
    @InjectRepository(AffiliateSaleEntity)
    private readonly saleRepo: Repository<AffiliateSaleEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly appSettingsService: AppSettingsService,
  ) {}

  async getOriginalAmount(): Promise<number> {
    const settings = await this.appSettingsService.getMembershipPaymentSettings();
    const raw = Number(settings?.totalAmount);
    return Number.isFinite(raw) && raw > 0 ? raw : 365;
  }

  async getDiscountedAmount(): Promise<number> {
    const settings = await this.appSettingsService.getMembershipPaymentSettings();
    const raw = Number(settings?.voucherDiscountAmount);
    return Number.isFinite(raw) && raw > 0 ? raw : 100;
  }

  async getCurrency(): Promise<string> {
    const settings = await this.appSettingsService.getMembershipPaymentSettings();
    return String(settings?.currency || 'SGD').trim().toUpperCase() || 'SGD';
  }

  normalizeCode(value?: string | null): string {
    return String(value || '').trim().toUpperCase();
  }

  /**
   * Create or reactivate a voucher code so any admin-entered code works on signup.
   * Promo payable amount always comes from membership payment settings.
   */
  async ensureVoucherCode(codeInput?: string | null): Promise<{
    code: string;
    created: boolean;
    reactivated: boolean;
  }> {
    const code = this.normalizeCode(codeInput);
    if (!code) {
      throw new BadRequestException('Promo code is required.');
    }
    if (!/^[A-Z0-9_-]{2,64}$/.test(code)) {
      throw new BadRequestException(
        'Promo code may only contain letters, numbers, underscore or hyphen (2–64 chars).',
      );
    }

    const existing = await this.voucherCodeRepo
      .createQueryBuilder('v')
      .where('UPPER(v.code) = :code', { code })
      .getOne();

    if (existing) {
      let reactivated = false;
      if (!existing.isActive) {
        existing.isActive = true;
        reactivated = true;
      }
      existing.code = code;
      existing.label = existing.label || `Admin promo ${code}`;
      await this.voucherCodeRepo.save(existing);
      return { code, created: false, reactivated };
    }

    await this.voucherCodeRepo.save(
      this.voucherCodeRepo.create({
        code,
        label: `Admin promo ${code}`,
        isActive: true,
        expiresAt: null,
        maxRedemptions: null,
        redemptionCount: 0,
      }),
    );
    return { code, created: true, reactivated: false };
  }

  private serializeVoucher(row: VoucherCodeEntity) {
    return {
      id: row.id,
      code: row.code,
      label: row.label,
      isActive: row.isActive,
      expiresAt: row.expiresAt,
      maxRedemptions: row.maxRedemptions,
      redemptionCount: row.redemptionCount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async listVoucherCodes() {
    const rows = await this.voucherCodeRepo.find({
      order: { updatedAt: 'DESC', createdAt: 'DESC' },
    });
    return rows.map((row) => this.serializeVoucher(row));
  }

  async createVoucherCode(input: {
    code?: string | null;
    label?: string | null;
    isActive?: boolean;
    maxRedemptions?: number | null;
    expiresAt?: string | Date | null;
  }) {
    const code = this.normalizeCode(input.code);
    if (!code) {
      throw new BadRequestException('Promo code is required.');
    }
    if (!/^[A-Z0-9_-]{2,64}$/.test(code)) {
      throw new BadRequestException(
        'Promo code may only contain letters, numbers, underscore or hyphen (2–64 chars).',
      );
    }

    const existing = await this.voucherCodeRepo
      .createQueryBuilder('v')
      .where('UPPER(v.code) = :code', { code })
      .getOne();
    if (existing) {
      throw new BadRequestException(`Promo code ${code} already exists.`);
    }

    const label = String(input.label || '').trim() || `Admin promo ${code}`;
    const saved = await this.voucherCodeRepo.save(
      this.voucherCodeRepo.create({
        code,
        label,
        isActive: input.isActive !== false,
        expiresAt: this.parseExpiresAt(input.expiresAt),
        maxRedemptions: this.parseMaxRedemptions(input.maxRedemptions),
        redemptionCount: 0,
      }),
    );
    return this.serializeVoucher(saved);
  }

  async updateVoucherCode(
    id: string,
    input: {
      code?: string | null;
      label?: string | null;
      isActive?: boolean;
      maxRedemptions?: number | null;
      expiresAt?: string | Date | null;
    },
  ) {
    const row = await this.voucherCodeRepo.findOne({ where: { id } });
    if (!row) {
      throw new BadRequestException('Promo code not found.');
    }

    if (input.code != null) {
      const nextCode = this.normalizeCode(input.code);
      if (!nextCode) {
        throw new BadRequestException('Promo code is required.');
      }
      if (!/^[A-Z0-9_-]{2,64}$/.test(nextCode)) {
        throw new BadRequestException(
          'Promo code may only contain letters, numbers, underscore or hyphen (2–64 chars).',
        );
      }
      const conflict = await this.voucherCodeRepo
        .createQueryBuilder('v')
        .where('UPPER(v.code) = :code', { code: nextCode })
        .andWhere('v.id != :id', { id })
        .getOne();
      if (conflict) {
        throw new BadRequestException(`Promo code ${nextCode} already exists.`);
      }
      row.code = nextCode;
    }

    if (input.label !== undefined) {
      const label = String(input.label || '').trim();
      row.label = label || `Admin promo ${row.code}`;
    }
    if (typeof input.isActive === 'boolean') {
      row.isActive = input.isActive;
    }
    if (input.maxRedemptions !== undefined) {
      row.maxRedemptions = this.parseMaxRedemptions(input.maxRedemptions);
    }
    if (input.expiresAt !== undefined) {
      row.expiresAt = this.parseExpiresAt(input.expiresAt);
    }

    const saved = await this.voucherCodeRepo.save(row);
    return this.serializeVoucher(saved);
  }

  private parseMaxRedemptions(value?: number | string | null): number | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new BadRequestException('User limit must be a whole number of at least 1, or empty for unlimited.');
    }
    return parsed;
  }

  private parseExpiresAt(value?: string | Date | null): Date | null {
    if (value === null || value === undefined || value === '') return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Expire date is invalid.');
    }
    return date;
  }

  async deleteVoucherCode(id: string) {
    const row = await this.voucherCodeRepo.findOne({ where: { id } });
    if (!row) {
      throw new BadRequestException('Promo code not found.');
    }
    await this.voucherCodeRepo.remove(row);
    return { id, code: row.code, deleted: true };
  }

  private isExpired(expiresAt?: Date | null): boolean {
    if (!expiresAt) return false;
    return new Date(expiresAt).getTime() < Date.now();
  }

  async validateAffiliateCode(code?: string | null): Promise<{
    valid: boolean;
    code: string | null;
    message: string | null;
  }> {
    const normalized = this.normalizeCode(code);
    if (!normalized) {
      return { valid: false, code: null, message: null };
    }

    const row = await this.affiliateCodeRepo
      .createQueryBuilder('a')
      .where('UPPER(a.code) = :code', { code: normalized })
      .getOne();

    if (!row) {
      return { valid: false, code: normalized, message: 'Affiliate code does not exist.' };
    }
    if (!row.isActive) {
      return { valid: false, code: normalized, message: 'Affiliate code is inactive.' };
    }
    if (this.isExpired(row.expiresAt)) {
      return { valid: false, code: normalized, message: 'Affiliate code has expired.' };
    }

    return { valid: true, code: normalized, message: 'Affiliate code is valid.' };
  }

  async validateVoucherCode(code?: string | null): Promise<{
    valid: boolean;
    code: string | null;
    message: string | null;
  }> {
    const normalized = this.normalizeCode(code);
    if (!normalized) {
      return { valid: false, code: null, message: null };
    }

    const row = await this.voucherCodeRepo
      .createQueryBuilder('v')
      .where('UPPER(v.code) = :code', { code: normalized })
      .getOne();

    if (!row) {
      return { valid: false, code: normalized, message: 'Voucher code does not exist.' };
    }
    if (!row.isActive) {
      return { valid: false, code: normalized, message: 'Voucher code is inactive.' };
    }
    if (this.isExpired(row.expiresAt)) {
      return { valid: false, code: normalized, message: 'Voucher code has expired.' };
    }
    if (
      row.maxRedemptions != null
      && Number(row.redemptionCount || 0) >= Number(row.maxRedemptions)
    ) {
      return { valid: false, code: normalized, message: 'Voucher code has reached its redemption limit.' };
    }

    return { valid: true, code: normalized, message: 'Voucher code is valid.' };
  }

  async calculatePricing(dto: ValidateAffiliateCodeDto): Promise<AffiliatePricingResult> {
    const [originalAmount, discountedAmount, currency] = await Promise.all([
      this.getOriginalAmount(),
      this.getDiscountedAmount(),
      this.getCurrency(),
    ]);

    // Single `code` field: try affiliate first, then voucher, when explicit
    // affiliateCode/voucherCode are not provided.
    const singleCode = this.normalizeCode(dto.code);
    let affiliateCodeInput = dto.affiliateCode;
    let voucherCodeInput = dto.voucherCode;
    let appliedCode: string | null = null;
    let codeType: AffiliateCodeType = null;

    if (singleCode && !dto.affiliateCode && !dto.voucherCode) {
      const affiliateAttempt = await this.validateAffiliateCode(singleCode);
      if (affiliateAttempt.valid) {
        affiliateCodeInput = singleCode;
        appliedCode = affiliateAttempt.code;
        codeType = 'affiliate';
      } else {
        const voucherAttempt = await this.validateVoucherCode(singleCode);
        if (voucherAttempt.valid) {
          voucherCodeInput = singleCode;
          appliedCode = voucherAttempt.code;
          codeType = 'voucher';
        } else {
          // Neither valid: surface the affiliate code so the caller sees an error message.
          affiliateCodeInput = singleCode;
        }
      }
    }

    const affiliate = await this.validateAffiliateCode(affiliateCodeInput);
    const voucher = await this.validateVoucherCode(voucherCodeInput);
    const discountApplied = affiliate.valid || voucher.valid;

    if (!appliedCode && discountApplied) {
      appliedCode = affiliate.valid ? affiliate.code : voucher.code;
      codeType = affiliate.valid ? 'affiliate' : 'voucher';
    }

    return {
      valid: discountApplied,
      discountApplied,
      affiliateCode: affiliate.code,
      voucherCode: voucher.code,
      affiliateValid: affiliate.valid,
      voucherValid: voucher.valid,
      affiliateMessage: affiliate.message,
      voucherMessage: voucher.message,
      appliedCode,
      codeType,
      originalAmount,
      payableAmount: discountApplied ? discountedAmount : originalAmount,
      currency,
      itemName: discountApplied ? 'Affiliate signup (discounted)' : 'Affiliate signup',
    };
  }

  async trackClick(input: {
    affiliateCode: string;
    landingPath?: string;
    ip?: string;
    userAgent?: string;
  }): Promise<{ tracked: boolean; affiliateCode: string | null }> {
    const affiliate = await this.validateAffiliateCode(input.affiliateCode);
    if (!affiliate.valid || !affiliate.code) {
      return { tracked: false, affiliateCode: affiliate.code };
    }

    const ipHash = input.ip
      ? createHash('sha256').update(String(input.ip)).digest('hex').slice(0, 64)
      : null;

    await this.clickRepo.save(
      this.clickRepo.create({
        affiliateCode: affiliate.code,
        landingPath: String(input.landingPath || '').trim().slice(0, 512) || null,
        ipHash,
        userAgent: String(input.userAgent || '').trim().slice(0, 255) || null,
      }),
    );

    return { tracked: true, affiliateCode: affiliate.code };
  }

  private async assertUsernameEmailAvailable(username: string, email: string, excludeUserId?: string) {
    const usernameQb = this.userRepo
      .createQueryBuilder('u')
      .where('LOWER(u.username) = :username', { username: username.toLowerCase() });
    if (excludeUserId) {
      usernameQb.andWhere('u.id != :excludeUserId', { excludeUserId });
    }
    const existingUsername = await usernameQb.getOne();
    if (existingUsername && !existingUsername.isDraft) {
      throw new BadRequestException('Username is already taken.');
    }

    const emailQb = this.userRepo
      .createQueryBuilder('u')
      .where('LOWER(u.email) = :email', { email: email.toLowerCase() });
    if (excludeUserId) {
      emailQb.andWhere('u.id != :excludeUserId', { excludeUserId });
    }
    const existingEmail = await emailQb.getOne();
    if (existingEmail && !existingEmail.isDraft) {
      throw new BadRequestException('Email is already registered. Please sign in.');
    }

    return { existingUsername, existingEmail };
  }

  async createSignupDraftAndSale(dto: AffiliateSignupCheckoutDto): Promise<{
    draftUser: UserEntity;
    sale: AffiliateSaleEntity;
    pricing: AffiliatePricingResult;
  }> {
    const username = String(dto.username || '').trim();
    const email = String(dto.email || '').trim().toLowerCase();
    const password = String(dto.password || '');

    if (!username || !email || !password) {
      throw new BadRequestException('Username, email and password are required.');
    }

    const pricing = await this.calculatePricing({
      code: dto.code,
      affiliateCode: dto.affiliateCode,
      voucherCode: dto.voucherCode,
    });

    const { existingUsername, existingEmail } = await this.assertUsernameEmailAvailable(username, email);
    const reusableDraft =
      (existingEmail?.isDraft && existingEmail)
      || (existingUsername?.isDraft && existingUsername)
      || null;

    const hashedPassword = await bcrypt.hash(password, 10);
    const firstname = username;
    const lastname = 'Member';

    let draftUser: UserEntity;
    if (reusableDraft) {
      reusableDraft.username = username;
      reusableDraft.firstname = firstname;
      reusableDraft.lastname = lastname;
      reusableDraft.email = email;
      reusableDraft.password = hashedPassword;
      reusableDraft.authProvider = AuthProvider.LOCAL;
      reusableDraft.role = UserRole.User;
      reusableDraft.status = UserStatus.Active;
      reusableDraft.isVerified = false;
      reusableDraft.isDraft = true;
      reusableDraft.companyCode = pricing.affiliateCode || reusableDraft.companyCode;
      draftUser = await this.userRepo.save(reusableDraft);
    } else {
      draftUser = await this.userRepo.save(
        this.userRepo.create({
          username,
          firstname,
          lastname,
          email,
          password: hashedPassword,
          authProvider: AuthProvider.LOCAL,
          role: UserRole.User,
          status: UserStatus.Active,
          isVerified: false,
          isDraft: true,
          companyCode: pricing.affiliateCode,
        }),
      );
    }

    let sale = await this.saleRepo.findOne({
      where: { draftUserId: draftUser.id, status: AffiliateSaleStatus.Pending },
      order: { createdAt: 'DESC' },
    });

    if (!sale) {
      sale = this.saleRepo.create({
        draftUserId: draftUser.id,
        userId: null,
        status: AffiliateSaleStatus.Pending,
      });
    }

    sale.affiliateCode = pricing.affiliateValid ? pricing.affiliateCode : null;
    sale.voucherCode = pricing.voucherValid ? pricing.voucherCode : null;
    sale.discountApplied = pricing.discountApplied;
    sale.originalAmount = pricing.originalAmount;
    sale.payableAmount = pricing.payableAmount;
    sale.currency = pricing.currency;
    sale.status = AffiliateSaleStatus.Pending;
    sale.paidAt = null;
    sale = await this.saleRepo.save(sale);

    return { draftUser, sale, pricing };
  }

  /**
   * Create (or refresh) a pending affiliate sale for an already-existing signup draft user
   * (e.g. the regular membership signup flow, not the dedicated affiliate signup flow).
   */
  async createPendingSaleForDraft(input: {
    draftUserId: string;
    code?: string;
    affiliateCode?: string;
    voucherCode?: string;
  }): Promise<{ sale: AffiliateSaleEntity; pricing: AffiliatePricingResult }> {
    const draftUserId = String(input.draftUserId || '').trim();
    if (!draftUserId) {
      throw new BadRequestException('draftUserId is required.');
    }

    const draftUser = await this.userRepo.findOne({ where: { id: draftUserId } });
    if (!draftUser) {
      throw new NotFoundException('Signup draft was not found.');
    }

    const pricing = await this.calculatePricing({
      code: input.code,
      affiliateCode: input.affiliateCode,
      voucherCode: input.voucherCode,
    });

    let sale = await this.saleRepo.findOne({
      where: { draftUserId, status: AffiliateSaleStatus.Pending },
      order: { createdAt: 'DESC' },
    });

    if (!sale) {
      sale = this.saleRepo.create({
        draftUserId,
        userId: null,
        status: AffiliateSaleStatus.Pending,
      });
    }

    sale.affiliateCode = pricing.affiliateValid ? pricing.affiliateCode : null;
    sale.voucherCode = pricing.voucherValid ? pricing.voucherCode : null;
    sale.discountApplied = pricing.discountApplied;
    sale.originalAmount = pricing.originalAmount;
    sale.payableAmount = pricing.payableAmount;
    sale.currency = pricing.currency;
    sale.status = AffiliateSaleStatus.Pending;
    sale.paidAt = null;
    sale = await this.saleRepo.save(sale);

    if (pricing.affiliateValid && !draftUser.companyCode) {
      draftUser.companyCode = pricing.affiliateCode;
      await this.userRepo.save(draftUser);
    }

    return { sale, pricing };
  }

  async attachPaymentRef(saleId: string, paymentRefId: string): Promise<void> {
    await this.saleRepo.update({ id: saleId }, { paymentRefId });
  }

  async findSaleByPaymentRef(paymentRefId: string): Promise<AffiliateSaleEntity | null> {
    return this.saleRepo.findOne({ where: { paymentRefId } });
  }

  async completeSaleAfterPayment(paymentRefId: string): Promise<{
    alreadyCompleted: boolean;
    user: UserEntity;
    sale: AffiliateSaleEntity;
  }> {
    const sale = await this.findSaleByPaymentRef(paymentRefId);
    if (!sale) {
      throw new NotFoundException('Affiliate sale was not found for this payment.');
    }

    const draftUser = await this.userRepo.findOne({ where: { id: sale.draftUserId } });
    if (!draftUser) {
      throw new NotFoundException('Signup draft was not found.');
    }

    if (sale.status === AffiliateSaleStatus.Paid && !draftUser.isDraft) {
      return { alreadyCompleted: true, user: draftUser, sale };
    }

    if (draftUser.isDraft) {
      if (!draftUser.username || !draftUser.email || !draftUser.password) {
        throw new BadRequestException('Signup draft is incomplete.');
      }
      draftUser.isDraft = false;
      draftUser.isVerified = true;
      draftUser.authProvider = AuthProvider.LOCAL;
      draftUser.status = UserStatus.Active;
      draftUser.role = UserRole.User;
      await this.userRepo.save(draftUser);
    }

    sale.status = AffiliateSaleStatus.Paid;
    sale.userId = draftUser.id;
    sale.paidAt = sale.paidAt || new Date();
    await this.saleRepo.save(sale);

    if (sale.voucherCode) {
      await this.voucherCodeRepo
        .createQueryBuilder()
        .update(VoucherCodeEntity)
        .set({ redemptionCount: () => '"redemptionCount" + 1' })
        .where('UPPER(code) = :code', { code: this.normalizeCode(sale.voucherCode) })
        .execute();
    }

    return { alreadyCompleted: false, user: draftUser, sale };
  }

  async markSaleCanceled(paymentRefId: string): Promise<void> {
    const sale = await this.findSaleByPaymentRef(paymentRefId);
    if (!sale || sale.status === AffiliateSaleStatus.Paid) return;
    sale.status = AffiliateSaleStatus.Canceled;
    await this.saleRepo.save(sale);
  }

  /** Remove unpaid affiliate/voucher sale rows tied to a signup draft (payment abandoned). */
  async deletePendingSalesForDraft(draftUserId: string): Promise<number> {
    const id = String(draftUserId || '').trim();
    if (!id) return 0;
    const result = await this.saleRepo.delete({
      draftUserId: id,
      status: AffiliateSaleStatus.Pending,
    });
    return result.affected || 0;
  }

  async getDashboardByCode(affiliateCodeInput: string) {
    const affiliate = await this.validateAffiliateCode(affiliateCodeInput);
    if (!affiliate.valid || !affiliate.code) {
      throw new BadRequestException(affiliate.message || 'Invalid affiliate code.');
    }

    const code = affiliate.code;
    const [totalClicks, totalSignups, paidSalesRows] = await Promise.all([
      this.clickRepo.count({ where: { affiliateCode: code } }),
      this.saleRepo
        .createQueryBuilder('s')
        .where('UPPER(s.affiliateCode) = :code', { code: this.normalizeCode(code) })
        .getCount(),
      this.saleRepo
        .createQueryBuilder('s')
        .where('UPPER(s.affiliateCode) = :code', { code: this.normalizeCode(code) })
        .andWhere('s.status = :status', { status: AffiliateSaleStatus.Paid })
        .getMany(),
    ]);

    const totalPaidSales = paidSalesRows.length;
    const totalRevenue = paidSalesRows.reduce(
      (sum, row) => sum + Number(row.payableAmount || 0),
      0,
    );
    const currency = await this.getCurrency();

    return {
      affiliateCode: code,
      totalClicks,
      totalSignups,
      totalPaidSales,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      currency,
      recentPaidSales: paidSalesRows
        .sort((a, b) => new Date(b.paidAt || b.createdAt).getTime() - new Date(a.paidAt || a.createdAt).getTime())
        .slice(0, 20)
        .map((row) => ({
          id: row.id,
          userId: row.userId,
          amount: Number(row.payableAmount),
          currency: row.currency,
          voucherCode: row.voucherCode,
          paidAt: row.paidAt,
          paymentRefId: row.paymentRefId,
        })),
    };
  }
}

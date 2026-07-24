import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PaginationService } from '../common/pagination/pagination.service';
import { UserEntity, UserRole } from '../user/users.entity';
import { CompanyEnrollmentInviteEntity } from './company-enrollment-invite.entity';

export type CompanyEnrollmentStats = {
  id: string;
  companyCode: string;
  label: string | null;
  isActive: boolean;
  maxEnrollment: number;
  enrolledCount: number;
  remainingSeats: number | null;
  isUnlimited: boolean;
  qrValidTill: Date | null;
  qrExpired: boolean;
  signupPath: string;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class CompanyEnrollmentService {
  constructor(
    @InjectRepository(CompanyEnrollmentInviteEntity)
    private readonly inviteRepo: Repository<CompanyEnrollmentInviteEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly dataSource: DataSource,
    private readonly paginationService: PaginationService,
  ) {}

  normalizeCode(value?: string | null): string {
    return String(value || '')
      .trim()
      .toUpperCase();
  }

  buildSignupPath(companyCode: string): string {
    const code = this.normalizeCode(companyCode);
    return `/auth/sign-up?membershipOutcome=paid-signup&companyCode=${encodeURIComponent(code)}&viaQr=1`;
  }

  private parseQrValidTill(value?: string | Date | null): Date | null {
    if (value === null || value === undefined || value === '') return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('QR valid till date is invalid.');
    }
    return date;
  }

  private parseMaxEnrollment(value?: number | string | null): number {
    if (value === null || value === undefined || value === '') return 0;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new BadRequestException('Maximum enrollment must be a whole number of 0 or more (0 = unlimited).');
    }
    return parsed;
  }

  private isQrExpired(qrValidTill: Date | null | undefined): boolean {
    if (!qrValidTill) return false;
    return new Date(qrValidTill).getTime() <= Date.now();
  }

  private remainingSeats(maxEnrollment: number, enrolledCount: number): number | null {
    if (!maxEnrollment || maxEnrollment <= 0) return null;
    return Math.max(0, maxEnrollment - enrolledCount);
  }

  private readAccountNameFromUser(user: UserEntity): string {
    const raw = user.salesforceUserInfoRaw;
    if (!raw || typeof raw !== 'object') return '';
    const corporate =
      (raw as Record<string, unknown>).corporate
      && typeof (raw as Record<string, unknown>).corporate === 'object'
        ? ((raw as Record<string, unknown>).corporate as Record<string, unknown>)
        : null;
    const candidates = [
      corporate?.accountName,
      corporate?.companyName,
      corporate?.name,
      (raw as Record<string, unknown>).accountName,
      (raw as Record<string, unknown>).companyName,
    ];
    for (const value of candidates) {
      const name = String(value || '').trim();
      if (name) return name;
    }
    return '';
  }

  private needsCompanyNameBackfill(label: string | null | undefined, companyCode: string): boolean {
    const current = String(label || '').trim();
    const code = String(companyCode || '').trim();
    if (!current) return true;
    if (!code) return false;
    return current.toUpperCase() === code.toUpperCase();
  }

  /** Resolve real company display name from Corporate HR users for a companyCode. */
  async resolveCompanyNameFromUsers(companyCode?: string | null): Promise<string> {
    const code = String(companyCode || '').trim();
    if (!code) return '';

    const users = await this.userRepo
      .createQueryBuilder('u')
      .where('u.role = :role', { role: UserRole.Corporate })
      .andWhere('LOWER(TRIM(u.companyCode)) = LOWER(:code)', { code })
      .andWhere('u.isDraft = :isDraft', { isDraft: false })
      .orderBy('u.updatedAt', 'DESC')
      .take(10)
      .getMany();

    for (const user of users) {
      const name = this.readAccountNameFromUser(user);
      if (name && name.toUpperCase() !== code.toUpperCase()) return name;
    }
    return '';
  }

  private async resolveCompanyNamesForCodes(codes: string[]): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    const unique = [...new Set(codes.map((c) => String(c || '').trim()).filter(Boolean))];
    if (!unique.length) return map;

    const users = await this.userRepo
      .createQueryBuilder('u')
      .where('u.role = :role', { role: UserRole.Corporate })
      .andWhere('LOWER(TRIM(u.companyCode)) IN (:...codes)', {
        codes: unique.map((c) => c.toLowerCase()),
      })
      .andWhere('u.isDraft = :isDraft', { isDraft: false })
      .orderBy('u.updatedAt', 'DESC')
      .getMany();

    for (const user of users) {
      const codeKey = String(user.companyCode || '').trim().toUpperCase();
      if (!codeKey || map.has(codeKey)) continue;
      const name = this.readAccountNameFromUser(user);
      if (name && name.toUpperCase() !== codeKey) {
        map.set(codeKey, name);
      }
    }
    return map;
  }

  /** Persist real company names onto invites when label is empty or still equal to company code. */
  private async backfillCompanyNames(
    items: CompanyEnrollmentStats[],
  ): Promise<CompanyEnrollmentStats[]> {
    const needing = items.filter((item) =>
      this.needsCompanyNameBackfill(item.label, item.companyCode),
    );
    if (!needing.length) return items;

    const nameByCode = await this.resolveCompanyNamesForCodes(
      needing.map((item) => item.companyCode),
    );
    if (!nameByCode.size) return items;

    const updates: Array<{ id: string; label: string }> = [];
    const nextItems = items.map((item) => {
      if (!this.needsCompanyNameBackfill(item.label, item.companyCode)) return item;
      const resolved = nameByCode.get(String(item.companyCode || '').trim().toUpperCase());
      if (!resolved) return item;
      updates.push({ id: item.id, label: resolved });
      return { ...item, label: resolved };
    });

    if (updates.length) {
      await Promise.all(
        updates.map((u) => this.inviteRepo.update({ id: u.id }, { label: u.label })),
      );
    }

    return nextItems;
  }

  serialize(row: CompanyEnrollmentInviteEntity): CompanyEnrollmentStats {
    const maxEnrollment = Number(row.maxEnrollment) || 0;
    const enrolledCount = Number(row.enrolledCount) || 0;
    return {
      id: row.id,
      companyCode: row.companyCode,
      label: row.label,
      isActive: row.isActive,
      maxEnrollment,
      enrolledCount,
      remainingSeats: this.remainingSeats(maxEnrollment, enrolledCount),
      isUnlimited: maxEnrollment <= 0,
      qrValidTill: row.qrValidTill,
      qrExpired: this.isQrExpired(row.qrValidTill),
      signupPath: this.buildSignupPath(row.companyCode),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async listInvites(options: { page?: number; limit?: number; search?: string } = {}) {
    const { page, limit, search, hasSearch } = this.paginationService.normalizePaginatedQuery(
      {
        page: options.page,
        limit: options.limit,
        search: options.search,
      },
      10,
      100,
    );

    const qb = this.inviteRepo.createQueryBuilder('i');

    if (hasSearch) {
      const term = `%${search}%`;
      qb.andWhere('(i.companyCode ILIKE :term OR i.label ILIKE :term)', { term });
    }

    qb.orderBy('i.updatedAt', 'DESC').addOrderBy('i.createdAt', 'DESC');

    const result = await this.paginationService.paginateQueryBuilder({
      queryBuilder: qb,
      page,
      limit,
      search: hasSearch ? search : null,
      mapItem: (row) => this.serialize(row),
    });

    const data = Array.isArray(result?.data) ? result.data : [];
    result.data = await this.backfillCompanyNames(data);
    return result;
  }

  async getInviteById(id: string) {
    const row = await this.inviteRepo.findOne({ where: { id } });
    if (!row) {
      throw new BadRequestException('Company enrollment invite not found.');
    }
    const [enriched] = await this.backfillCompanyNames([this.serialize(row)]);
    return enriched;
  }

  async findByCompanyCode(companyCode?: string | null) {
    const code = this.normalizeCode(companyCode);
    if (!code) return null;
    return this.inviteRepo
      .createQueryBuilder('i')
      .where('UPPER(i.companyCode) = :code', { code })
      .getOne();
  }

  /**
   * Ensure a QR enrollment invite exists for a corporate companyCode.
   * Creates with unlimited seats and no QR expiry when missing.
   */
  async ensureInviteForCompanyCode(input: {
    companyCode?: string | null;
    label?: string | null;
  }): Promise<CompanyEnrollmentStats | null> {
    const companyCode = this.normalizeCode(input.companyCode);
    if (!companyCode) return null;

    let nextLabel = String(input.label || '').trim();
    if (!nextLabel || nextLabel.toUpperCase() === companyCode) {
      const resolved = await this.resolveCompanyNameFromUsers(companyCode);
      if (resolved) nextLabel = resolved;
    }

    const existing = await this.findByCompanyCode(companyCode);
    if (existing) {
      // Keep company name fresh when current label is empty or still just the code.
      if (
        nextLabel
        && this.needsCompanyNameBackfill(existing.label, existing.companyCode)
        && nextLabel !== existing.label
      ) {
        existing.label = nextLabel;
        const saved = await this.inviteRepo.save(existing);
        return this.serialize(saved);
      }
      return this.serialize(existing);
    }

    // Soft-normalize codes that don't match strict pattern (Salesforce ids can be alphanumeric).
    const safeCode = /^[A-Z0-9_-]{2,64}$/.test(companyCode)
      ? companyCode
      : companyCode.replace(/[^A-Z0-9_-]/g, '').slice(0, 64);
    if (!safeCode || safeCode.length < 2) {
      return null;
    }

    const saved = await this.inviteRepo.save(
      this.inviteRepo.create({
        companyCode: safeCode,
        label: nextLabel || safeCode,
        isActive: true,
        maxEnrollment: 0,
        enrolledCount: 0,
        qrValidTill: null,
      }),
    );
    return this.serialize(saved);
  }

  async createInvite(input: {
    companyCode?: string | null;
    label?: string | null;
    isActive?: boolean;
    maxEnrollment?: number | null;
    qrValidTill?: string | Date | null;
  }) {
    const companyCode = this.normalizeCode(input.companyCode);
    if (!companyCode) {
      throw new BadRequestException('Company code is required.');
    }
    if (!/^[A-Z0-9_-]{2,64}$/.test(companyCode)) {
      throw new BadRequestException(
        'Company code may only contain letters, numbers, underscore or hyphen (2–64 chars).',
      );
    }

    const existing = await this.findByCompanyCode(companyCode);
    if (existing) {
      throw new BadRequestException(`Company code ${companyCode} already has an enrollment invite.`);
    }

    let label = String(input.label || '').trim();
    if (!label || label.toUpperCase() === companyCode) {
      label = (await this.resolveCompanyNameFromUsers(companyCode)) || companyCode;
    }

    const saved = await this.inviteRepo.save(
      this.inviteRepo.create({
        companyCode,
        label,
        isActive: input.isActive !== false,
        maxEnrollment: this.parseMaxEnrollment(input.maxEnrollment),
        enrolledCount: 0,
        qrValidTill: this.parseQrValidTill(input.qrValidTill),
      }),
    );
    return this.serialize(saved);
  }

  async updateInvite(
    id: string,
    input: {
      companyCode?: string | null;
      label?: string | null;
      isActive?: boolean;
      maxEnrollment?: number | null;
      qrValidTill?: string | Date | null;
    },
  ) {
    const row = await this.inviteRepo.findOne({ where: { id } });
    if (!row) {
      throw new BadRequestException('Company enrollment invite not found.');
    }

    if (input.companyCode != null) {
      const nextCode = this.normalizeCode(input.companyCode);
      if (!nextCode) {
        throw new BadRequestException('Company code is required.');
      }
      if (!/^[A-Z0-9_-]{2,64}$/.test(nextCode)) {
        throw new BadRequestException(
          'Company code may only contain letters, numbers, underscore or hyphen (2–64 chars).',
        );
      }
      const conflict = await this.inviteRepo
        .createQueryBuilder('i')
        .where('UPPER(i.companyCode) = :code', { code: nextCode })
        .andWhere('i.id != :id', { id })
        .getOne();
      if (conflict) {
        throw new BadRequestException(`Company code ${nextCode} already has an enrollment invite.`);
      }
      row.companyCode = nextCode;
    }

    if (input.label !== undefined) {
      const label = String(input.label || '').trim();
      row.label = label || row.companyCode;
    }
    if (typeof input.isActive === 'boolean') {
      row.isActive = input.isActive;
    }
    if (input.maxEnrollment !== undefined) {
      row.maxEnrollment = this.parseMaxEnrollment(input.maxEnrollment);
    }
    if (input.qrValidTill !== undefined) {
      row.qrValidTill = this.parseQrValidTill(input.qrValidTill);
    }

    const saved = await this.inviteRepo.save(row);
    return this.serialize(saved);
  }

  async deleteInvite(id: string) {
    const row = await this.inviteRepo.findOne({ where: { id } });
    if (!row) {
      throw new BadRequestException('Company enrollment invite not found.');
    }
    await this.inviteRepo.delete(id);
    return { deleted: true, id, companyCode: row.companyCode };
  }

  /**
   * Public pre-check for signup (company code or QR).
   * Does not consume a seat.
   */
  async validateForEnrollment(input: { companyCode?: string | null; viaQr?: boolean }) {
    const companyCode = this.normalizeCode(input.companyCode);
    if (!companyCode) {
      throw new BadRequestException('Company code is required.');
    }

    const invite = await this.findByCompanyCode(companyCode);
    if (!invite) {
      return {
        valid: false,
        companyCode,
        reason: 'not_found',
        message: 'Company code is invalid.',
      };
    }

    if (!invite.isActive) {
      return {
        ...this.serialize(invite),
        valid: false,
        reason: 'inactive',
        message: 'This company enrollment invite is not active.',
      };
    }

    if (input.viaQr === true && this.isQrExpired(invite.qrValidTill)) {
      return {
        ...this.serialize(invite),
        valid: false,
        reason: 'qr_expired',
        message: 'This QR Code has expired. Please request a new QR Code.',
      };
    }

    const stats = this.serialize(invite);
    if (!stats.isUnlimited && (stats.remainingSeats ?? 0) <= 0) {
      return {
        ...stats,
        valid: false,
        reason: 'quota_full',
        message:
          'Enrollment limit has been reached. Please contact your company administrator.',
      };
    }

    return {
      ...stats,
      valid: true,
      reason: null,
      message: 'Company enrollment is available.',
    };
  }

  /**
   * Atomically reserve one seat for a successful enrollment.
   * No-op (returns null) when no invite exists for the code.
   */
  async consumeSeatForEnrollment(input: {
    companyCode?: string | null;
    viaQr?: boolean;
  }): Promise<CompanyEnrollmentStats | null> {
    const companyCode = this.normalizeCode(input.companyCode);
    if (!companyCode) return null;

    return this.dataSource.transaction(async (manager) => {
      const invite = await manager
        .createQueryBuilder(CompanyEnrollmentInviteEntity, 'i')
        .setLock('pessimistic_write')
        .where('UPPER(i.companyCode) = :code', { code: companyCode })
        .getOne();

      if (!invite) {
        return null;
      }

      if (!invite.isActive) {
        throw new BadRequestException('This company enrollment invite is not active.');
      }

      if (input.viaQr === true && this.isQrExpired(invite.qrValidTill)) {
        throw new BadRequestException(
          'This QR Code has expired. Please request a new QR Code.',
        );
      }

      const maxEnrollment = Number(invite.maxEnrollment) || 0;
      const enrolledCount = Number(invite.enrolledCount) || 0;
      if (maxEnrollment > 0 && enrolledCount >= maxEnrollment) {
        throw new BadRequestException(
          'Enrollment limit has been reached. Please contact your company administrator.',
        );
      }

      invite.enrolledCount = enrolledCount + 1;
      const saved = await manager.save(invite);
      return this.serialize(saved);
    });
  }
}

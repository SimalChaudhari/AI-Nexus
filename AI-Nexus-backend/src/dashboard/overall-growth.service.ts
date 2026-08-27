import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import { UserEntity, UserRole } from '../user/users.entity';
import { CourseEntity } from '../course/courses.entity';
import { ProgramEntity, ProgramStatus } from '../program/programs.entity';
import { CourseCertificateEntity, CourseCertificateStatus } from '../course/course-certificate.entity';
import { CourseSectionWatchProgressService } from '../course/course-section-watch-progress.service';
import { CERTIFICATE_CHAMPION_CPE_HOURS_THRESHOLD } from '../course/utils/certificate-pdf-shared.util';

export type OverallGrowthMetric = {
  total: number;
  previousTotal: number;
  percentChange: number;
};

export type OverallGrowthStats = {
  enrolledUsers: OverallGrowthMetric;
  fluencyEarners: OverallGrowthMetric;
  badgeEarners: OverallGrowthMetric;
  champions: OverallGrowthMetric;
};

export type OverallGrowthPeriodRow = {
  periodNumber: number;
  start: string;
  end: string;
  label: string;
  enrolledUsers: number;
  fluencyEarners: number;
  badgeEarners: number;
  champions: number;
  newEnrolledUsers: number;
  newFluencyEarners: number;
  newBadgeEarners: number;
  newChampions: number;
};

export type CompanyGrowthRow = {
  companyCode: string;
  companyName: string;
  totalUsers: number;
  badgeEarners: number;
  badgePercent: number;
  champions: number;
  championPercent: number;
  enrolledAt: string | null;
};

export type CompanyGrowthPeriodRow = {
  periodNumber: number;
  start: string;
  end: string;
  asOf: string;
  label: string;
  companiesEnrolled: number;
  learnersInCompanies: number;
  badgeEarners: number;
  champions: number;
};

export type CompanyGrowthReport = {
  companyCount: number;
  totalUsers: number;
  companies: CompanyGrowthRow[];
  launchDate: string | null;
  weeks: CompanyGrowthPeriodRow[];
  months: CompanyGrowthPeriodRow[];
  companiesEnrolled: OverallGrowthMetric;
  learnersInCompanies: OverallGrowthMetric;
};

export type OverallGrowthWeeklyReport = OverallGrowthStats & {
  launchDate: string | null;
  days: OverallGrowthPeriodRow[];
  weeks: OverallGrowthPeriodRow[];
  months: OverallGrowthPeriodRow[];
};

export type OverallGrowthUserMetric = 'all' | 'enrolled' | 'fluency' | 'badge' | 'champion';

export const OVERALL_GROWTH_USER_CSV_FIELDS = [
  { key: 'name', label: 'Name' },
  { key: 'firstname', label: 'First name' },
  { key: 'lastname', label: 'Last name' },
  { key: 'username', label: 'Username' },
  { key: 'email', label: 'Email' },
  { key: 'contactNumber', label: 'Contact number' },
  { key: 'company', label: 'Company' },
  { key: 'companyCode', label: 'Company code' },
  { key: 'status', label: 'Status' },
  { key: 'enrolledAt', label: 'Enrolled at' },
  { key: 'fluencyAt', label: 'Fluency at' },
  { key: 'badgeAt', label: 'Badge earned at' },
  { key: 'championAt', label: 'Champion at' },
  { key: 'isEnrolled', label: 'Is enrolled' },
  { key: 'isFluency', label: 'Is fluency' },
  { key: 'isBadgeEarner', label: 'Is badge earner' },
  { key: 'isChampion', label: 'Is champion' },
  { key: 'lastLoginAt', label: 'Last login' },
] as const;

export type OverallGrowthCsvFieldKey = (typeof OVERALL_GROWTH_USER_CSV_FIELDS)[number]['key'];

type EventRow = { userId: string; at: Date };

type TimeBucket = {
  periodNumber: number;
  start: Date;
  end: Date;
  asOf: Date;
  label: string;
};

@Injectable()
export class OverallGrowthService {
  private readonly sgOffsetMs = 8 * 60 * 60 * 1000;

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(CourseEntity)
    private readonly courseRepository: Repository<CourseEntity>,
    @InjectRepository(ProgramEntity)
    private readonly programRepository: Repository<ProgramEntity>,
    @InjectRepository(CourseCertificateEntity)
    private readonly certificateRepository: Repository<CourseCertificateEntity>,
    private readonly watchProgressService: CourseSectionWatchProgressService,
  ) {}

  async getStats(): Promise<OverallGrowthStats> {
    const report = await this.getWeeklyReport();
    return {
      enrolledUsers: report.enrolledUsers,
      fluencyEarners: report.fluencyEarners,
      badgeEarners: report.badgeEarners,
      champions: report.champions,
    };
  }

  async getWeeklyReport(): Promise<OverallGrowthWeeklyReport> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [learners, credentials] = await Promise.all([
      this.getPlatformLearners(),
      this.getIssuedCredentials().catch(() => ({
        badge: [] as EventRow[],
        fluency: [] as EventRow[],
        champion: [] as EventRow[],
      })),
    ]);

    const enrollDates = learners.map((row) => row.at);
    const fluencyDates = credentials.fluency.map((row) => row.at);
    const badgeDates = credentials.badge.map((row) => row.at);
    const championDates = credentials.champion.map((row) => row.at);

    const launchDate = this.earliestDate(enrollDates) || now;

    return {
      launchDate: launchDate.toISOString(),
      days: this.toPeriodRows(
        this.buildSingaporeDays(launchDate, now),
        enrollDates,
        fluencyDates,
        badgeDates,
        championDates,
      ),
      weeks: this.toPeriodRows(
        this.buildSingaporeWeeks(launchDate, now),
        enrollDates,
        fluencyDates,
        badgeDates,
        championDates,
      ),
      months: this.toPeriodRows(
        this.buildSingaporeMonths(launchDate, now),
        enrollDates,
        fluencyDates,
        badgeDates,
        championDates,
      ),
      enrolledUsers: this.toMetric(
        this.countDatesAsOf(enrollDates, now),
        this.countDatesAsOf(enrollDates, sevenDaysAgo),
      ),
      fluencyEarners: this.toMetric(
        this.countDatesAsOf(fluencyDates, now),
        this.countDatesAsOf(fluencyDates, sevenDaysAgo),
      ),
      badgeEarners: this.toMetric(
        this.countDatesAsOf(badgeDates, now),
        this.countDatesAsOf(badgeDates, sevenDaysAgo),
      ),
      champions: this.toMetric(
        this.countDatesAsOf(championDates, now),
        this.countDatesAsOf(championDates, sevenDaysAgo),
      ),
    };
  }

  async exportUsersCsv(options: {
    metric?: OverallGrowthUserMetric;
    fields?: string[];
    from?: string;
    to?: string;
  } = {}): Promise<{ filename: string; csv: string }> {
    const metric = options.metric || 'all';
    const allowedKeys = OVERALL_GROWTH_USER_CSV_FIELDS.map((field) => field.key);
    const selectedKeys = (options.fields || [])
      .map((key) => String(key || '').trim())
      .filter((key): key is OverallGrowthCsvFieldKey =>
        allowedKeys.includes(key as OverallGrowthCsvFieldKey),
      );
    const fieldKeys = selectedKeys.length ? selectedKeys : [...allowedKeys];
    const from = this.parseSingaporeDayBound(options.from, false);
    const to = this.parseSingaporeDayBound(options.to, true);

    const [learners, credentials] = await Promise.all([
      this.getPlatformLearners(),
      this.getIssuedCredentials().catch(() => ({
        badge: [] as EventRow[],
        fluency: [] as EventRow[],
        champion: [] as EventRow[],
      })),
    ]);

    const enrolledMap = new Map(learners.map((row) => [row.userId, row.at]));
    const fluencyMap = new Map(credentials.fluency.map((row) => [row.userId, row.at]));
    const badgeMap = new Map(credentials.badge.map((row) => [row.userId, row.at]));
    const championMap = new Map(credentials.champion.map((row) => [row.userId, row.at]));

    let userIds: string[];
    if (metric === 'fluency') userIds = [...fluencyMap.keys()];
    else if (metric === 'badge') userIds = [...badgeMap.keys()];
    else if (metric === 'champion') userIds = [...championMap.keys()];
    else userIds = [...enrolledMap.keys()];

    if (from || to) {
      userIds = userIds.filter((userId) => {
        const enrolledAt = enrolledMap.get(userId) || null;
        const fluencyAt = fluencyMap.get(userId) || null;
        const badgeAt = badgeMap.get(userId) || null;
        const championAt = championMap.get(userId) || null;
        if (metric === 'fluency') return this.isDateInRange(fluencyAt, from, to);
        if (metric === 'badge') return this.isDateInRange(badgeAt, from, to);
        if (metric === 'champion') return this.isDateInRange(championAt, from, to);
        if (metric === 'enrolled') return this.isDateInRange(enrolledAt, from, to);
        return (
          this.isDateInRange(enrolledAt, from, to) ||
          this.isDateInRange(fluencyAt, from, to) ||
          this.isDateInRange(badgeAt, from, to) ||
          this.isDateInRange(championAt, from, to)
        );
      });
    }

    const users = await this.loadUsersByIds(userIds);
    const selectedFields = OVERALL_GROWTH_USER_CSV_FIELDS.filter((field) =>
      fieldKeys.includes(field.key),
    );
    const lines = [selectedFields.map((field) => this.csvCell(field.label)).join(',')];

    for (const user of users) {
      const enrolledAt = enrolledMap.get(user.id) || null;
      const fluencyAt = fluencyMap.get(user.id) || null;
      const badgeAt = badgeMap.get(user.id) || null;
      const championAt = championMap.get(user.id) || null;
      const values: Record<OverallGrowthCsvFieldKey, string> = {
        name: [user.firstname, user.lastname].filter(Boolean).join(' ').trim(),
        firstname: user.firstname || '',
        lastname: user.lastname || '',
        username: user.username || '',
        email: user.email || '',
        contactNumber: user.contactNumber || '',
        company: this.resolveCompanyName(user),
        companyCode: user.companyCode || '',
        status: user.status || '',
        enrolledAt: this.formatSingaporeDateTime(enrolledAt),
        fluencyAt: this.formatSingaporeDateTime(fluencyAt),
        badgeAt: this.formatSingaporeDateTime(badgeAt),
        championAt: this.formatSingaporeDateTime(championAt),
        isEnrolled: enrolledAt ? 'Yes' : 'No',
        isFluency: fluencyAt ? 'Yes' : 'No',
        isBadgeEarner: badgeAt ? 'Yes' : 'No',
        isChampion: championAt ? 'Yes' : 'No',
        lastLoginAt: this.formatSingaporeDateTime(user.lastLoginAt || null),
      };
      lines.push(selectedFields.map((field) => this.csvCell(values[field.key])).join(','));
    }

    return {
      filename: `weekly-metric-1-users-${metric}.csv`,
      csv: `\uFEFF${lines.join('\n')}`,
    };
  }

  private toPeriodRows(
    buckets: TimeBucket[],
    enrollDates: Date[],
    fluencyDates: Date[],
    badgeDates: Date[],
    championDates: Date[],
  ): OverallGrowthPeriodRow[] {
    return buckets.map((bucket) => ({
      periodNumber: bucket.periodNumber,
      start: bucket.start.toISOString(),
      end: bucket.end.toISOString(),
      label: bucket.label,
      enrolledUsers: this.countDatesAsOf(enrollDates, bucket.asOf),
      fluencyEarners: this.countDatesAsOf(fluencyDates, bucket.asOf),
      badgeEarners: this.countDatesAsOf(badgeDates, bucket.asOf),
      champions: this.countDatesAsOf(championDates, bucket.asOf),
      newEnrolledUsers: this.countDatesInRange(enrollDates, bucket.start, bucket.asOf),
      newFluencyEarners: this.countDatesInRange(fluencyDates, bucket.start, bucket.asOf),
      newBadgeEarners: this.countDatesInRange(badgeDates, bucket.start, bucket.asOf),
      newChampions: this.countDatesInRange(championDates, bucket.start, bucket.asOf),
    }));
  }

  private async getPlatformLearners(): Promise<EventRow[]> {
    const rows = await this.userRepository
      .createQueryBuilder('user')
      .select('user.id', 'userId')
      .addSelect('user.createdAt', 'at')
      .where('user.role != :adminRole', { adminRole: UserRole.Admin })
      .andWhere('user.role != :corporateRole', { corporateRole: UserRole.Corporate })
      .andWhere('user.isDraft = :isDraft', { isDraft: false })
      .getRawMany<Record<string, string | Date>>();

    return rows
      .map((row) => {
        const userId = String(row.userId ?? row.userid ?? '');
        const raw = row.at ?? row.createdAt ?? row.createdat ?? row.user_createdAt;
        const at = raw instanceof Date ? raw : new Date(String(raw || ''));
        return { userId, at };
      })
      .filter((row) => row.userId && !Number.isNaN(row.at.getTime()));
  }

  private async getIssuedCredentials(): Promise<{
    badge: EventRow[];
    fluency: EventRow[];
    champion: EventRow[];
  }> {
    const certificates = await this.certificateRepository.find({
      where: { status: CourseCertificateStatus.Active },
      select: ['userId', 'completedAt', 'createdAt', 'certificateBlocked', 'badgeBlocked'],
      order: { completedAt: 'ASC' },
    });

    type Cred = { at: Date; hasBadge: boolean; hasCertificate: boolean };
    const firstByUser = new Map<string, Cred>();
    for (const row of certificates) {
      if (firstByUser.has(row.userId)) continue;
      const raw = row.completedAt || row.createdAt;
      const at = raw instanceof Date ? raw : new Date(String(raw || ''));
      if (!at || Number.isNaN(at.getTime())) continue;
      firstByUser.set(row.userId, {
        at,
        hasBadge: !row.badgeBlocked,
        hasCertificate: !row.certificateBlocked,
      });
    }

    const userIds = [...firstByUser.keys()];
    const hoursByUser = new Map<string, number>();
    const programId = await this.resolveDefaultProgramId();
    if (programId && userIds.length) {
      const summaries = await this.watchProgressService.getProgramPillarWatchSummariesForUsers(
        userIds,
        programId,
      );
      for (const userId of userIds) {
        hoursByUser.set(userId, Number(summaries.get(userId)?.totalEarnedCpeHours) || 0);
      }
    }

    const badge: EventRow[] = [];
    const fluency: EventRow[] = [];
    const champion: EventRow[] = [];
    for (const [userId, cred] of firstByUser) {
      const hours = hoursByUser.get(userId) || 0;
      if (cred.hasBadge) badge.push({ userId, at: cred.at });
      if (hours >= CERTIFICATE_CHAMPION_CPE_HOURS_THRESHOLD) {
        champion.push({ userId, at: cred.at });
      } else if (cred.hasCertificate) {
        fluency.push({ userId, at: cred.at });
      }
    }

    return { badge, fluency, champion };
  }

  async getCompanyGrowthReport(): Promise<CompanyGrowthReport> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [learners, corporates, credentials] = await Promise.all([
      this.userRepository.find({
        where: { role: UserRole.User, isDraft: false },
        select: ['id', 'companyCode', 'createdAt', 'eligibilitySnapshot', 'salesforceUserInfoRaw'],
      }),
      this.userRepository.find({
        where: { role: UserRole.Corporate, isDraft: false },
        select: ['id', 'companyCode', 'createdAt', 'eligibilitySnapshot', 'salesforceUserInfoRaw'],
      }),
      this.getIssuedCredentials().catch(() => ({
        badge: [] as EventRow[],
        fluency: [] as EventRow[],
        champion: [] as EventRow[],
      })),
    ]);

    const badgeAt = new Map(credentials.badge.map((row) => [row.userId, row.at]));
    const championAt = new Map(credentials.champion.map((row) => [row.userId, row.at]));

    type Bucket = {
      companyCode: string;
      companyName: string;
      enrolledAt: Date | null;
      totalUsers: number;
      badgeEarners: number;
      champions: number;
    };
    const buckets = new Map<string, Bucket>();

    const upsertCompany = (code: string, user: UserEntity) => {
      const key = code.toLowerCase();
      const existing = buckets.get(key);
      const name = this.resolveCompanyName(user);
      const enrolledAt = this.asDate(user.createdAt);
      if (!existing) {
        buckets.set(key, {
          companyCode: code,
          companyName: name || code,
          enrolledAt,
          totalUsers: 0,
          badgeEarners: 0,
          champions: 0,
        });
        return;
      }
      if (name && existing.companyName === existing.companyCode) {
        existing.companyName = name;
      }
      if (enrolledAt && (!existing.enrolledAt || enrolledAt.getTime() < existing.enrolledAt.getTime())) {
        existing.enrolledAt = enrolledAt;
      }
    };

    for (const user of corporates) {
      const code = String(user.companyCode || '').trim();
      if (!code) continue;
      upsertCompany(code, user);
    }

    type LearnerRow = { userId: string; code: string; at: Date };
    const companyLearners: LearnerRow[] = [];

    for (const user of learners) {
      const code = String(user.companyCode || '').trim();
      if (!code) continue;
      const bucket = buckets.get(code.toLowerCase());
      if (!bucket) continue;
      bucket.totalUsers += 1;
      if (badgeAt.has(user.id)) bucket.badgeEarners += 1;
      if (championAt.has(user.id)) bucket.champions += 1;
      const at = this.asDate(user.createdAt);
      if (at) companyLearners.push({ userId: user.id, code: code.toLowerCase(), at });
    }

    const companies = [...buckets.values()]
      .map((bucket) => ({
        companyCode: bucket.companyCode,
        companyName: bucket.companyName,
        totalUsers: bucket.totalUsers,
        badgeEarners: bucket.badgeEarners,
        badgePercent: this.ratioPercent(bucket.badgeEarners, bucket.totalUsers),
        champions: bucket.champions,
        championPercent: this.ratioPercent(bucket.champions, bucket.totalUsers),
        enrolledAt: bucket.enrolledAt ? bucket.enrolledAt.toISOString() : null,
      }))
      .sort((a, b) => a.companyName.localeCompare(b.companyName));

    const companyEnrolDates = [...buckets.values()]
      .map((bucket) => bucket.enrolledAt)
      .filter((date): date is Date => Boolean(date));
    const learnerDates = companyLearners.map((row) => row.at);
    const launchDate =
      this.earliestDate([...companyEnrolDates, ...learnerDates]) || now;

    const toPeriodRows = (timeBuckets: TimeBucket[]): CompanyGrowthPeriodRow[] =>
      timeBuckets.map((bucket) => {
        const enrolledCodes = new Set<string>();
        for (const [key, company] of buckets) {
          if (company.enrolledAt && company.enrolledAt.getTime() <= bucket.asOf.getTime()) {
            enrolledCodes.add(key);
          }
        }

        let learnersInCompanies = 0;
        let badgeEarners = 0;
        let champions = 0;
        for (const learner of companyLearners) {
          if (!enrolledCodes.has(learner.code)) continue;
          if (learner.at.getTime() > bucket.asOf.getTime()) continue;
          learnersInCompanies += 1;
          const badgeDate = badgeAt.get(learner.userId);
          const championDate = championAt.get(learner.userId);
          if (badgeDate && badgeDate.getTime() <= bucket.asOf.getTime()) badgeEarners += 1;
          if (championDate && championDate.getTime() <= bucket.asOf.getTime()) champions += 1;
        }

        return {
          periodNumber: bucket.periodNumber,
          start: bucket.start.toISOString(),
          end: bucket.end.toISOString(),
          asOf: bucket.asOf.toISOString(),
          label: bucket.label,
          companiesEnrolled: enrolledCodes.size,
          learnersInCompanies,
          badgeEarners,
          champions,
        };
      });

    return {
      companyCount: companies.length,
      totalUsers: companies.reduce((sum, row) => sum + row.totalUsers, 0),
      companies,
      launchDate: launchDate.toISOString(),
      weeks: toPeriodRows(this.buildSingaporeWeeks(launchDate, now)),
      months: toPeriodRows(this.buildSingaporeMonths(launchDate, now)),
      companiesEnrolled: this.toMetric(
        this.countDatesAsOf(companyEnrolDates, now),
        this.countDatesAsOf(companyEnrolDates, sevenDaysAgo),
      ),
      learnersInCompanies: this.toMetric(
        this.countDatesAsOf(learnerDates, now),
        this.countDatesAsOf(learnerDates, sevenDaysAgo),
      ),
    };
  }

  private ratioPercent(part: number, total: number): number {
    if (!total) return 0;
    return Math.round((part / total) * 1000) / 10;
  }

  private async loadUsersByIds(userIds: string[]): Promise<UserEntity[]> {
    const unique = [...new Set(userIds.filter(Boolean))];
    const result: UserEntity[] = [];
    const chunkSize = 400;
    for (let i = 0; i < unique.length; i += chunkSize) {
      const chunk = unique.slice(i, i + chunkSize);
      const rows = await this.userRepository.find({
        where: { id: In(chunk) },
        select: [
          'id',
          'firstname',
          'lastname',
          'username',
          'email',
          'contactNumber',
          'companyCode',
          'status',
          'lastLoginAt',
          'eligibilitySnapshot',
          'salesforceUserInfoRaw',
        ],
      });
      result.push(...rows);
    }
    result.sort((a, b) => {
      const nameA = `${a.firstname || ''} ${a.lastname || ''}`.trim().toLowerCase();
      const nameB = `${b.firstname || ''} ${b.lastname || ''}`.trim().toLowerCase();
      return nameA.localeCompare(nameB);
    });
    return result;
  }

  private resolveCompanyName(user: UserEntity): string {
    const snapshot =
      user.eligibilitySnapshot && typeof user.eligibilitySnapshot === 'object'
        ? (user.eligibilitySnapshot as Record<string, unknown>)
        : {};
    for (const key of ['companyName', 'company'] as const) {
      const fromSnapshot = String(snapshot[key] || '').trim();
      if (fromSnapshot) return fromSnapshot;
    }
    const raw = user.salesforceUserInfoRaw;
    if (raw && typeof raw === 'object') {
      const corporate =
        raw.corporate && typeof raw.corporate === 'object'
          ? (raw.corporate as Record<string, unknown>)
          : null;
      const candidates = [
        corporate?.accountName,
        corporate?.companyName,
        corporate?.name,
        raw.accountName,
        raw.companyName,
      ];
      for (const value of candidates) {
        const name = String(value || '').trim();
        if (name) return name;
      }
    }
    return '';
  }

  private toMetric(total: number, previousTotal: number): OverallGrowthMetric {
    return {
      total,
      previousTotal,
      percentChange: this.percentChange(total, previousTotal),
    };
  }

  private countDatesAsOf(dates: Date[], asOf: Date): number {
    const t = asOf.getTime();
    let count = 0;
    for (const date of dates) {
      if (date.getTime() <= t) count += 1;
    }
    return count;
  }

  private countDatesInRange(dates: Date[], start: Date, asOf: Date): number {
    const from = start.getTime();
    const to = asOf.getTime();
    let count = 0;
    for (const date of dates) {
      const t = date.getTime();
      if (t >= from && t <= to) count += 1;
    }
    return count;
  }

  private asDate(value: Date | string | null | undefined): Date | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(String(value));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private earliestDate(dates: Date[]): Date | null {
    let min: Date | null = null;
    for (const date of dates) {
      if (!min || date.getTime() < min.getTime()) min = date;
    }
    return min;
  }

  private buildSingaporeDays(launchDate: Date, now: Date): TimeBucket[] {
    const buckets: TimeBucket[] = [];
    let cursor = this.startOfSingaporeDay(launchDate);
    const currentStart = this.startOfSingaporeDay(now);
    let periodNumber = 1;
    while (cursor.getTime() <= currentStart.getTime() && periodNumber <= 400) {
      const start = cursor;
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      const asOf = new Date(Math.min(now.getTime(), end.getTime() - 1));
      buckets.push({
        periodNumber,
        start,
        end,
        asOf,
        label: this.formatSingaporeDate(asOf, { day: 'numeric', month: 'short', year: 'numeric' }),
      });
      cursor = end;
      periodNumber += 1;
    }
    return buckets;
  }

  private buildSingaporeWeeks(launchDate: Date, now: Date): TimeBucket[] {
    const buckets: TimeBucket[] = [];
    let cursor = this.startOfSingaporeWeek(launchDate);
    const currentWeekStart = this.startOfSingaporeWeek(now);
    let periodNumber = 1;
    while (cursor.getTime() <= currentWeekStart.getTime() && periodNumber <= 260) {
      const start = cursor;
      const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
      const asOf = new Date(Math.min(now.getTime(), end.getTime() - 1));
      buckets.push({
        periodNumber,
        start,
        end,
        asOf,
        label: `${this.formatSingaporeDate(start, { day: 'numeric', month: 'short', year: 'numeric' })} – ${this.formatSingaporeDate(asOf, { day: 'numeric', month: 'short', year: 'numeric' })}`,
      });
      cursor = end;
      periodNumber += 1;
    }
    return buckets;
  }

  private buildSingaporeMonths(launchDate: Date, now: Date): TimeBucket[] {
    const buckets: TimeBucket[] = [];
    let cursor = this.startOfSingaporeMonth(launchDate);
    const currentMonthStart = this.startOfSingaporeMonth(now);
    let periodNumber = 1;
    while (cursor.getTime() <= currentMonthStart.getTime() && periodNumber <= 60) {
      const start = cursor;
      const end = this.addSingaporeMonths(start, 1);
      const asOf = new Date(Math.min(now.getTime(), end.getTime() - 1));
      buckets.push({
        periodNumber,
        start,
        end,
        asOf,
        label: this.formatSingaporeDate(start, { month: 'short', year: 'numeric' }),
      });
      cursor = end;
      periodNumber += 1;
    }
    return buckets;
  }

  private startOfSingaporeDay(date: Date): Date {
    const shifted = new Date(date.getTime() + this.sgOffsetMs);
    return new Date(
      Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) - this.sgOffsetMs,
    );
  }

  private startOfSingaporeWeek(date: Date): Date {
    const shifted = new Date(date.getTime() + this.sgOffsetMs);
    const weekday = shifted.getUTCDay();
    const daysFromMonday = weekday === 0 ? 6 : weekday - 1;
    return new Date(
      Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate() - daysFromMonday) -
        this.sgOffsetMs,
    );
  }

  private startOfSingaporeMonth(date: Date): Date {
    const shifted = new Date(date.getTime() + this.sgOffsetMs);
    return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), 1) - this.sgOffsetMs);
  }

  private addSingaporeMonths(start: Date, months: number): Date {
    const shifted = new Date(start.getTime() + this.sgOffsetMs);
    return new Date(
      Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth() + months, 1) - this.sgOffsetMs,
    );
  }

  private formatSingaporeDate(date: Date, options: Intl.DateTimeFormatOptions): string {
    return new Intl.DateTimeFormat('en-SG', { ...options, timeZone: 'Asia/Singapore' }).format(date);
  }

  private formatSingaporeDateTime(date: Date | null): string {
    if (!date) return '';
    return new Intl.DateTimeFormat('en-SG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Singapore',
    }).format(date);
  }

  private csvCell(value: string): string {
    const text = String(value ?? '');
    if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  }

  private parseSingaporeDayBound(value: string | undefined, endOfDay: boolean): Date | null {
    const raw = String(value || '').trim();
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const start = new Date(Date.UTC(year, month, day) - this.sgOffsetMs);
    if (!endOfDay) return start;
    return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  }

  private isDateInRange(date: Date | null, from: Date | null, to: Date | null): boolean {
    if (!date) return false;
    const t = date.getTime();
    if (from && t < from.getTime()) return false;
    if (to && t > to.getTime()) return false;
    return true;
  }

  private async resolveDefaultProgramId(): Promise<string | null> {
    const programs = await this.programRepository.find({
      where: { status: ProgramStatus.Active },
      order: { createdAt: 'ASC' },
      select: ['id'],
    });
    for (const program of programs) {
      const count = await this.courseRepository.count({
        where: { programId: program.id, isBundle: false },
      });
      if (count > 0) return program.id;
    }
    const any = await this.courseRepository.findOne({
      where: { programId: Not(IsNull()), isBundle: false },
      select: ['programId'],
    });
    return any?.programId || null;
  }

  private percentChange(current: number, previous: number): number {
    if (previous <= 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 1000) / 10;
  }
}

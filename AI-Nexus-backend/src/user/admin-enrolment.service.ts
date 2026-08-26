import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as XLSX from 'xlsx';

import { AuthProvider, UserEntity, UserRole, UserStatus } from './users.entity';
import { EnrolmentAiService } from './enrolment-ai.service';
import {
  ADMIN_ENROLMENT_FIELDS,
  AdminEnrolmentColumnIndex,
  AdminEnrolmentFieldKey,
  AdminEnrolmentHeaderMapping,
  AdminEnrolmentMappedRow,
  compactHeader,
  mapAccountType,
  mapCategoryAndCountry,
  maskNric,
  membershipNumberFromRow,
  resolveIdFields,
} from './admin-enrolment-map.util';

export type AdminEnrolmentPreviewRow = AdminEnrolmentMappedRow & {
  exists: boolean;
  action: 'insert' | 'update';
  aiNotes: string[];
};

@Injectable()
export class AdminEnrolmentService {
  private readonly logger = new Logger(AdminEnrolmentService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly enrolmentAi: EnrolmentAiService,
  ) {}

  async preview(params: {
    file?: Express.Multer.File;
    companyCode: string;
    companyName: string;
  }) {
    const companyCode = String(params.companyCode || '').trim();
    const companyName = String(params.companyName || '').trim();
    if (!companyCode) throw new BadRequestException('Company code is required.');
    if (!companyName) throw new BadRequestException('Company name is required.');
    const table = this.readEnrolmentTable(params.file);
    const columns = await this.resolveColumns(table.headers, table.dataRows);
    const mapped = this.mapTableRows(table.dataRows, columns.idx);
    const withStatus = await this.attachExists(mapped);
    const verified = await this.verifyRowsWithAi(withStatus);

    return {
      companyCode,
      companyName,
      aiUsed: this.enrolmentAi.isConfigured(),
      aiHeaderMapped: columns.aiUsed,
      headerMappings: columns.mappings,
      total: verified.length,
      willInsert: verified.filter((row) => row.action === 'insert').length,
      willUpdate: verified.filter((row) => row.action === 'update').length,
      rows: verified,
    };
  }

  async apply(params: {
    companyCode: string;
    companyName: string;
    rows: Array<Partial<AdminEnrolmentPreviewRow>>;
  }) {
    const companyCode = String(params.companyCode || '').trim();
    const companyName = String(params.companyName || '').trim();
    if (!companyCode) throw new BadRequestException('Company code is required.');
    if (!companyName) throw new BadRequestException('Company name is required.');
    const rows = (Array.isArray(params.rows) ? params.rows : [])
      .map((row) => this.sanitizeApplyRow(row))
      .filter((row): row is AdminEnrolmentMappedRow => Boolean(row));
    if (!rows.length) throw new BadRequestException('No learner rows to apply.');

    let inserted = 0;
    let updated = 0;
    const failures: Array<{ email: string; message: string }> = [];

    for (const row of rows) {
      const email = String(row.email || '').trim().toLowerCase();
      if (!email) continue;
      try {
        const existing = await this.findExistingUser(email);
        if (existing) {
          await this.updateExistingMissingFields(existing, row, companyCode, companyName);
          updated += 1;
        } else {
          await this.insertNewUser(row, companyCode, companyName);
          inserted += 1;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save user';
        failures.push({ email, message });
        this.logger.error(`Admin enrolment apply failed for ${email}: ${message}`);
      }
    }

    return { inserted, updated, failed: failures.length, failures };
  }

  private readEnrolmentTable(file?: Express.Multer.File): {
    headers: string[];
    dataRows: string[][];
  } {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Please upload an Excel file (.xlsx or .xls).');
    }
    const name = String(file.originalname || '').toLowerCase();
    if (!/\.(xlsx|xls)$/i.test(name)) {
      throw new BadRequestException('Only .xlsx or .xls files are allowed.');
    }

    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(file.buffer, { type: 'buffer', cellDates: false, raw: false });
    } catch {
      throw new BadRequestException('Could not read the Excel file.');
    }
    const sheet = this.pickEnrolmentSheet(workbook);
    if (!sheet) throw new BadRequestException('Excel file has no worksheets.');

    const matrix = XLSX.utils.sheet_to_json<(string | number | boolean | null | undefined)[]>(sheet, {
      header: 1,
      defval: '',
      blankrows: false,
      raw: false,
    });
    const rows = (Array.isArray(matrix) ? matrix : [])
      .map((row) => (Array.isArray(row) ? row : []).map((cell) => this.cellToString(cell)))
      .filter((row) => row.some((cell) => cell.length > 0));
    if (rows.length < 2) {
      throw new BadRequestException('Excel must include a header row and at least one learner row.');
    }
    return { headers: rows[0], dataRows: rows.slice(1) };
  }

  private emptyColumnIndex(): AdminEnrolmentColumnIndex {
    return {
      email: -1,
      firstName: -1,
      lastName: -1,
      nameAsPerId: -1,
      idType: -1,
      idNumber: -1,
      nationality: -1,
      citizenship: -1,
      isca: -1,
      otherBodies: -1,
      job: -1,
      accounting: -1,
      org: -1,
      memberId: -1,
      userId: -1,
    };
  }

  private buildRuleColumnIndex(headers: string[]): AdminEnrolmentColumnIndex {
    const compacted = headers.map((header) => compactHeader(header));
    const col = (...aliases: string[]) => {
      for (const alias of aliases) {
        const exact = compacted.findIndex((header) => header === alias);
        if (exact >= 0) return exact;
      }
      for (const alias of aliases) {
        const partial = compacted.findIndex((header) => header.includes(alias));
        if (partial >= 0) return partial;
      }
      return -1;
    };
    return {
      firstName: col('firstname', 'givenname'),
      lastName: col('lastname', 'surname', 'familyname'),
      nameAsPerId: col('nameasperid', 'fullname', 'learnername'),
      email: col('corporateemailaddress', 'corporateemail', 'emailaddress', 'email', 'workemail'),
      idType: col('idtype', 'nricfintype'),
      idNumber: col('nricfinpassport', 'nricfin', 'idnumber', 'passportno', 'nric'),
      nationality: col('nationality'),
      citizenship: col('citizenship', 'residentialstatus'),
      isca: col('iscamembernonmember', 'iscamemberstatus', 'iscamember', 'membertype'),
      otherBodies: col('membershipofotheraccountingbodies', 'otheraccountingbodies'),
      job: col('jobfunction', 'jobtitle', 'designation'),
      accounting: col('isthejobfunctionaccountingrelated', 'accountingrelated'),
      org: col('organisationname', 'organizationname', 'companyname', 'company'),
      memberId: col('iscamemberidlogin', 'iscamemberid', 'membershipnumber'),
      userId: col('userid'),
    };
  }

  private async resolveColumns(
    headers: string[],
    dataRows: string[][],
  ): Promise<{
    idx: AdminEnrolmentColumnIndex;
    mappings: AdminEnrolmentHeaderMapping[];
    aiUsed: boolean;
  }> {
    const ruleIdx = this.buildRuleColumnIndex(headers);
    const aiIdx = await this.enrolmentAi.mapHeaders(headers, dataRows);

    const used = new Set<number>();
    const idx = this.emptyColumnIndex();
    const source: Partial<Record<AdminEnrolmentFieldKey, 'ai' | 'rules'>> = {};

    const assign = (field: AdminEnrolmentFieldKey, column: number, from: 'ai' | 'rules') => {
      if (column < 0 || column >= headers.length || used.has(column) || idx[field] >= 0) return;
      if (field === 'email' && !this.enrolmentAi.columnLooksLikeEmail(dataRows, column)) return;
      idx[field] = column;
      used.add(column);
      source[field] = from;
    };

    const emailFromSamples = headers.findIndex((_, column) =>
      this.enrolmentAi.columnLooksLikeEmail(dataRows, column),
    );
    assign('email', typeof aiIdx?.email === 'number' ? aiIdx.email : -1, 'ai');
    assign('email', ruleIdx.email, 'rules');
    assign('email', emailFromSamples, 'rules');
    if (idx.email < 0) {
      throw new BadRequestException(
        'Could not find an email column. Use a header such as Corporate email address or Email.',
      );
    }

    ADMIN_ENROLMENT_FIELDS.filter((field) => field.key !== 'email').forEach((field) => {
      const aiCol = aiIdx?.[field.key];
      if (typeof aiCol === 'number') assign(field.key, aiCol, 'ai');
    });
    ADMIN_ENROLMENT_FIELDS.filter((field) => field.key !== 'email').forEach((field) => {
      assign(field.key, ruleIdx[field.key], 'rules');
    });

    const mappings = ADMIN_ENROLMENT_FIELDS.filter((field) => idx[field.key] >= 0).map((field) => ({
      field: field.key,
      label: field.label,
      header: headers[idx[field.key]] || '',
      source: source[field.key] || 'rules',
    }));

    return { idx, mappings, aiUsed: Boolean(aiIdx) };
  }

  private mapTableRows(dataRows: string[][], idx: AdminEnrolmentColumnIndex): AdminEnrolmentMappedRow[] {
    const mapped: AdminEnrolmentMappedRow[] = [];
    const seen = new Set<string>();
    for (const cells of dataRows) {
      const read = (i: number) => (i >= 0 ? this.cellToString(cells[i]) : '');
      const email = read(idx.email).toLowerCase();
      if (!email || !email.includes('@') || seen.has(email)) continue;
      seen.add(email);

      const rawIdType = read(idx.idType);
      const ids = resolveIdFields(rawIdType, read(idx.idNumber));
      const category = mapCategoryAndCountry({
        idType: rawIdType,
        citizenship: read(idx.citizenship),
        nationality: read(idx.nationality),
      });
      const account = mapAccountType(read(idx.isca));

      mapped.push({
        email,
        firstname: read(idx.firstName) || 'Learner',
        lastname: read(idx.lastName) || 'Staff',
        nameAsPerId: read(idx.nameAsPerId),
        rawIdType,
        idType: ids.idType,
        idNumber: ids.idNumber,
        nationality: read(idx.nationality),
        citizenshipRaw: read(idx.citizenship),
        eligibility: category.eligibility,
        eligibilityIsSingaporePr: category.eligibilityIsSingaporePr,
        countryOfResidence: category.countryOfResidence,
        jobFunction: read(idx.job),
        learnerAsAnAccounting: read(idx.accounting),
        iscaMemberStatus: read(idx.isca),
        accountType: account.accountType,
        eligibilityIsIscaMember: account.eligibilityIsIscaMember,
        membershipNumber: membershipNumberFromRow(read(idx.memberId), read(idx.userId)),
        otherAccountingBodies: read(idx.otherBodies),
        organisationName: read(idx.org),
      });
    }

    if (!mapped.length) {
      throw new BadRequestException('No valid learner emails found in the Excel file.');
    }
    return mapped;
  }

  private async attachExists(rows: AdminEnrolmentMappedRow[]): Promise<AdminEnrolmentPreviewRow[]> {
    const result: AdminEnrolmentPreviewRow[] = [];
    for (const row of rows) {
      const existing = await this.findExistingUser(row.email);
      result.push({
        ...row,
        exists: Boolean(existing),
        action: existing ? 'update' : 'insert',
        aiNotes: [],
      });
    }
    return result;
  }

  private async verifyRowsWithAi(
    rows: AdminEnrolmentPreviewRow[],
  ): Promise<AdminEnrolmentPreviewRow[]> {
    const verified = await this.enrolmentAi.verifyAndCorrect(
      rows.map((row) => ({
        email: row.email,
        citizenshipRaw: row.citizenshipRaw,
        nationality: row.nationality,
        rawIdType: row.rawIdType,
        eligibility: row.eligibility,
        countryOfResidence: row.countryOfResidence,
        idType: row.idType,
        idNumber: row.idNumber,
        iscaMemberStatus: row.iscaMemberStatus,
        accountType: row.accountType,
        aiNotes: [],
      })),
    );
    return rows.map((row, index) => {
      const next = verified[index];
      if (!next) return row;
      const eligibility =
        this.enrolmentAi.normalizeEligibility(next.eligibility) || row.eligibility;
      return {
        ...row,
        eligibility,
        eligibilityIsSingaporePr: eligibility === 'Singapore PR',
        countryOfResidence: next.countryOfResidence,
        idType: next.idType,
        idNumber: next.idNumber,
        accountType: next.accountType,
        eligibilityIsIscaMember: next.accountType === 'Member',
        aiNotes: next.aiNotes,
      };
    });
  }

  private pickEnrolmentSheet(workbook: XLSX.WorkBook): XLSX.WorkSheet | undefined {
    let best: { sheet: XLSX.WorkSheet; score: number } | undefined;
    for (const name of workbook.SheetNames) {
      const sheet = workbook.Sheets[name];
      if (!sheet) continue;
      const matrix = XLSX.utils.sheet_to_json<(string | number | boolean | null | undefined)[]>(sheet, {
        header: 1,
        defval: '',
        blankrows: false,
        raw: false,
      });
      const header = (Array.isArray(matrix?.[0]) ? matrix[0] : [])
        .map((cell) => compactHeader(this.cellToString(cell)))
        .join(' ');
      const rowCount = Array.isArray(matrix) ? Math.max(0, matrix.length - 1) : 0;
      let score = rowCount;
      if (header.includes('corporateemail') || header.includes('email')) score += 1000;
      if (header.includes('idtype') && header.includes('citizenship')) score += 500;
      if (score > (best?.score || 0)) best = { sheet, score };
    }
    return best?.sheet || workbook.Sheets[workbook.SheetNames[0]];
  }

  private async findExistingUser(email: string): Promise<UserEntity | null> {
    return this.userRepository
      .createQueryBuilder('u')
      .where(
        '(LOWER(COALESCE(u.username, :empty1)) = :email OR (LOWER(COALESCE(u.email, :empty2)) = :email AND u.role = :role))',
        { empty1: '', empty2: '', email, role: UserRole.User },
      )
      .getOne();
  }

  private sanitizeApplyRow(row: Partial<AdminEnrolmentPreviewRow> | null): AdminEnrolmentMappedRow | null {
    if (!row || typeof row !== 'object') return null;
    const email = String(row.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) return null;
    const rawIdType = String(row.rawIdType || row.idType || '').trim();
    const eligibility =
      this.enrolmentAi.normalizeEligibility(row.eligibility)
      || mapCategoryAndCountry({
        idType: rawIdType,
        citizenship: String(row.citizenshipRaw || ''),
        nationality: String(row.nationality || ''),
      }).eligibility;
    const accountType =
      this.enrolmentAi.normalizeAccountType(row.accountType) || String(row.accountType || '').trim();
    const idType = this.enrolmentAi.looksLikeMyId(rawIdType)
      ? 'Passport'
      : this.enrolmentAi.normalizeIdType(row.idType) || String(row.idType || '').trim();
    const idNumber = this.enrolmentAi.looksLikeMyId(rawIdType) ? '' : String(row.idNumber || '').trim();
    return {
      email,
      firstname: String(row.firstname || '').trim() || 'Learner',
      lastname: String(row.lastname || '').trim() || 'Staff',
      nameAsPerId: String(row.nameAsPerId || '').trim(),
      rawIdType,
      idType,
      idNumber,
      nationality: String(row.nationality || '').trim(),
      citizenshipRaw: String(row.citizenshipRaw || '').trim(),
      eligibility,
      eligibilityIsSingaporePr: eligibility === 'Singapore PR',
      countryOfResidence: String(row.countryOfResidence || '').trim() || 'Singapore',
      jobFunction: String(row.jobFunction || '').trim(),
      learnerAsAnAccounting: String(row.learnerAsAnAccounting || '').trim(),
      iscaMemberStatus: String(row.iscaMemberStatus || '').trim(),
      accountType,
      eligibilityIsIscaMember: accountType === 'Member',
      membershipNumber: String(row.membershipNumber || '').trim(),
      otherAccountingBodies: String(row.otherAccountingBodies || '').trim(),
      organisationName: String(row.organisationName || '').trim(),
    };
  }

  private buildSnapshot(
    row: AdminEnrolmentMappedRow,
    companyCode: string,
    companyName: string,
  ): Record<string, unknown> {
    return {
      companyCode,
      companyName,
      jobFunction: row.jobFunction,
      jobFunctionLabel: row.jobFunction,
      jobFunctionOther: '',
      department: '',
      role: row.jobFunction,
      yearsOfRelevantWorkExperience: null,
      learnerAsAnAccounting: row.learnerAsAnAccounting,
      eligibility: row.eligibility,
      salutation: '',
      name_as_per_id: row.nameAsPerId,
      id_type: row.idType,
      id_number: row.idNumber,
      nricFin: row.idNumber,
      nricNumber: row.idNumber,
      nationality: row.nationality,
      countryOfResidence: row.countryOfResidence,
      membershipNumber: row.membershipNumber,
      phoneNumber: '',
      organisationType: '',
      iscaMemberStatus: row.iscaMemberStatus,
      accountType: row.accountType,
      salesforceAccountType: row.accountType,
      otherAccountingBodies: row.otherAccountingBodies,
    };
  }

  private empty(value: unknown): boolean {
    return !String(value || '').trim();
  }

  private async updateExistingMissingFields(
    user: UserEntity,
    row: AdminEnrolmentMappedRow,
    companyCode: string,
    companyName: string,
  ) {
    const snapshot = this.buildSnapshot(row, companyCode, companyName);
    if (this.empty(user.firstname)) user.firstname = row.firstname;
    if (this.empty(user.lastname)) user.lastname = row.lastname;
    if (this.empty(user.email)) user.email = row.email;
    if (this.empty(user.username)) user.username = row.email;
    user.companyCode = companyCode;
    if (this.empty(user.eligibilityType)) user.eligibilityType = row.eligibility;
    if (user.eligibilityIsSingaporePr == null) {
      user.eligibilityIsSingaporePr = row.eligibilityIsSingaporePr;
    }
    if (user.eligibilityIsIscaMember == null) {
      user.eligibilityIsIscaMember = row.eligibilityIsIscaMember;
    }
    if (this.empty(user.salesforceAccountType) && row.accountType) {
      user.salesforceAccountType = row.accountType;
    }
    if (this.empty(user.nricFinType) && row.idType) user.nricFinType = row.idType;
    if (this.empty(user.nricFinCanonicalValue) && row.idNumber) {
      const canonical = row.idNumber.toUpperCase().replace(/[^A-Z0-9]/g, '');
      user.nricFinCanonicalValue = canonical || row.idNumber;
      user.nricFinValue = maskNric(row.idNumber);
      user.nricFinSeries = canonical ? canonical[0] : null;
    }

    const prev =
      user.eligibilitySnapshot && typeof user.eligibilitySnapshot === 'object'
        ? user.eligibilitySnapshot
        : {};
    user.eligibilitySnapshot = {
      ...snapshot,
      ...prev,
      companyCode,
      companyName,
      ...(this.empty(prev.countryOfResidence)
        ? { countryOfResidence: row.countryOfResidence, nationality: row.nationality }
        : {}),
      ...(this.empty(prev.eligibility) ? { eligibility: row.eligibility } : {}),
      ...(this.empty(prev.accountType) && row.accountType
        ? {
            accountType: row.accountType,
            salesforceAccountType: row.accountType,
            iscaMemberStatus: row.iscaMemberStatus,
          }
        : {}),
      ...(this.empty(prev.id_type) && row.idType ? { id_type: row.idType } : {}),
      ...(this.empty(prev.id_number) && row.idNumber
        ? {
            id_number: row.idNumber,
            nricFin: row.idNumber,
            nricNumber: row.idNumber,
          }
        : {}),
    };

    const prevRaw =
      user.salesforceUserInfoRaw && typeof user.salesforceUserInfoRaw === 'object'
        ? user.salesforceUserInfoRaw
        : {};
    const prevCorp =
      prevRaw.corporate && typeof prevRaw.corporate === 'object'
        ? (prevRaw.corporate as Record<string, unknown>)
        : {};
    user.salesforceUserInfoRaw = {
      ...prevRaw,
      corporate: {
        ...prevCorp,
        companyCode,
        accountName: companyName,
      },
      ...(this.empty(prevRaw.accountType) && row.accountType
        ? { accountType: row.accountType }
        : {}),
    };
    user.isVerified = true;
    user.isDraft = false;
    await this.userRepository.save(user);
  }

  private async insertNewUser(
    row: AdminEnrolmentMappedRow,
    companyCode: string,
    companyName: string,
  ) {
    const canonical = row.idNumber
      ? row.idNumber.toUpperCase().replace(/[^A-Z0-9]/g, '')
      : '';
    const user = this.userRepository.create({
      username: row.email,
      firstname: row.firstname,
      lastname: row.lastname,
      email: row.email,
      password: null,
      authProvider: AuthProvider.OAUTH,
      companyCode,
      role: UserRole.User,
      status: UserStatus.Active,
      isVerified: true,
      isDraft: false,
      salesforceAccountType: row.accountType || null,
      eligibilityType: row.eligibility,
      eligibilityIsSingaporePr: row.eligibilityIsSingaporePr,
      eligibilityIsIscaMember: row.eligibilityIsIscaMember,
      nricFinType: row.idType || null,
      nricFinSeries: canonical ? canonical[0] : null,
      nricFinValue: row.idNumber ? maskNric(row.idNumber) : null,
      nricFinCanonicalValue: canonical || null,
      eligibilitySnapshot: this.buildSnapshot(row, companyCode, companyName),
      salesforceUserInfoRaw: {
        corporate: { accountName: companyName, companyCode },
        ...(row.accountType ? { accountType: row.accountType } : {}),
      },
      salesforceSyncedAt: new Date(),
    });
    await this.userRepository.save(user);
  }

  private cellToString(cell: unknown): string {
    if (cell === null || cell === undefined) return '';
    if (typeof cell === 'number' && Number.isFinite(cell)) {
      if (Number.isInteger(cell)) return String(Math.trunc(cell));
      return String(cell);
    }
    return String(cell)
      .replace(/\u00a0/g, ' ')
      .replace(/^\ufeff/, '')
      .trim();
  }
}

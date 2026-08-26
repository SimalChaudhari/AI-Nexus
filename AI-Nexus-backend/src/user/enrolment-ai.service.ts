import { Injectable, Logger } from '@nestjs/common';

import { LlmService } from '../llm/llm.service';
import {
  ADMIN_ENROLMENT_FIELDS,
  AdminEnrolmentColumnIndex,
  compactHeader,
} from './admin-enrolment-map.util';

export type EnrolmentAiMappedValues = {
  email: string;
  citizenshipRaw: string;
  nationality: string;
  rawIdType: string;
  eligibility: string;
  countryOfResidence: string;
  idType: string;
  idNumber: string;
  iscaMemberStatus: string;
  accountType: string;
  aiNotes: string[];
};

type EnrolmentAiRow = {
  email?: string;
  ok?: boolean;
  notes?: string[];
  eligibility?: string;
  countryOfResidence?: string;
  idType?: string;
  storeIdNumber?: boolean;
  accountType?: string;
};

@Injectable()
export class EnrolmentAiService {
  private readonly logger = new Logger(EnrolmentAiService.name);

  constructor(private readonly llmService: LlmService) {}

  isConfigured(): boolean {
    return this.llmService.isConfigured();
  }

  columnLooksLikeEmail(dataRows: string[][], column: number): boolean {
    let hits = 0;
    let seen = 0;
    for (const row of dataRows.slice(0, 12)) {
      const value = String(row[column] || '').trim();
      if (!value) continue;
      seen += 1;
      if (value.includes('@')) hits += 1;
    }
    return seen > 0 && hits / seen >= 0.5;
  }

  async mapHeaders(
    headers: string[],
    dataRows: string[][],
  ): Promise<Partial<AdminEnrolmentColumnIndex> | null> {
    if (!this.isConfigured()) return null;
    try {
      return await this.mapHeadersWithAi(headers, dataRows);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI header mapping failed';
      this.logger.warn(`AI header mapping skipped: ${message}`);
      return null;
    }
  }

  async verifyAndCorrect(
    rows: EnrolmentAiMappedValues[],
  ): Promise<EnrolmentAiMappedValues[]> {
    if (!this.isConfigured()) {
      return rows.map((row) => ({
        ...row,
        aiNotes: ['AI is not configured. Used built-in mapping rules only.'],
      }));
    }

    const chunkSize = 20;
    const out = [...rows];
    for (let i = 0; i < out.length; i += chunkSize) {
      const chunk = out.slice(i, i + chunkSize);
      try {
        const verified = await this.verifyChunk(chunk);
        verified.forEach((item, offset) => {
          out[i + offset] = item;
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'AI verification failed';
        this.logger.warn(`AI enrolment verify skipped: ${message}`);
        chunk.forEach((_, offset) => {
          out[i + offset] = {
            ...out[i + offset],
            aiNotes: [`AI verification skipped: ${message}`],
          };
        });
      }
    }
    return out;
  }

  normalizeEligibility(value: unknown): 'Singapore Citizen' | 'Singapore PR' | 'Foreigner' | '' {
    const raw = String(value || '').trim().toLowerCase();
    if (raw === 'singapore citizen' || raw === 'citizen') return 'Singapore Citizen';
    if (raw === 'singapore pr' || raw === 'pr' || raw === 'permanent resident') return 'Singapore PR';
    if (raw === 'foreigner' || raw === 'non-singaporean' || raw === 'non singaporean') {
      return 'Foreigner';
    }
    return '';
  }

  normalizeIdType(value: unknown): string {
    const raw = String(value || '').trim().toLowerCase();
    if (raw === 'pink') return 'Pink';
    if (raw === 'blue') return 'Blue';
    if (raw === 'fin') return 'Fin';
    if (raw === 'passport' || raw === 'my id' || raw === 'myid') return 'Passport';
    return '';
  }

  normalizeAccountType(value: unknown): string {
    const raw = String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[-_/]+/g, ' ')
      .replace(/\s+/g, ' ');
    if (/non\s*member/.test(raw)) return 'Non member';
    if (raw === 'member' || raw === 'isca member') return 'Member';
    return '';
  }

  looksLikeMyId(idType: string): boolean {
    return compactHeader(idType) === 'myid';
  }

  private async mapHeadersWithAi(
    headers: string[],
    dataRows: string[][],
  ): Promise<Partial<AdminEnrolmentColumnIndex>> {
    const sampleRows = dataRows.slice(0, 3).map((row) =>
      headers.map((_, column) => this.sampleCellForAi(row[column] || '')),
    );
    const result = await this.llmService.chat({
      useCase: 'default',
      temperature: 0,
      maxTokens: 1200,
      messages: [
        {
          role: 'system',
          content:
            'Map messy Excel headers to enrolment fields. Reply with JSON only: {"columns":{"email":0,"firstName":1,"lastName":2,"nameAsPerId":3,"idType":4,"idNumber":5,"nationality":6,"citizenship":7,"isca":8,"otherBodies":9,"job":10,"accounting":11,"org":12,"memberId":13,"userId":14}}. Use the 0-based header index. Use null if a field is missing. One column maps to at most one field. email is the column whose samples contain @ (corporate email, work email, email address). firstName is given name even if the header is "First Name -", "FName", or similar. lastName is surname. Ignore serial/no/# columns.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            fields: ADMIN_ENROLMENT_FIELDS.map((field) => field.key),
            headers: headers.map((header, index) => ({
              index,
              header,
              samples: sampleRows.map((row) => row[index] || '').filter(Boolean).slice(0, 3),
            })),
          }),
        },
      ],
    });

    const parsed = this.parseAiJson(result.text);
    const columns =
      parsed.columns && typeof parsed.columns === 'object'
        ? (parsed.columns as Record<string, unknown>)
        : {};
    const mapped: Partial<AdminEnrolmentColumnIndex> = {};
    for (const field of ADMIN_ENROLMENT_FIELDS) {
      const value = columns[field.key];
      if (value === null || value === undefined || value === '') continue;
      const index = Number(value);
      if (!Number.isInteger(index) || index < 0 || index >= headers.length) continue;
      mapped[field.key] = index;
    }
    return mapped;
  }

  private async verifyChunk(
    rows: EnrolmentAiMappedValues[],
  ): Promise<EnrolmentAiMappedValues[]> {
    const payload = rows.map((row) => ({
      email: row.email,
      citizenship: row.citizenshipRaw,
      nationality: row.nationality,
      idType: row.rawIdType,
      mappedEligibility: row.eligibility,
      mappedCountry: row.countryOfResidence,
      mappedIdType: row.idType,
      mappedIdNumberStored: Boolean(row.idNumber),
      iscaMemberStatus: row.iscaMemberStatus,
      mappedAccountType: row.accountType,
    }));

    const result = await this.llmService.chat({
      useCase: 'default',
      temperature: 0,
      maxTokens: 3500,
      messages: [
        {
          role: 'system',
          content:
            'You verify and correct ISCA bulk enrolment mappings. Reply with JSON only: {"rows":[{"email":"","ok":true,"notes":[""],"eligibility":"Singapore Citizen|Singapore PR|Foreigner","countryOfResidence":"","idType":"Pink|Blue|Fin|Passport","storeIdNumber":true,"accountType":"Member|Non member"}]}. Rules: Pink + Singaporean/SPR -> Singapore Citizen, country Singapore. Blue + Singaporean/SPR -> Singapore PR, country Singapore. Non-Singaporean (including MY ID, Fin, Passport) -> Foreigner; country from nationality (Malaysian=Malaysia, Chinese=China, Indonesian=Indonesia, Singaporean=Singapore). MY ID -> idType Passport and storeIdNumber false. ISCA Member -> accountType Member. Non-member/Non member -> Non member. Only change a field when the mapped value is wrong. Keep notes short.',
        },
        {
          role: 'user',
          content: JSON.stringify({ rows: payload }),
        },
      ],
    });

    const parsed = this.parseAiJson(result.text);
    const byEmail = new Map<string, EnrolmentAiRow>();
    const aiRows = Array.isArray(parsed.rows) ? parsed.rows : [];
    for (const item of aiRows) {
      const email = String(item?.email || '').trim().toLowerCase();
      if (!email) continue;
      byEmail.set(email, item);
    }

    return rows.map((row) => this.applyCorrection(row, byEmail.get(row.email)));
  }

  private applyCorrection(
    row: EnrolmentAiMappedValues,
    ai?: EnrolmentAiRow,
  ): EnrolmentAiMappedValues {
    const notes = Array.isArray(ai?.notes)
      ? ai.notes.map((note) => String(note || '').trim()).filter(Boolean)
      : [];
    if (!ai) {
      return { ...row, aiNotes: ['AI did not return this row; using mapped values.'] };
    }

    const next: EnrolmentAiMappedValues = { ...row, aiNotes: notes };
    const eligibility = this.normalizeEligibility(ai.eligibility);
    if (eligibility && eligibility !== row.eligibility) {
      next.eligibility = eligibility;
      notes.push(`AI set category to ${eligibility}.`);
    }

    const country = String(ai.countryOfResidence || '').trim();
    if (country && country !== row.countryOfResidence) {
      next.countryOfResidence = country;
      notes.push(`AI set country of residence to ${country}.`);
    }

    const idType = this.normalizeIdType(ai.idType);
    if (idType && idType !== row.idType) {
      next.idType = idType;
      notes.push(`AI set ID type to ${idType}.`);
    }
    if (this.looksLikeMyId(row.rawIdType) && (next.idType !== 'Passport' || next.idNumber)) {
      next.idType = 'Passport';
      next.idNumber = '';
      notes.push('AI treated MY ID as Passport and did not store the number as NRIC.');
    }

    const accountType = this.normalizeAccountType(ai.accountType);
    if (accountType && accountType !== row.accountType) {
      next.accountType = accountType;
      notes.push(`AI set account type to ${accountType}.`);
    }

    if (!notes.length) {
      notes.push(ai.ok === false ? 'AI flagged this row for review.' : 'AI verified.');
    }
    next.aiNotes = [...new Set(notes)];
    return next;
  }

  private sampleCellForAi(value: string): string {
    const text = String(value || '').trim();
    if (!text) return '';
    if (text.includes('@')) return text.toLowerCase();
    if (/\d/.test(text) && text.replace(/\s/g, '').length >= 8) return '***';
    return text.slice(0, 40);
  }

  private parseAiJson(text: string): {
    rows?: EnrolmentAiRow[];
    columns?: Record<string, unknown>;
  } {
    const raw = String(text || '').trim();
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start < 0 || end <= start) return {};
    try {
      return JSON.parse(raw.slice(start, end + 1)) as {
        rows?: EnrolmentAiRow[];
        columns?: Record<string, unknown>;
      };
    } catch {
      return {};
    }
  }
}

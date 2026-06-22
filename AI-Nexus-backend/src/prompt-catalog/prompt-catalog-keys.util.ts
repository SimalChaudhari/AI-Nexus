import { randomUUID } from 'crypto';

/** Collapse repeated whitespace for stable comparison keys. */
export function normalizeWs(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

/**
 * External feeds prefix section titles per assistant ("Gemini Prompts for Astrology").
 * Merge on the topic (e.g. Astrology) + use case so identical prompts collapse across ChatGPT/Gemini/Claude.
 */
export function promptCatalogMergeKey(sectionTitle: string, useCase: string): string {
  const st = normalizeWs(sectionTitle);
  const uc = normalizeWs(useCase);
  const topicMatch = st.match(/prompts?\s+for\s+(.+)$/i);
  const topic = topicMatch ? normalizeWs(topicMatch[1]).toLowerCase() : st.toLowerCase();
  return `${topic}||${uc.toLowerCase()}`;
}

/** Strip leading assistant name from section titles for cleaner stored labels. */
export function displaySectionTitle(sectionTitle: string): string {
  const st = normalizeWs(sectionTitle);
  const stripped = st.match(/^(?:Gemini|ChatGPT|Claude)\s+(.+)$/i);
  return stripped ? normalizeWs(stripped[1]) : st;
}

/** Plain one-line text for merge keys when reading from DB (may contain HTML). */
export function plainTextForMergeKey(value: string): string {
  return normalizeWs(String(value || '').replace(/<[^>]*>/g, ' '));
}

export const MANUAL_PROMPT_MERGE_KEY_PREFIX = 'manual:';

export function isManualPromptMergeKey(key: string | null | undefined): boolean {
  return String(key || '').startsWith(MANUAL_PROMPT_MERGE_KEY_PREFIX);
}

export function buildManualPromptMergeKey(): string {
  return `${MANUAL_PROMPT_MERGE_KEY_PREFIX}${randomUUID()}`;
}

/** Matches admin category grouping (plain lowercased section title). */
export function adminCategoryKeyFromTitle(sectionTitle: string): string {
  const plain = plainTextForMergeKey(sectionTitle).toLowerCase();
  return plain || '__uncategorized__';
}

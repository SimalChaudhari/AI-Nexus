export type ProgramPillarIndex = 1 | 2 | 3;

export function resolveProgramPillarIndexFromLevel(level?: string | null): ProgramPillarIndex | null {
  const normalized = String(level || '').trim().toLowerCase();
  if (
    normalized.includes('beginner') ||
    normalized.includes('foundation') ||
    normalized === 'basic'
  ) {
    return 1;
  }
  if (normalized.includes('intermediate') || normalized.includes('workflow')) {
    return 2;
  }
  if (
    normalized.includes('advanced') ||
    normalized.includes('builder') ||
    normalized === 'advance'
  ) {
    return 3;
  }
  return null;
}

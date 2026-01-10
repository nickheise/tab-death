export const isoNow = (): string => new Date().toISOString();

export const parseIso = (iso: string): Date => {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid ISO8601: ${iso}`);
  }
  return parsed;
};

export const toEpochMs = (iso: string): number => parseIso(iso).getTime();

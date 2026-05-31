export type JsonRecord = Record<string, unknown>;

export function asJsonRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as JsonRecord;
}

export function readNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
}

export function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string => readNonEmptyString(item) !== null,
  );
}

export function readStringRecord(value: unknown): Record<string, string> {
  const record = asJsonRecord(value);

  return Object.fromEntries(
    Object.entries(record).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );
}

export function readNumberField(
  value: unknown,
  fieldName: string,
): number | undefined {
  const record = asJsonRecord(value);
  const fieldValue = record[fieldName];

  return typeof fieldValue === 'number' ? fieldValue : undefined;
}

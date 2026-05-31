const SENSITIVE_KEY_PATTERN =
  /(?:token|secret|password|authorization|api[-_]?key|bot[-_]?token|bearer|credential|private[-_]?key)/i;

export function maskSensitiveJson<T>(value: T): T {
  return maskValue(value) as T;
}

function maskValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => maskValue(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        SENSITIVE_KEY_PATTERN.test(key)
          ? maskScalar(nestedValue)
          : maskValue(nestedValue),
      ]),
    );
  }

  return value;
}

function maskScalar(value: unknown) {
  if (typeof value !== 'string') {
    return '[redacted]';
  }

  if (value.length <= 8) {
    return '[redacted]';
  }

  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

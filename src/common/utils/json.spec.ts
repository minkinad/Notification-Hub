import {
  asJsonRecord,
  readNonEmptyString,
  readNumberField,
  readStringArray,
  readStringRecord,
} from './json';

describe('json utils', () => {
  it('normalizes object-like values to records', () => {
    expect(asJsonRecord({ url: 'https://example.com' })).toEqual({
      url: 'https://example.com',
    });
    expect(asJsonRecord(null)).toEqual({});
    expect(asJsonRecord(['not', 'a', 'record'])).toEqual({});
  });

  it('reads only meaningful strings', () => {
    expect(readNonEmptyString('  value  ')).toBe('value');
    expect(readNonEmptyString('   ')).toBeNull();
    expect(readNonEmptyString(42)).toBeNull();
  });

  it('filters arrays to meaningful strings and records to string values', () => {
    expect(readStringArray(['events:ingest', '', ' users:read ', 1])).toEqual([
      'events:ingest',
      ' users:read ',
    ]);
    expect(
      readStringRecord({
        authorization: 'Bearer token',
        empty: '',
        retry: 3,
      }),
    ).toEqual({
      authorization: 'Bearer token',
      empty: '',
    });
  });

  it('reads numeric fields from records', () => {
    expect(readNumberField({ statusCode: 202 }, 'statusCode')).toBe(202);
    expect(
      readNumberField({ statusCode: '202' }, 'statusCode'),
    ).toBeUndefined();
    expect(readNumberField(null, 'statusCode')).toBeUndefined();
  });
});

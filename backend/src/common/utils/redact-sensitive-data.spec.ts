import { redactSensitiveData } from './redact-sensitive-data';

describe('redactSensitiveData', () => {
  it('should return empty string for null or undefined input', () => {
    expect(redactSensitiveData(null)).toBe('');
    expect(redactSensitiveData(undefined)).toBe('');
  });

  it('should convert non-string input to string and redact if applicable', () => {
    expect(redactSensitiveData(12345)).toBe('12345');
  });

  it('should redact PostgreSQL URI completely', () => {
    const raw = 'postgres://user123:secretPass%40word@host-db.supabase.co:5432/my-db?sslmode=require';
    const expected = 'postgres://[REDACTED_USER]:[REDACTED_PASSWORD]@[REDACTED_HOST]/[REDACTED_DB]?sslmode=require';
    expect(redactSensitiveData(raw)).toBe(expected);
  });

  it('should redact key-value parameters', () => {
    const raw = 'error connecting with password=some-password&token=xyz123';
    expect(redactSensitiveData(raw)).toContain('password=[REDACTED]');
    expect(redactSensitiveData(raw)).toContain('token=[REDACTED]');
  });

  it('should redact DATABASE_URL and DIRECT_URL env strings', () => {
    const raw = 'Environment settings: DATABASE_URL=postgres://foo:bar@localhost DIRECT_URL=postgres://baz:qux@localhost';
    expect(redactSensitiveData(raw)).toContain('DATABASE_URL=[REDACTED]');
    expect(redactSensitiveData(raw)).toContain('DIRECT_URL=[REDACTED]');
  });
});

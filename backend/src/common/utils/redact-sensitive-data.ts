/**
 * Redacts sensitive credentials, connection strings, passwords, and tokens from error messages or logs.
 */
export function redactSensitiveData(input: unknown): string {
  if (input === null || input === undefined) {
    return '';
  }

  const str = typeof input === 'string' ? input : String(input);

  // 1. Redact PostgreSQL/Database connection URIs:
  // e.g. postgresql://user:password@host:port/database?sslmode=require
  let redacted = str.replace(
    /(postgres(?:ql)?:\/\/)([^:@\s]+):([^@\s]+)@([^/\s?]+)\/([^\s?]*)/gi,
    '$1[REDACTED_USER]:[REDACTED_PASSWORD]@[REDACTED_HOST]/[REDACTED_DB]'
  );

  // 2. Redact passwords, tokens, secrets in query string format or key-value pairs:
  // e.g., password=foo, api_key=bar, token=baz, jwt_secret=xyz
  redacted = redacted.replace(
    /(password|passwd|pass|api_key|apikey|token|access_token|refresh_token|jwt_secret|secret)\s*[:=]\s*[^\s,;&]+/gi,
    '$1=[REDACTED]'
  );

  // 3. Redact env keys if present in messages
  redacted = redacted.replace(/DATABASE_URL=[^\s]+/gi, 'DATABASE_URL=[REDACTED]');
  redacted = redacted.replace(/DIRECT_URL=[^\s]+/gi, 'DIRECT_URL=[REDACTED]');

  return redacted;
}

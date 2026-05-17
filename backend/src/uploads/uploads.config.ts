const DEFAULT_UPLOAD_IMAGE_MAX_SIZE_MB = 20;
const DEFAULT_UPLOAD_IMAGE_RATE_LIMIT = 10;
const DEFAULT_UPLOAD_IMAGE_RATE_TTL_MS = 60_000;

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

const uploadImageMaxSizeMb = parsePositiveInt(
  process.env.UPLOAD_IMAGE_MAX_SIZE_MB,
  DEFAULT_UPLOAD_IMAGE_MAX_SIZE_MB,
);

export const uploadConfig = {
  uploadImageMaxSizeBytes: uploadImageMaxSizeMb * 1024 * 1024,
  uploadImageRateLimit: parsePositiveInt(
    process.env.UPLOAD_IMAGE_RATE_LIMIT,
    DEFAULT_UPLOAD_IMAGE_RATE_LIMIT,
  ),
  uploadImageRateTtlMs: parsePositiveInt(
    process.env.UPLOAD_IMAGE_RATE_TTL_MS,
    DEFAULT_UPLOAD_IMAGE_RATE_TTL_MS,
  ),
} as const;

export const ALLOWED_IMAGE_MIME_TYPES: readonly string[] = [
  'image/png',
  'image/jpeg',
  'image/webp',
];

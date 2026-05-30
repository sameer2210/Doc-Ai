import {
  UPLOAD_IMAGE_MAX_HEIGHT_PX,
  UPLOAD_IMAGE_MAX_SIZE_BYTES,
  UPLOAD_IMAGE_MAX_WIDTH_PX,
  UPLOAD_IMAGE_MIME_TYPES,
} from './upload.constants';

const DEFAULT_UPLOAD_IMAGE_RATE_LIMIT = 10;
const DEFAULT_UPLOAD_IMAGE_RATE_TTL_MS = 60_000;

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export const uploadConfig = {
  uploadImageMaxSizeBytes: UPLOAD_IMAGE_MAX_SIZE_BYTES,
  uploadImageMaxWidthPx: UPLOAD_IMAGE_MAX_WIDTH_PX,
  uploadImageMaxHeightPx: UPLOAD_IMAGE_MAX_HEIGHT_PX,
  uploadImageRateLimit: parsePositiveInt(
    process.env.UPLOAD_IMAGE_RATE_LIMIT,
    DEFAULT_UPLOAD_IMAGE_RATE_LIMIT,
  ),
  uploadImageRateTtlMs: parsePositiveInt(
    process.env.UPLOAD_IMAGE_RATE_TTL_MS,
    DEFAULT_UPLOAD_IMAGE_RATE_TTL_MS,
  ),
} as const;

export const ALLOWED_IMAGE_MIME_TYPES: readonly string[] = UPLOAD_IMAGE_MIME_TYPES;

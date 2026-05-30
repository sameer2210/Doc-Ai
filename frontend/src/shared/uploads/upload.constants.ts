export const UPLOAD_IMAGE_MAX_SIZE_MB = 5;
export const UPLOAD_IMAGE_MAX_SIZE_BYTES = UPLOAD_IMAGE_MAX_SIZE_MB * 1024 * 1024;
export const UPLOAD_IMAGE_MAX_WIDTH_PX = 4096;
export const UPLOAD_IMAGE_MAX_HEIGHT_PX = 4096;

export const UPLOAD_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
] as const;

export type UploadImageMimeType = (typeof UPLOAD_IMAGE_MIME_TYPES)[number];

export const NORMALIZED_UPLOAD_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type NormalizedUploadImageMimeType =
  (typeof NORMALIZED_UPLOAD_IMAGE_MIME_TYPES)[number];


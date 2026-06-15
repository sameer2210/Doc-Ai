export const UPLOAD_IMAGE_INPUT_MAX_SIZE_MB = 50;
export const UPLOAD_IMAGE_INPUT_MAX_SIZE_BYTES = UPLOAD_IMAGE_INPUT_MAX_SIZE_MB * 1024 * 1024;

export const UPLOAD_IMAGE_MAX_SIZE_MB = 5;
export const UPLOAD_IMAGE_MAX_SIZE_BYTES = UPLOAD_IMAGE_MAX_SIZE_MB * 1024 * 1024;

export const UPLOAD_IMAGE_CROP_SIZE_PX = 640;
export const UPLOAD_IMAGE_WORKING_MAX_EDGE_PX = 2048;
export const UPLOAD_IMAGE_LARGE_DIMENSION_THRESHOLD_PX = 8000;
export const UPLOAD_IMAGE_MAX_DECODED_BITMAP_BYTES = 64 * 1024 * 1024;
export const UPLOAD_IMAGE_MAX_DIMENSION_AREA_PX = 8000 * 8000;
export const UPLOAD_IMAGE_TARGET_FILE_SIZE_BYTES = 500 * 1024;

export const UPLOAD_IMAGE_SUPPORTED_INPUT_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/bmp',
  'image/tiff',
  'image/gif',
] as const;

export type UploadImageMimeType = (typeof UPLOAD_IMAGE_SUPPORTED_INPUT_MIME_TYPES)[number];

export const UPLOAD_IMAGE_SUPPORTED_OUTPUT_MIME_TYPES = ['image/jpeg'] as const;

export type NormalizedUploadImageMimeType = UploadImageMimeType;
export type OptimizedUploadImageMimeType =
  (typeof UPLOAD_IMAGE_SUPPORTED_OUTPUT_MIME_TYPES)[number];

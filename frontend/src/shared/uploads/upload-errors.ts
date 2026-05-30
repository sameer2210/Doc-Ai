import {
  UPLOAD_IMAGE_MAX_SIZE_MB,
  type UploadImageMimeType,
} from './upload.constants';

export const INVALID_IMAGE_FILE_MESSAGE = 'Invalid image file';
export const IMAGE_SIZE_TOO_LARGE_MESSAGE = 'Image exceeds 5 MB limit';
export const IMAGE_SIZE_EXCEEDS_LIMIT_MESSAGE =
  'Image size exceeds 5 MB. Please upload a smaller image.';
export const IMAGE_RESOLUTION_TOO_LARGE_MESSAGE =
  'Image resolution is too large. Please upload a smaller image.';
export const AI_SERVICE_UNAVAILABLE_MESSAGE =
  'AI service is temporarily unavailable. Please try again later.';
export const AI_MODEL_LOADING_MESSAGE =
  'AI model is loading. Please try again in a few moments.';
export const UPLOAD_NETWORK_FAILURE_MESSAGE =
  'Upload failed. Please try again.';
export const UPLOAD_TIMEOUT_MESSAGE =
  'The request timed out. Please try again in a few moments.';

export type UploadValidationIssue =
  | 'invalid_image'
  | 'image_too_large'
  | 'image_resolution_too_large'
  | 'missing_metadata';

export function getUploadValidationMessage(issue: UploadValidationIssue): string {
  if (issue === 'image_too_large') {
    return IMAGE_SIZE_EXCEEDS_LIMIT_MESSAGE;
  }

  if (issue === 'image_resolution_too_large') {
    return IMAGE_RESOLUTION_TOO_LARGE_MESSAGE;
  }

  return INVALID_IMAGE_FILE_MESSAGE;
}

export function getUploadStatusMessage(
  status: number | undefined,
  responseMessage: string | undefined,
): string | null {
  const normalizedMessage = responseMessage?.trim().toLowerCase();

  if (
    normalizedMessage?.includes('loading') ||
    normalizedMessage?.includes('timed out') ||
    normalizedMessage?.includes('timeout')
  ) {
    return AI_MODEL_LOADING_MESSAGE;
  }

  if (status === 400) {
    if (normalizedMessage?.includes('resolution')) {
      return IMAGE_RESOLUTION_TOO_LARGE_MESSAGE;
    }
    return INVALID_IMAGE_FILE_MESSAGE;
  }

  if (status === 413) {
    return IMAGE_SIZE_TOO_LARGE_MESSAGE;
  }

  if (status === 503) {
    return AI_SERVICE_UNAVAILABLE_MESSAGE;
  }

  return null;
}

export function getUploadNetworkMessage(isTimeout: boolean): string {
  return isTimeout ? AI_MODEL_LOADING_MESSAGE : UPLOAD_NETWORK_FAILURE_MESSAGE;
}

export function getUploadPickerLimitMessage(maxSizeMb: number = UPLOAD_IMAGE_MAX_SIZE_MB): string {
  return `Image size exceeds ${maxSizeMb} MB. Please upload a smaller image.`;
}

export function isSupportedUploadImageMimeType(mimeType: string | null | undefined): mimeType is UploadImageMimeType {
  return (
    mimeType === 'image/jpeg' ||
    mimeType === 'image/jpg' ||
    mimeType === 'image/png' ||
    mimeType === 'image/webp'
  );
}


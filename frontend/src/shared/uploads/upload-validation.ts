import * as FileSystem from 'expo-file-system';

import {
  IMAGE_RESOLUTION_TOO_LARGE_MESSAGE,
  IMAGE_SIZE_EXCEEDS_LIMIT_MESSAGE,
  INVALID_IMAGE_FILE_MESSAGE,
  type UploadValidationIssue,
  getUploadValidationMessage,
} from './upload-errors';
import {
  UPLOAD_IMAGE_MAX_HEIGHT_PX,
  UPLOAD_IMAGE_MAX_SIZE_BYTES,
  UPLOAD_IMAGE_MAX_WIDTH_PX,
  type NormalizedUploadImageMimeType,
} from './upload.constants';

export type UploadImageSelection = {
  mimeType?: string | null;
  fileSizeBytes: number;
  width?: number | null;
  height?: number | null;
};

export type UploadImageValidationSuccess = {
  valid: true;
  mimeType: NormalizedUploadImageMimeType;
  fileSizeBytes: number;
  width: number;
  height: number;
};

export type UploadImageValidationFailure = {
  valid: false;
  issue: UploadValidationIssue;
  message: string;
};

export type UploadImageValidationResult =
  | UploadImageValidationSuccess
  | UploadImageValidationFailure;

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

export function normalizeUploadImageMimeType(
  mimeType: string | null | undefined,
): NormalizedUploadImageMimeType | null {
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
    return 'image/jpeg';
  }

  if (mimeType === 'image/png') {
    return 'image/png';
  }

  if (mimeType === 'image/webp') {
    return 'image/webp';
  }

  return null;
}

export function isSupportedUploadImageMimeType(mimeType: string | null | undefined): boolean {
  return normalizeUploadImageMimeType(mimeType) !== null;
}

export async function resolveUploadImageFileSizeBytes(
  uri: string,
  fileSizeBytes: number | null | undefined,
): Promise<number> {
  if (isPositiveInteger(fileSizeBytes ?? 0)) {
    return fileSizeBytes ?? 0;
  }

  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists || typeof info.size !== 'number' || !Number.isInteger(info.size) || info.size <= 0) {
    return 0;
  }

  return info.size;
}

export function validateUploadImageSelection(
  selection: UploadImageSelection,
): UploadImageValidationResult {
  const normalizedMimeType = normalizeUploadImageMimeType(selection.mimeType);
  if (!normalizedMimeType) {
    return {
      valid: false,
      issue: 'invalid_image',
      message: INVALID_IMAGE_FILE_MESSAGE,
    };
  }

  if (!isPositiveInteger(selection.fileSizeBytes)) {
    return {
      valid: false,
      issue: 'missing_metadata',
      message: INVALID_IMAGE_FILE_MESSAGE,
    };
  }

  if (selection.fileSizeBytes > UPLOAD_IMAGE_MAX_SIZE_BYTES) {
    return {
      valid: false,
      issue: 'image_too_large',
      message: IMAGE_SIZE_EXCEEDS_LIMIT_MESSAGE,
    };
  }

  const width = selection.width ?? 0;
  const height = selection.height ?? 0;
  if (!isPositiveInteger(width) || !isPositiveInteger(height)) {
    return {
      valid: false,
      issue: 'missing_metadata',
      message: INVALID_IMAGE_FILE_MESSAGE,
    };
  }

  if (width > UPLOAD_IMAGE_MAX_WIDTH_PX || height > UPLOAD_IMAGE_MAX_HEIGHT_PX) {
    return {
      valid: false,
      issue: 'image_resolution_too_large',
      message: IMAGE_RESOLUTION_TOO_LARGE_MESSAGE,
    };
  }

  return {
    valid: true,
    mimeType: normalizedMimeType,
    fileSizeBytes: selection.fileSizeBytes,
    width,
    height,
  };
}

export function getUploadValidationFailureMessage(result: UploadImageValidationFailure): string {
  return getUploadValidationMessage(result.issue);
}

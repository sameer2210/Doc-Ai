import { Image as RNImage } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

import {
  IMAGE_NOT_FOUND_MESSAGE,
  IMAGE_INPUT_SIZE_EXCEEDS_LIMIT_MESSAGE,
  IMAGE_SIZE_EXCEEDS_LIMIT_MESSAGE,
  INVALID_IMAGE_FILE_MESSAGE,
  type UploadValidationIssue,
  getUploadValidationMessage,
  isSupportedUploadImageMimeType as isSupportedUploadImageMimeTypeIssue,
} from './upload-errors';
import {
  UPLOAD_IMAGE_CROP_SIZE_PX,
  UPLOAD_IMAGE_INPUT_MAX_SIZE_BYTES,
  UPLOAD_IMAGE_MAX_SIZE_BYTES,
  type NormalizedUploadImageMimeType,
} from './upload.constants';

export type UploadImageSelection = {
  uri?: string | null;
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

export type UploadImageMetadata = {
  exists: boolean;
  fileSizeBytes: number;
  width: number;
  height: number;
};

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function toPositiveInteger(value: number | null | undefined): number {
  return isPositiveInteger(value ?? 0) ? (value ?? 0) : 0;
}

function inferMimeTypeFromUri(uri: string): NormalizedUploadImageMimeType | null {
  const extension = uri.split('?')[0]?.split('#')[0]?.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'heic':
      return 'image/heic';
    case 'heif':
      return 'image/heif';
    case 'bmp':
      return 'image/bmp';
    case 'tif':
    case 'tiff':
      return 'image/tiff';
    case 'gif':
      return 'image/gif';
    default:
      return null;
  }
}

export function normalizeUploadImageMimeType(
  mimeType: string | null | undefined,
  sourceUri?: string | null,
): NormalizedUploadImageMimeType | null {
  const normalizedMimeType = mimeType?.trim().toLowerCase();
  if (normalizedMimeType && isSupportedUploadImageMimeTypeIssue(normalizedMimeType)) {
    return normalizedMimeType;
  }

  if (sourceUri) {
    return inferMimeTypeFromUri(sourceUri);
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

function getImageDimensions(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    RNImage.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      error => reject(error),
    );
  });
}

export async function resolveUploadImageMetadata(
  uri: string,
  fileSizeBytes: number | null | undefined,
): Promise<UploadImageMetadata> {
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) {
    return {
      exists: false,
      fileSizeBytes: 0,
      width: 0,
      height: 0,
    };
  }

  const resolvedFileSize = await resolveUploadImageFileSizeBytes(uri, fileSizeBytes);
  const dimensions = await getImageDimensions(uri).catch(() => ({ width: 0, height: 0 }));

  return {
    exists: true,
    fileSizeBytes: resolvedFileSize,
    width: dimensions.width,
    height: dimensions.height,
  };
}

function validateBaseUploadImageSelection(
  selection: UploadImageSelection,
  maxSizeBytes: number,
  oversizedIssue: UploadValidationIssue,
  oversizedMessage: string,
): UploadImageValidationResult {
  const normalizedMimeType = normalizeUploadImageMimeType(selection.mimeType, selection.uri);
  if (!normalizedMimeType) {
    return {
      valid: false,
      issue: 'UNSUPPORTED_FORMAT',
      message: INVALID_IMAGE_FILE_MESSAGE,
    };
  }

  if (!isPositiveInteger(selection.fileSizeBytes)) {
    return {
      valid: false,
      issue: 'IMAGE_NOT_FOUND',
      message: IMAGE_NOT_FOUND_MESSAGE,
    };
  }

  if (selection.fileSizeBytes > maxSizeBytes) {
    return {
      valid: false,
      issue: oversizedIssue,
      message: oversizedMessage,
    };
  }

  const width = toPositiveInteger(selection.width);
  const height = toPositiveInteger(selection.height);

  if (!width || !height) {
    return {
      valid: false,
      issue: 'INVALID_IMAGE',
      message: INVALID_IMAGE_FILE_MESSAGE,
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

export function validateUploadImageSelection(
  selection: UploadImageSelection,
): UploadImageValidationResult {
  return validateBaseUploadImageSelection(
    selection,
    UPLOAD_IMAGE_INPUT_MAX_SIZE_BYTES,
    'IMAGE_TOO_LARGE',
    IMAGE_INPUT_SIZE_EXCEEDS_LIMIT_MESSAGE,
  );
}

export function validateOptimizedUploadImageSelection(
  selection: UploadImageSelection,
): UploadImageValidationResult {
  const result = validateBaseUploadImageSelection(
    selection,
    UPLOAD_IMAGE_MAX_SIZE_BYTES,
    'image_too_large',
    IMAGE_SIZE_EXCEEDS_LIMIT_MESSAGE,
  );
  if (!result.valid) {
    return result;
  }

  if (result.width > UPLOAD_IMAGE_CROP_SIZE_PX || result.height > UPLOAD_IMAGE_CROP_SIZE_PX || result.width !== result.height) {
    return {
      valid: false,
      issue: 'INVALID_IMAGE',
      message: INVALID_IMAGE_FILE_MESSAGE,
    };
  }

  return result;
}

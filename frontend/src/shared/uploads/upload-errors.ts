import {
  UPLOAD_IMAGE_INPUT_MAX_SIZE_MB,
  type UploadImageMimeType,
} from './upload.constants';

export const IMAGE_NOT_FOUND_MESSAGE =
  'Please select an eye image to proceed with analysis.';
export const INVALID_IMAGE_FILE_MESSAGE =
  'The selected file is corrupted or not a valid image. Please choose another photo.';
export const UNSUPPORTED_IMAGE_FORMAT_MESSAGE =
  'This image format is not supported. Please use JPEG, PNG, or WEBP.';
export const IMAGE_SIZE_TOO_LARGE_MESSAGE = 'Image exceeds 5 MB limit';
export const IMAGE_SIZE_EXCEEDS_LIMIT_MESSAGE =
  'Image size exceeds 5 MB. Please upload a smaller image.';
export const IMAGE_RESOLUTION_TOO_LARGE_MESSAGE = IMAGE_SIZE_TOO_LARGE_MESSAGE;
export const IMAGE_INPUT_SIZE_EXCEEDS_LIMIT_MESSAGE =
  'Image size exceeds the 5 MB limit. Please select or capture a smaller image.';
export const NO_INTERNET_MESSAGE =
  'An active internet connection is required to process cataract screening scans.';
export const CROP_FAILED_MESSAGE =
  'Unable to crop the image. Please retake or select a different photo.';
export const OPTIMIZATION_FAILED_MESSAGE =
  'Unable to process image. Please try again with another photo.';
export const UPLOAD_FAILED_MESSAGE =
  'Image upload was unsuccessful. Please check your network connection and try again.';
export const AI_TIMEOUT_MESSAGE =
  'The AI screening engine is temporarily busy. Please wait a few moments and try again.';
export const ANALYSIS_FAILED_MESSAGE =
  "We couldn't complete the medical analysis for this scan. Please ensure your photo is clear and retake.";
export const AI_SERVICE_UNAVAILABLE_MESSAGE =
  'AI service is temporarily unavailable. Please try again later.';
export const AI_MODEL_LOADING_MESSAGE = AI_TIMEOUT_MESSAGE;
export const EYE_NOT_DETECTED_MESSAGE =
  "We couldn't clearly detect a human eye in this scan. Please retake the photo with one eye centered, in good lighting, and in sharp focus.";
export const UPLOAD_NETWORK_FAILURE_MESSAGE = UPLOAD_FAILED_MESSAGE;
export const UPLOAD_TIMEOUT_MESSAGE = AI_TIMEOUT_MESSAGE;

export const EYE_NOT_DETECTED_TITLE = 'Eye Not Detected';
export const AI_TIMEOUT_TITLE = 'Screening Is Taking Longer Than Expected';
export const UPLOAD_FAILED_TITLE = "We Couldn't Upload Your Scan";
export const NO_INTERNET_TITLE = 'No Internet Connection';
export const IMAGE_TOO_LARGE_TITLE = 'Image File Exceeds Limit';
export const INVALID_IMAGE_TITLE = 'Invalid Image File';
export const UNSUPPORTED_FORMAT_TITLE = 'Unsupported Image Format';
export const IMAGE_NOT_FOUND_TITLE = 'No Image Selected';
export const CROP_FAILED_TITLE = 'Image Crop Failed';
export const OPTIMIZATION_FAILED_TITLE = 'Image Optimization Failed';
export const ANALYSIS_FAILED_TITLE = 'Analysis Could Not Be Completed';

import { assertNever } from '@/shared/utils/assert-never';

export {
  API_ERROR_CONTRACT_VERSION,
  ApiErrorCode,
  ErrorCategory,
} from '@/shared/api/api-error-contract';

export type UploadPipelineErrorCode =
  | 'IMAGE_NOT_FOUND'
  | 'INVALID_IMAGE'
  | 'UNSUPPORTED_FORMAT'
  | 'IMAGE_TOO_LARGE'
  | 'NO_INTERNET'
  | 'CROP_FAILED'
  | 'OPTIMIZATION_FAILED'
  | 'UPLOAD_FAILED'
  | 'AI_TIMEOUT'
  | 'EYE_NOT_DETECTED'
  | 'ANALYSIS_FAILED';

export interface UploadErrorDetails {
  title: string;
  message: string;
}

export function getUploadErrorDetails(code: UploadPipelineErrorCode): UploadErrorDetails {
  switch (code) {
    case 'EYE_NOT_DETECTED':
      return {
        title: EYE_NOT_DETECTED_TITLE,
        message: EYE_NOT_DETECTED_MESSAGE,
      };
    case 'AI_TIMEOUT':
      return {
        title: AI_TIMEOUT_TITLE,
        message: AI_TIMEOUT_MESSAGE,
      };
    case 'UPLOAD_FAILED':
      return {
        title: UPLOAD_FAILED_TITLE,
        message: UPLOAD_FAILED_MESSAGE,
      };
    case 'NO_INTERNET':
      return {
        title: NO_INTERNET_TITLE,
        message: NO_INTERNET_MESSAGE,
      };
    case 'IMAGE_TOO_LARGE':
      return {
        title: IMAGE_TOO_LARGE_TITLE,
        message: IMAGE_INPUT_SIZE_EXCEEDS_LIMIT_MESSAGE,
      };
    case 'INVALID_IMAGE':
      return {
        title: INVALID_IMAGE_TITLE,
        message: INVALID_IMAGE_FILE_MESSAGE,
      };
    case 'UNSUPPORTED_FORMAT':
      return {
        title: UNSUPPORTED_FORMAT_TITLE,
        message: UNSUPPORTED_IMAGE_FORMAT_MESSAGE,
      };
    case 'IMAGE_NOT_FOUND':
      return {
        title: IMAGE_NOT_FOUND_TITLE,
        message: IMAGE_NOT_FOUND_MESSAGE,
      };
    case 'CROP_FAILED':
      return {
        title: CROP_FAILED_TITLE,
        message: CROP_FAILED_MESSAGE,
      };
    case 'OPTIMIZATION_FAILED':
      return {
        title: OPTIMIZATION_FAILED_TITLE,
        message: OPTIMIZATION_FAILED_MESSAGE,
      };
    case 'ANALYSIS_FAILED':
      return {
        title: ANALYSIS_FAILED_TITLE,
        message: ANALYSIS_FAILED_MESSAGE,
      };
    default:
      return assertNever(code);
  }
}

type LegacyUploadValidationIssue =
  | 'invalid_image'
  | 'image_too_large'
  | 'image_resolution_too_large'
  | 'missing_metadata';

export type UploadValidationIssue = LegacyUploadValidationIssue | UploadPipelineErrorCode;

function isUploadPipelineErrorCode(issue: UploadValidationIssue): issue is UploadPipelineErrorCode {
  return (
    issue === 'IMAGE_NOT_FOUND' ||
    issue === 'INVALID_IMAGE' ||
    issue === 'UNSUPPORTED_FORMAT' ||
    issue === 'IMAGE_TOO_LARGE' ||
    issue === 'NO_INTERNET' ||
    issue === 'CROP_FAILED' ||
    issue === 'OPTIMIZATION_FAILED' ||
    issue === 'UPLOAD_FAILED' ||
    issue === 'AI_TIMEOUT' ||
    issue === 'EYE_NOT_DETECTED' ||
    issue === 'ANALYSIS_FAILED'
  );
}

export function getUploadValidationMessage(issue: UploadValidationIssue): string {
  if (issue === 'image_too_large') {
    return IMAGE_SIZE_EXCEEDS_LIMIT_MESSAGE;
  }

  if (issue === 'image_resolution_too_large') {
    return INVALID_IMAGE_FILE_MESSAGE;
  }

  if (!isUploadPipelineErrorCode(issue)) {
    return INVALID_IMAGE_FILE_MESSAGE;
  }

  switch (issue) {
    case 'IMAGE_NOT_FOUND':
      return IMAGE_NOT_FOUND_MESSAGE;
    case 'INVALID_IMAGE':
      return INVALID_IMAGE_FILE_MESSAGE;
    case 'UNSUPPORTED_FORMAT':
      return UNSUPPORTED_IMAGE_FORMAT_MESSAGE;
    case 'IMAGE_TOO_LARGE':
      return IMAGE_INPUT_SIZE_EXCEEDS_LIMIT_MESSAGE;
    case 'NO_INTERNET':
      return NO_INTERNET_MESSAGE;
    case 'CROP_FAILED':
      return CROP_FAILED_MESSAGE;
    case 'OPTIMIZATION_FAILED':
      return OPTIMIZATION_FAILED_MESSAGE;
    case 'UPLOAD_FAILED':
      return UPLOAD_FAILED_MESSAGE;
    case 'AI_TIMEOUT':
      return AI_TIMEOUT_MESSAGE;
    case 'EYE_NOT_DETECTED':
      return EYE_NOT_DETECTED_MESSAGE;
    case 'ANALYSIS_FAILED':
      return ANALYSIS_FAILED_MESSAGE;
    default:
      return INVALID_IMAGE_FILE_MESSAGE;
  }
}

export function getUploadStatusMessage(
  status: number | undefined,
  responseMessage: string | undefined,
): string | null {
  const normalizedMessage = responseMessage?.trim().toLowerCase();

  if (
    normalizedMessage?.includes('loading') ||
    normalizedMessage?.includes('timed out') ||
    normalizedMessage?.includes('timeout') ||
    normalizedMessage?.includes('busy')
  ) {
    return AI_TIMEOUT_MESSAGE;
  }

  if (status === 400) {
    if (
      normalizedMessage?.includes('eye') ||
      normalizedMessage?.includes('detect')
    ) {
      return EYE_NOT_DETECTED_MESSAGE;
    }
    if (normalizedMessage?.includes('resolution')) {
      return INVALID_IMAGE_FILE_MESSAGE;
    }
    return INVALID_IMAGE_FILE_MESSAGE;
  }

  if (status === 413) {
    return IMAGE_SIZE_EXCEEDS_LIMIT_MESSAGE;
  }

  if (status === 503) {
    return AI_SERVICE_UNAVAILABLE_MESSAGE;
  }

  return null;
}

export function getUploadNetworkMessage(isTimeout: boolean): string {
  return isTimeout ? AI_TIMEOUT_MESSAGE : UPLOAD_NETWORK_FAILURE_MESSAGE;
}

export function getUploadPickerLimitMessage(maxSizeMb: number = UPLOAD_IMAGE_INPUT_MAX_SIZE_MB): string {
  return `Image size exceeds ${maxSizeMb} MB. Please upload a smaller image.`;
}

export function isSupportedUploadImageMimeType(
  mimeType: string | null | undefined,
): mimeType is UploadImageMimeType {
  return (
    mimeType === 'image/jpeg' ||
    mimeType === 'image/jpg' ||
    mimeType === 'image/png' ||
    mimeType === 'image/webp' ||
    mimeType === 'image/heic' ||
    mimeType === 'image/heif' ||
    mimeType === 'image/bmp' ||
    mimeType === 'image/tiff' ||
    mimeType === 'image/gif'
  );
}

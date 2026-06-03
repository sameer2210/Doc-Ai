import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';

import {
  UPLOAD_IMAGE_CROP_SIZE_PX,
  UPLOAD_IMAGE_LARGE_DIMENSION_THRESHOLD_PX,
  UPLOAD_IMAGE_MAX_DECODED_BITMAP_BYTES,
  UPLOAD_IMAGE_MAX_SIZE_BYTES,
  UPLOAD_IMAGE_TARGET_FILE_SIZE_BYTES,
  UPLOAD_IMAGE_WORKING_MAX_EDGE_PX,
} from '@/shared/uploads/upload.constants';
import {
  CROP_FAILED_MESSAGE,
  IMAGE_NOT_FOUND_MESSAGE,
  OPTIMIZATION_FAILED_MESSAGE,
} from '@/shared/uploads/upload-errors';
import { validateOptimizedUploadImageSelection } from '@/shared/uploads/upload-validation';
import type {
  CropRectangle,
  CropViewportGeometry,
  CroppedImageResult,
  WorkflowImage,
} from '@/features/upload/types/image.types';

const IMAGE_CROP_FLOW_LOG_PREFIX = '[EyeCropFlow]';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getEstimatedDecodedBitmapBytes(width: number, height: number): number {
  return width * height * 4;
}

function getImageScaleToFitLongestEdge(width: number, height: number, longestEdge: number): number {
  if (!width || !height) {
    return 1;
  }

  const currentLongestEdge = Math.max(width, height);
  if (currentLongestEdge <= longestEdge) {
    return 1;
  }

  return longestEdge / currentLongestEdge;
}

function isLocalFileUri(uri: string): boolean {
  return uri.startsWith('file://');
}

function isAndroidContentUri(uri: string): boolean {
  return uri.startsWith('content://');
}

function getFileNameFromUri(uri: string): string {
  const cleanedUri = uri.split('?')[0]?.split('#')[0] ?? uri;
  const fileName = cleanedUri.split('/').pop();
  return fileName && fileName.trim().length > 0 ? fileName : `image-${Date.now()}.jpg`;
}

function getCacheDirectory(): string {
  const cacheDirectory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!cacheDirectory) {
    throw new Error(IMAGE_NOT_FOUND_MESSAGE);
  }

  return cacheDirectory.replace(/\/?$/, '/');
}

function roundCropRectangle(rect: CropRectangle): CropRectangle {
  return {
    originX: Math.max(0, Math.round(rect.originX)),
    originY: Math.max(0, Math.round(rect.originY)),
    width: Math.max(1, Math.round(rect.width)),
    height: Math.max(1, Math.round(rect.height)),
  };
}

async function ensureLocalFileUri(uri: string, suggestedName?: string): Promise<string> {
  if (isLocalFileUri(uri)) {
    return uri;
  }

  if (!isAndroidContentUri(uri) && !uri.startsWith('asset://')) {
    return uri;
  }

  const fileName = suggestedName ?? getFileNameFromUri(uri);
  const destinationUri = `${getCacheDirectory()}${Date.now()}_${fileName}`;
  console.log(IMAGE_CROP_FLOW_LOG_PREFIX, 'copying picker uri to local file', { sourceUri: uri, destinationUri });
  await FileSystem.copyAsync({ from: uri, to: destinationUri });
  console.log(IMAGE_CROP_FLOW_LOG_PREFIX, 'picker uri copied to local file', { destinationUri });
  return destinationUri;
}

async function resolveFileSizeBytes(uri: string): Promise<number> {
  const info = await FileSystem.getInfoAsync(uri);
  if (
    !info.exists ||
    typeof info.size !== 'number' ||
    !Number.isInteger(info.size) ||
    info.size <= 0
  ) {
    return 0;
  }

  return info.size;
}

async function manipulateImage(
  uri: string,
  actions: ImageManipulator.Action[],
  compress: number
): Promise<CroppedImageResult> {
  console.log(IMAGE_CROP_FLOW_LOG_PREFIX, 'ImageManipulator.manipulateAsync:start', {
    uri,
    compress,
    actionCount: actions.length,
    actions,
  });
  const result = await ImageManipulator.manipulateAsync(uri, actions, {
    compress,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  console.log(IMAGE_CROP_FLOW_LOG_PREFIX, 'ImageManipulator.manipulateAsync:done', {
    uri: result.uri,
    width: result.width,
    height: result.height,
  });

  const fileSize = await resolveFileSizeBytes(result.uri);
  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
    fileSize,
  };
}

export function shouldCreateWorkingImage(image: WorkflowImage): boolean {
  const longestEdge = Math.max(image.width, image.height);
  const decodedBitmapBytes = getEstimatedDecodedBitmapBytes(image.width, image.height);

  return (
    image.mimeType === 'image/heic' ||
    image.mimeType === 'image/heif' ||
    longestEdge > UPLOAD_IMAGE_LARGE_DIMENSION_THRESHOLD_PX ||
    decodedBitmapBytes > UPLOAD_IMAGE_MAX_DECODED_BITMAP_BYTES
  );
}

export async function createWorkingImageForCrop(image: WorkflowImage): Promise<WorkflowImage> {
  console.log(IMAGE_CROP_FLOW_LOG_PREFIX, 'createWorkingImageForCrop:start', {
    uri: image.uri,
    width: image.width,
    height: image.height,
    mimeType: image.mimeType,
    fileSizeBytes: image.fileSizeBytes,
  });

  const localUri = await ensureLocalFileUri(image.uri, image.name);
  const scale = getImageScaleToFitLongestEdge(
    image.width,
    image.height,
    UPLOAD_IMAGE_WORKING_MAX_EDGE_PX
  );
  const shouldResize = shouldCreateWorkingImage(image);
  const targetWidth = shouldResize ? Math.max(1, Math.round(image.width * scale)) : image.width;
  const targetHeight = shouldResize ? Math.max(1, Math.round(image.height * scale)) : image.height;
  const normalizedActions: ImageManipulator.Action[] = [
    {
      resize: {
        width: targetWidth,
        height: targetHeight,
      },
    },
  ];

  console.log(IMAGE_CROP_FLOW_LOG_PREFIX, 'createWorkingImageForCrop:normalize:start', {
    localUri,
    sourceWidth: image.width,
    sourceHeight: image.height,
    shouldResize,
    scale,
    targetWidth,
    targetHeight,
    actions: normalizedActions,
  });
  const workingImage = await manipulateImage(
    localUri,
    normalizedActions,
    shouldResize ? 0.92 : 1
  );
  console.log(IMAGE_CROP_FLOW_LOG_PREFIX, 'createWorkingImageForCrop:normalize:done', {
    sourceWidth: image.width,
    sourceHeight: image.height,
    normalizedWidth: workingImage.width,
    normalizedHeight: workingImage.height,
    uri: workingImage.uri,
    fileSize: workingImage.fileSize,
  });

  return {
    uri: workingImage.uri,
    name: image.name.replace(/\.[^.]+$/, '.jpg'),
    mimeType: 'image/jpeg',
    fileSizeBytes: workingImage.fileSize ?? image.fileSizeBytes,
    width: workingImage.width,
    height: workingImage.height,
  };
}

export function calculateCropViewportRect({
  frameSize,
  imageWidth,
  imageHeight,
  scale,
  translateX,
  translateY,
}: CropViewportGeometry): CropRectangle {
  const baseScale = Math.max(frameSize / imageWidth, frameSize / imageHeight);
  const effectiveScale = baseScale * scale;
  const visibleSourceWidth = frameSize / effectiveScale;
  const visibleSourceHeight = frameSize / effectiveScale;
  const renderedWidth = imageWidth * effectiveScale;
  const renderedHeight = imageHeight * effectiveScale;
  const renderedLeft = (frameSize - renderedWidth) / 2 + translateX;
  const renderedTop = (frameSize - renderedHeight) / 2 + translateY;
  const guideLeft = 0;
  const guideTop = 0;
  const cropRect = roundCropRectangle({
    originX: clamp(
      (guideLeft - renderedLeft) / effectiveScale,
      0,
      imageWidth - visibleSourceWidth,
    ),
    originY: clamp(
      (guideTop - renderedTop) / effectiveScale,
      0,
      imageHeight - visibleSourceHeight,
    ),
    width: visibleSourceWidth,
    height: visibleSourceHeight,
  });

  console.log(IMAGE_CROP_FLOW_LOG_PREFIX, 'crop-viewport-rect', {
    frameSize,
    sourceImageWidth: imageWidth,
    sourceImageHeight: imageHeight,
    scale,
    translateX,
    translateY,
    baseScale,
    effectiveScale,
    renderedWidth,
    renderedHeight,
    renderedLeft,
    renderedTop,
    guideLeft,
    guideTop,
    originX: cropRect.originX,
    originY: cropRect.originY,
    cropWidth: cropRect.width,
    cropHeight: cropRect.height,
    finalCropRectangle: cropRect,
  });

  return cropRect;
}

async function cropWorkingImageToRect(
  image: WorkflowImage,
  cropRect: CropRectangle,
  label: string,
): Promise<CroppedImageResult> {
  console.log(IMAGE_CROP_FLOW_LOG_PREFIX, `${label}:start`, {
    uri: image.uri,
    cropRect,
  });
  if (!image.uri) {
    throw new Error(IMAGE_NOT_FOUND_MESSAGE);
  }

  const localUri = await ensureLocalFileUri(image.uri, image.name);
  console.log(IMAGE_CROP_FLOW_LOG_PREFIX, `${label}:before-manipulate`, {
    sourceImageWidth: image.width,
    sourceImageHeight: image.height,
    cropRect,
    localUri,
  });
  const result = await manipulateImage(
    localUri,
    [
      {
        crop: cropRect,
      },
      {
        resize: {
          width: UPLOAD_IMAGE_CROP_SIZE_PX,
          height: UPLOAD_IMAGE_CROP_SIZE_PX,
        },
      },
    ],
    1
  );

  const validated = validateOptimizedUploadImageSelection({
    uri: result.uri,
    mimeType: 'image/jpeg',
    fileSizeBytes: result.fileSize ?? 0,
    width: result.width,
    height: result.height,
  });

  if (!validated.valid) {
    throw new Error(CROP_FAILED_MESSAGE);
  }

  console.log(IMAGE_CROP_FLOW_LOG_PREFIX, `${label}:done`, {
    uri: result.uri,
    width: result.width,
    height: result.height,
    fileSize: result.fileSize,
    sourceImageWidth: image.width,
    sourceImageHeight: image.height,
    cropRect,
  });
  return result;
}

export async function cropWorkingImageToSquare(
  image: WorkflowImage,
  viewport: CropViewportGeometry,
): Promise<CroppedImageResult> {
  console.log(IMAGE_CROP_FLOW_LOG_PREFIX, 'cropWorkingImageToSquare:start', {
    uri: image.uri,
    viewport,
  });
  const cropRect = calculateCropViewportRect(viewport);
  return cropWorkingImageToRect(image, cropRect, 'cropWorkingImageToSquare');
}

export async function optimizeCroppedImage(image: CroppedImageResult): Promise<CroppedImageResult> {
  console.log(IMAGE_CROP_FLOW_LOG_PREFIX, 'optimizeCroppedImage:start', {
    uri: image.uri,
    width: image.width,
    height: image.height,
    fileSize: image.fileSize,
  });
  const qualities = [0.8, 0.75, 0.7, 0.65, 0.6, 0.55];
  let lastResult: CroppedImageResult | null = null;
  const optimizeActions: ImageManipulator.Action[] = [
    {
      resize: {
        width: image.width,
        height: image.height,
      },
    },
  ];

  for (const quality of qualities) {
    const result = await manipulateImage(image.uri, optimizeActions, quality);
    lastResult = result;
    const sizeBytes = result.fileSize ?? 0;

    if (sizeBytes > 0 && sizeBytes <= UPLOAD_IMAGE_MAX_SIZE_BYTES) {
      return result;
    }

    if (sizeBytes > 0 && sizeBytes <= UPLOAD_IMAGE_TARGET_FILE_SIZE_BYTES) {
      return result;
    }
  }

  if (
    lastResult &&
    (lastResult.fileSize ?? 0) > 0 &&
    (lastResult.fileSize ?? 0) <= UPLOAD_IMAGE_MAX_SIZE_BYTES
  ) {
    return lastResult;
  }

  console.log(IMAGE_CROP_FLOW_LOG_PREFIX, 'optimizeCroppedImage:failed');
  throw new Error(OPTIMIZATION_FAILED_MESSAGE);
}

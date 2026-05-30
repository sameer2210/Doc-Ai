import { memoryStorage } from 'multer';
import {
  createImageResolutionTooLargeException,
  createImageTooLargeException,
  createInvalidImageFileException,
} from './upload-errors';
import {
  UPLOAD_IMAGE_MAX_HEIGHT_PX,
  UPLOAD_IMAGE_MAX_SIZE_BYTES,
  UPLOAD_IMAGE_MAX_WIDTH_PX,
  type NormalizedUploadImageMimeType,
} from './upload.constants';

export type UploadImageDimensions = {
  width: number;
  height: number;
};

export type ValidatedUploadImageFile = {
  mimeType: NormalizedUploadImageMimeType;
  size: number;
  dimensions: UploadImageDimensions;
};

type FileLike = Pick<Express.Multer.File, 'buffer' | 'mimetype' | 'size'>;

function toUInt16BigEndian(buffer: Buffer, offset: number): number {
  if (buffer.length < offset + 2) {
    return 0;
  }
  return buffer.readUInt16BE(offset);
}

function toUInt16LittleEndian(buffer: Buffer, offset: number): number {
  if (buffer.length < offset + 2) {
    return 0;
  }
  return buffer.readUInt16LE(offset);
}

function toUInt24LittleEndian(buffer: Buffer, offset: number): number {
  if (buffer.length < offset + 3) {
    return 0;
  }
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);
}

function readUInt32LittleEndian(buffer: Buffer, offset: number): number {
  if (buffer.length < offset + 4) {
    return 0;
  }
  return buffer.readUInt32LE(offset);
}

function hasPngSignature(buffer: Buffer): boolean {
  return (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  );
}

function hasJpegSignature(buffer: Buffer): boolean {
  return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
}

function hasWebpSignature(buffer: Buffer): boolean {
  return (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  );
}

function getPngDimensions(buffer: Buffer): UploadImageDimensions | null {
  if (!hasPngSignature(buffer) || buffer.length < 24) {
    return null;
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function getJpegDimensions(buffer: Buffer): UploadImageDimensions | null {
  if (!hasJpegSignature(buffer)) {
    return null;
  }

  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];
    if (marker === 0xd9 || marker === 0xda) {
      break;
    }

    const segmentLength = toUInt16BigEndian(buffer, offset + 2);
    if (segmentLength <= 2) {
      return null;
    }

    const isStartOfFrameMarker =
      marker === 0xc0 ||
      marker === 0xc1 ||
      marker === 0xc2 ||
      marker === 0xc3 ||
      marker === 0xc5 ||
      marker === 0xc6 ||
      marker === 0xc7 ||
      marker === 0xc9 ||
      marker === 0xca ||
      marker === 0xcb ||
      marker === 0xcd ||
      marker === 0xce ||
      marker === 0xcf;

    if (isStartOfFrameMarker) {
      const dataOffset = offset + 4;
      if (buffer.length < dataOffset + 5) {
        return null;
      }

      const height = buffer.readUInt16BE(dataOffset + 1);
      const width = buffer.readUInt16BE(dataOffset + 3);
      return { width, height };
    }

    offset += 2 + segmentLength;
  }

  return null;
}

function getWebpDimensions(buffer: Buffer): UploadImageDimensions | null {
  if (!hasWebpSignature(buffer) || buffer.length < 16) {
    return null;
  }

  const chunkType = buffer.subarray(12, 16).toString('ascii');

  if (chunkType === 'VP8X') {
    if (buffer.length < 30) {
      return null;
    }

    const width = toUInt24LittleEndian(buffer, 24) + 1;
    const height = toUInt24LittleEndian(buffer, 27) + 1;
    return { width, height };
  }

  if (chunkType === 'VP8 ') {
    if (buffer.length < 30) {
      return null;
    }

    const startCodeMatches =
      buffer[23] === 0x9d &&
      buffer[24] === 0x01 &&
      buffer[25] === 0x2a;
    if (!startCodeMatches) {
      return null;
    }

    const width = toUInt16LittleEndian(buffer, 26) & 0x3fff;
    const height = toUInt16LittleEndian(buffer, 28) & 0x3fff;
    return { width, height };
  }

  if (chunkType === 'VP8L') {
    if (buffer.length < 25) {
      return null;
    }

    if (buffer[20] !== 0x2f) {
      return null;
    }

    const bits = readUInt32LittleEndian(buffer, 21);
    const width = (bits & 0x3fff) + 1;
    const height = ((bits >> 14) & 0x3fff) + 1;
    return { width, height };
  }

  return null;
}

function getDimensionsForMimeType(
  buffer: Buffer,
  mimeType: NormalizedUploadImageMimeType,
): UploadImageDimensions | null {
  if (mimeType === 'image/png') {
    return getPngDimensions(buffer);
  }

  if (mimeType === 'image/jpeg') {
    return getJpegDimensions(buffer);
  }

  if (mimeType === 'image/webp') {
    return getWebpDimensions(buffer);
  }

  return null;
}

export function normalizeUploadImageMimeType(
  mimeType: string | null | undefined,
): NormalizedUploadImageMimeType | null {
  if (!mimeType) {
    return null;
  }

  if (mimeType === 'image/jpg' || mimeType === 'image/jpeg') {
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

export function isAllowedUploadImageMimeType(mimeType: string | null | undefined): boolean {
  return normalizeUploadImageMimeType(mimeType) !== null;
}

export function validateUploadImageFile(file: FileLike): ValidatedUploadImageFile {
  if (!file || !file.buffer || file.buffer.length === 0) {
    throw createInvalidImageFileException();
  }

  const normalizedMimeType = normalizeUploadImageMimeType(file.mimetype);
  if (!normalizedMimeType) {
    throw createInvalidImageFileException();
  }

  if (!Number.isInteger(file.size) || file.size <= 0) {
    throw createInvalidImageFileException();
  }

  if (file.size > UPLOAD_IMAGE_MAX_SIZE_BYTES) {
    throw createImageTooLargeException();
  }

  const dimensions = getDimensionsForMimeType(file.buffer, normalizedMimeType);
  if (!dimensions) {
    throw createInvalidImageFileException();
  }

  if (
    dimensions.width > UPLOAD_IMAGE_MAX_WIDTH_PX ||
    dimensions.height > UPLOAD_IMAGE_MAX_HEIGHT_PX
  ) {
    throw createImageResolutionTooLargeException();
  }

  return {
    mimeType: normalizedMimeType,
    size: file.size,
    dimensions,
  };
}

type ImageUploadFileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) => void;

export function createImageUploadFileFilter(): ImageUploadFileFilter {
  const fileFilter: ImageUploadFileFilter = (_req, file, callback) => {
    if (isAllowedUploadImageMimeType(file.mimetype)) {
      callback(null, true);
      return;
    }

    callback(createInvalidImageFileException(), false);
  };

  return fileFilter;
}

export function createImageUploadInterceptorOptions() {
  return {
    storage: memoryStorage(),
    limits: {
      fileSize: UPLOAD_IMAGE_MAX_SIZE_BYTES,
      files: 1,
    },
    fileFilter: createImageUploadFileFilter(),
  };
}

import {
  BadRequestException,
  PayloadTooLargeException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Buffer } from 'node:buffer';

import {
  AI_MODEL_LOADING_MESSAGE,
  AI_SERVICE_UNAVAILABLE_MESSAGE,
  IMAGE_RESOLUTION_TOO_LARGE_MESSAGE,
  IMAGE_SIZE_TOO_LARGE_MESSAGE,
  INVALID_IMAGE_FILE_MESSAGE,
  mapHuggingFaceError,
} from './upload-errors';
import {
  UPLOAD_IMAGE_MAX_SIZE_BYTES,
  UPLOAD_IMAGE_MAX_WIDTH_PX,
} from './upload.constants';
import {
  normalizeUploadImageMimeType,
  validateUploadImageFile,
} from './upload-validation';

function buildPngBuffer(width: number, height: number): Buffer {
  const buffer = Buffer.alloc(24);
  buffer[0] = 0x89;
  buffer[1] = 0x50;
  buffer[2] = 0x4e;
  buffer[3] = 0x47;
  buffer[4] = 0x0d;
  buffer[5] = 0x0a;
  buffer[6] = 0x1a;
  buffer[7] = 0x0a;
  buffer.writeUInt32BE(13, 8);
  buffer.write('IHDR', 12, 4, 'ascii');
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

describe('upload validation', () => {
  it('normalizes accepted mime types', () => {
    expect(normalizeUploadImageMimeType('image/jpg')).toBe('image/jpeg');
    expect(normalizeUploadImageMimeType('image/png')).toBe('image/png');
    expect(normalizeUploadImageMimeType('image/webp')).toBe('image/webp');
    expect(normalizeUploadImageMimeType('text/plain')).toBeNull();
  });

  it('accepts valid png images under the size and dimension caps', () => {
    const file = {
      buffer: buildPngBuffer(1024, 768),
      mimetype: 'image/png',
      size: 1 * 1024 * 1024,
    };

    const validated = validateUploadImageFile(file);

    expect(validated.mimeType).toBe('image/png');
    expect(validated.size).toBe(1 * 1024 * 1024);
    expect(validated.dimensions).toEqual({ width: 1024, height: 768 });
  });

  it('accepts 4.9 MB images under the size cap', () => {
    const file = {
      buffer: buildPngBuffer(1024, 768),
      mimetype: 'image/png',
      size: Math.floor(4.9 * 1024 * 1024),
    };

    const validated = validateUploadImageFile(file);

    expect(validated.size).toBe(Math.floor(4.9 * 1024 * 1024));
  });

  it('rejects images larger than 5 MB', () => {
    const file = {
      buffer: buildPngBuffer(1024, 768),
      mimetype: 'image/png',
      size: UPLOAD_IMAGE_MAX_SIZE_BYTES + 1,
    };

    expect(() => validateUploadImageFile(file)).toThrow(PayloadTooLargeException);
    expect(() => validateUploadImageFile(file)).toThrow(IMAGE_SIZE_TOO_LARGE_MESSAGE);
  });

  it('rejects images that exceed max dimensions', () => {
    const file = {
      buffer: buildPngBuffer(UPLOAD_IMAGE_MAX_WIDTH_PX + 1, 768),
      mimetype: 'image/png',
      size: 1024,
    };

    expect(() => validateUploadImageFile(file)).toThrow(BadRequestException);
    expect(() => validateUploadImageFile(file)).toThrow(IMAGE_RESOLUTION_TOO_LARGE_MESSAGE);
  });

  it('rejects unsupported image mime types', () => {
    const file = {
      buffer: buildPngBuffer(1024, 768),
      mimetype: 'image/gif',
      size: 1024,
    };

    expect(() => validateUploadImageFile(file)).toThrow(BadRequestException);
    expect(() => validateUploadImageFile(file)).toThrow(INVALID_IMAGE_FILE_MESSAGE);
  });
});

describe('Hugging Face error mapping', () => {
  it('maps timeout-like errors to the model loading response', () => {
    const mapped = mapHuggingFaceError({
      code: 'ECONNABORTED',
      message: 'timeout of 15000ms exceeded',
    });

    expect(mapped).toBeInstanceOf(ServiceUnavailableException);
    expect(mapped.getStatus()).toBe(503);
    expect(mapped.message).toBe(AI_MODEL_LOADING_MESSAGE);
  });

  it('maps upstream 503s to the service unavailable response', () => {
    const mapped = mapHuggingFaceError({
      response: { status: 503, data: { message: 'service unavailable' } },
      message: 'Request failed with status code 503',
    });

    expect(mapped).toBeInstanceOf(ServiceUnavailableException);
    expect(mapped.getStatus()).toBe(503);
    expect(mapped.message).toBe(AI_SERVICE_UNAVAILABLE_MESSAGE);
  });
});

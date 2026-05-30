import { httpClient } from '@/shared/api/http-client';
import {
  UPLOAD_NETWORK_FAILURE_MESSAGE,
  UPLOAD_TIMEOUT_MESSAGE,
} from '@/shared/uploads/upload-errors';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PresignedUrlPayload = {
  fileName: string;
  fileType: string;
  fileSize: number;
};

export type PresignedUrlResponse = {
  id: string;       // DB Upload record ID
  uploadUrl: string; // Temporary S3 presigned PUT URL (expires in 15 min)
  fileUrl: string;  // Final public S3 URL (use in message payload)
};

export type UploadProgressCallback = (progress: number) => void;

function createAbortError(): Error {
  const error = new Error('Upload cancelled');
  error.name = 'AbortError';
  return error;
}

// ─── Step 1: Request a presigned URL from the backend ─────────────────────────

export async function getPresignedUrl(
  payload: PresignedUrlPayload,
  signal?: AbortSignal,
): Promise<PresignedUrlResponse> {
  const response = await httpClient.post<PresignedUrlResponse>(
    '/uploads/presigned-url',
    payload,
    { signal },
  );
  return response.data;
}

// ─── Step 2: Upload the binary file directly to S3 via the presigned PUT URL ──
// Uses XMLHttpRequest so we can track granular progress events.

export function uploadBinaryToS3(
  presignedUrl: string,
  localUri: string,
  mimeType: string,
  onProgress?: UploadProgressCallback,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(createAbortError());
      return;
    }

    let xhr: XMLHttpRequest | null = null;
    let settled = false;
    const settle = (callback: () => void) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', abortUpload);
      callback();
    };
    const abortUpload = () => {
      xhr?.abort();
      settle(() => reject(createAbortError()));
    };

    signal?.addEventListener('abort', abortUpload, { once: true });

    // Fetch the local file as a Blob first, then PUT to S3
    fetch(localUri, { signal })
      .then(res => res.blob())
      .then(blob => {
        if (signal?.aborted) {
          throw createAbortError();
        }

        xhr = new XMLHttpRequest();

        xhr.open('PUT', presignedUrl, true);
        xhr.setRequestHeader('Content-Type', mimeType);

        if (xhr.upload && onProgress) {
          xhr.upload.onprogress = event => {
            if (event.lengthComputable) {
              const pct = Math.round((event.loaded / event.total) * 100);
              onProgress(pct);
            }
          };
        }

        xhr.onload = () => {
          // S3 presigned PUT returns 200 on success
          if (!xhr) return;
          if (xhr.status >= 200 && xhr.status < 300) {
            onProgress?.(100);
            settle(resolve);
          } else {
            settle(() => reject(new Error(`S3 upload failed with status ${xhr?.status}`)));
          }
        };

        xhr.onerror = () => {
          settle(() => reject(new Error(UPLOAD_NETWORK_FAILURE_MESSAGE)));
        };

        xhr.ontimeout = () => {
          settle(() => reject(new Error(UPLOAD_TIMEOUT_MESSAGE)));
        };

        xhr.onabort = () => {
          settle(() => reject(createAbortError()));
        };

        xhr.send(blob);
      })
      .catch(error => {
        settle(() => reject(error));
      });
  });
}

// ─── Combined helper: presign + upload in one call ────────────────────────────

export type UploadFileResult = {
  serverId: string;
  serverUrl: string;
};

export async function uploadFileToS3(
  localUri: string,
  fileName: string,
  mimeType: string,
  fileSize: number,
  onProgress?: UploadProgressCallback,
  signal?: AbortSignal,
): Promise<UploadFileResult> {
  if (signal?.aborted) {
    throw createAbortError();
  }

  // 1. Get presigned URL from backend
  const { id, uploadUrl, fileUrl } = await getPresignedUrl(
    {
      fileName,
      fileType: mimeType,
      fileSize,
    },
    signal,
  );

  // 2. PUT binary file directly to S3
  await uploadBinaryToS3(uploadUrl, localUri, mimeType, onProgress, signal);

  return { serverId: id, serverUrl: fileUrl };
}

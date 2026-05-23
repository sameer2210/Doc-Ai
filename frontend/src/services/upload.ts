import { httpClient } from '@/shared/api/http-client';

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

// ─── Step 1: Request a presigned URL from the backend ─────────────────────────

export async function getPresignedUrl(
  payload: PresignedUrlPayload,
): Promise<PresignedUrlResponse> {
  const response = await httpClient.post<PresignedUrlResponse>(
    '/uploads/presigned-url',
    payload,
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
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Fetch the local file as a Blob first, then PUT to S3
    fetch(localUri)
      .then(res => res.blob())
      .then(blob => {
        const xhr = new XMLHttpRequest();

        xhr.open('PUT', presignedUrl, true);
        xhr.setRequestHeader('Content-Type', mimeType);

        if (xhr.upload && onProgress) {
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const pct = Math.round((event.loaded / event.total) * 100);
              onProgress(pct);
            }
          };
        }

        xhr.onload = () => {
          // S3 presigned PUT returns 200 on success
          if (xhr.status >= 200 && xhr.status < 300) {
            onProgress?.(100);
            resolve();
          } else {
            reject(new Error(`S3 upload failed with status ${xhr.status}`));
          }
        };

        xhr.onerror = () => {
          reject(new Error('Network error during S3 upload'));
        };

        xhr.ontimeout = () => {
          reject(new Error('S3 upload timed out'));
        };

        xhr.send(blob);
      })
      .catch(reject);
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
): Promise<UploadFileResult> {
  // 1. Get presigned URL from backend
  const { id, uploadUrl, fileUrl } = await getPresignedUrl({
    fileName,
    fileType: mimeType,
    fileSize,
  });

  // 2. PUT binary file directly to S3
  await uploadBinaryToS3(uploadUrl, localUri, mimeType, onProgress);

  return { serverId: id, serverUrl: fileUrl };
}


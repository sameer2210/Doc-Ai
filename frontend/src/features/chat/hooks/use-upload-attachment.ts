import { useCallback, useState } from 'react';

import type { ChatAttachment } from '@/features/chat/types/chat-types';
import { uploadFileToS3 } from '@/services/upload';

/** Generate a unique client-side ID for an attachment before we have a server ID */
function clientId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export type UseUploadAttachmentReturn = {
  /** Current list of pending attachments (with live upload state) */
  pendingAttachments: ChatAttachment[];
  /** Start uploading a picked file. Adds it to the list immediately as 'uploading'. */
  startUpload: (file: {
    localUri: string;
    name: string;
    mimeType: string;
    size: number;
  }) => void;
  /** Remove a single attachment by its client-side id */
  removeAttachment: (id: string) => void;
  /** Clear the entire list (call after message is sent successfully) */
  clearAttachments: () => void;
  /** True while any attachment still has uploadStatus === 'uploading' */
  isUploading: boolean;
};

export function useUploadAttachment(): UseUploadAttachmentReturn {
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);

  const isUploading = pendingAttachments.some(a => a.uploadStatus === 'uploading');

  const startUpload = useCallback(
    (file: { localUri: string; name: string; mimeType: string; size: number }) => {
      const id = clientId('attachment');

      // 1. Add to list immediately so the UI shows a spinner right away
      setPendingAttachments(prev => [
        ...prev,
        {
          id,
          name: file.name,
          mimeType: file.mimeType,
          size: file.size,
          localUri: file.localUri,
          uploadStatus: 'uploading',
          progress: 0,
        },
      ]);

      // 2. Run the upload — update progress & final state reactively
      uploadFileToS3(
        file.localUri,
        file.name,
        file.mimeType,
        file.size,
        (progress) => {
          setPendingAttachments(prev =>
            prev.map(a => (a.id === id ? { ...a, progress } : a)),
          );
        },
      )
        .then(({ serverId, serverUrl }) => {
          setPendingAttachments(prev =>
            prev.map(a =>
              a.id === id
                ? { ...a, uploadStatus: 'success', progress: 100, serverId, serverUrl }
                : a,
            ),
          );
        })
        .catch(() => {
          setPendingAttachments(prev =>
            prev.map(a =>
              a.id === id ? { ...a, uploadStatus: 'failed', progress: 0 } : a,
            ),
          );
        });
    },
    [],
  );

  const removeAttachment = useCallback((id: string) => {
    setPendingAttachments(prev => prev.filter(a => a.id !== id));
  }, []);

  const clearAttachments = useCallback(() => {
    setPendingAttachments([]);
  }, []);

  return {
    pendingAttachments,
    startUpload,
    removeAttachment,
    clearAttachments,
    isUploading,
  };
}

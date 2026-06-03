import { useCallback, useEffect, useRef, useState } from 'react';

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
  uploadError: unknown;
  clearUploadError: () => void;
};

export function useUploadAttachment(): UseUploadAttachmentReturn {
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [uploadError, setUploadError] = useState<unknown>(null);
  const controllersRef = useRef(new Map<string, AbortController>());
  const attachmentSignaturesRef = useRef(new Map<string, string>());
  const activeSignaturesRef = useRef(new Set<string>());
  const mountedRef = useRef(true);

  const isUploading = pendingAttachments.some(a => a.uploadStatus === 'uploading');

  const startUpload = useCallback(
    (file: { localUri: string; name: string; mimeType: string; size: number }) => {
      const signature = `${file.localUri}::${file.name}::${file.mimeType}::${file.size}`;
      if (activeSignaturesRef.current.has(signature)) {
        return;
      }

      const id = clientId('attachment');
      const controller = new AbortController();
      controllersRef.current.set(id, controller);
      attachmentSignaturesRef.current.set(id, signature);
      activeSignaturesRef.current.add(signature);
      setUploadError(null);

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
          if (!mountedRef.current || controller.signal.aborted) return;
          setPendingAttachments(prev =>
            prev.map(a => (a.id === id ? { ...a, progress } : a)),
          );
        },
        controller.signal,
      )
        .then(({ serverId, serverUrl }) => {
          if (!mountedRef.current || controller.signal.aborted) return;
          setPendingAttachments(prev =>
            prev.map(a =>
              a.id === id
                ? { ...a, uploadStatus: 'success', progress: 100, serverId, serverUrl }
                : a,
            ),
          );
        })
        .catch(error => {
          if (!mountedRef.current || controller.signal.aborted || error?.name === 'AbortError') return;
          setUploadError(error);
          setPendingAttachments(prev =>
            prev.map(a =>
              a.id === id ? { ...a, uploadStatus: 'failed', progress: 0 } : a,
            ),
          );
        })
        .finally(() => {
          controllersRef.current.delete(id);
          const attachmentSignature = attachmentSignaturesRef.current.get(id);
          if (attachmentSignature) {
            activeSignaturesRef.current.delete(attachmentSignature);
            attachmentSignaturesRef.current.delete(id);
          }
        });
    },
    [],
  );

  const removeAttachment = useCallback((id: string) => {
    controllersRef.current.get(id)?.abort();
    controllersRef.current.delete(id);
    const attachmentSignature = attachmentSignaturesRef.current.get(id);
    if (attachmentSignature) {
      activeSignaturesRef.current.delete(attachmentSignature);
      attachmentSignaturesRef.current.delete(id);
    }
    setPendingAttachments(prev => prev.filter(a => a.id !== id));
  }, []);

  const clearAttachments = useCallback(() => {
    controllersRef.current.forEach(controller => controller.abort());
    controllersRef.current.clear();
    attachmentSignaturesRef.current.clear();
    activeSignaturesRef.current.clear();
    setPendingAttachments([]);
  }, []);

  const clearUploadError = useCallback(() => {
    setUploadError(null);
  }, []);

  useEffect(() => {
    const controllers = controllersRef.current;
    const attachmentSignatures = attachmentSignaturesRef.current;
    const activeSignatures = activeSignaturesRef.current;
    return () => {
      mountedRef.current = false;
      controllers.forEach(controller => controller.abort());
      controllers.clear();
      attachmentSignatures.clear();
      activeSignatures.clear();
    };
  }, []);

  return {
    pendingAttachments,
    startUpload,
    removeAttachment,
    clearAttachments,
    isUploading,
    uploadError,
    clearUploadError,
  };
}

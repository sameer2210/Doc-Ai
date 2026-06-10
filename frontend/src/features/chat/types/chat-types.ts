export type ChatRole = 'user' | 'assistant' | 'system';

export type ChatMessageStatus = 'pending' | 'streaming' | 'complete' | 'error';

/**
 * Upload lifecycle state for a pending attachment.
 * - idle: picked but not yet uploaded
 * - uploading: presigned URL obtained, binary PUT to S3 in progress
 * - success: S3 PUT completed — serverId & serverUrl are available
 * - failed: upload failed; user can retry or remove
 */
export type AttachmentUploadStatus = 'idle' | 'uploading' | 'success' | 'failed';

export type ChatAttachment = {
  /** Client-side temporary ID (used before server ID is returned) */
  id: string;
  name: string;
  mimeType?: string;
  size?: number;
  /** Local device URI (file://...) — used for thumbnail preview */
  localUri?: string;
  /** Upload lifecycle state */
  uploadStatus: AttachmentUploadStatus;
  /** 0–100 upload progress percentage */
  progress?: number;
  /** DB record ID returned from backend after upload */
  serverId?: string;
  /** Final public S3 URL returned from backend */
  serverUrl?: string;
};

export type ChatMessage = {
  id: string;
  /**
   * Client-only stable identity used by virtualized lists.
   * Keep this unchanged across optimistic -> server ID transitions.
   */
  localKey?: string;
  chatId: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  status: ChatMessageStatus;
  errorCode?: StreamErrorCode;
  attachments?: ChatAttachment[];
  type?: 'scan_result' | 'text';
  scanResult?: {
    prediction: string;
    confidence: number;
    aiProvider?: string;
    modelVersion?: string;
  };
  metadata?: Record<string, unknown>;
};

export type PaginatedMessages = {
  items: ChatMessage[];
  nextCursor: string | null;
};

export type SendMessagePayload = {
  chatId: string;
  content: string;
  attachments?: ChatAttachment[];
  idempotencyKey: string;
};

export type SendMessageResponse = {
  userMessage: ChatMessage;
  assistantMessageId: string;
};

export type StreamErrorCode =
  | 'DAILY_LIMIT_REACHED'
  | 'PROVIDER_RATE_LIMIT'
  | 'RATE_LIMIT'
  | 'DUPLICATE_STREAM'
  | 'INVALID_REQUEST'
  | 'CONFIGURATION_ERROR'
  | 'EMPTY_CONTEXT'
  | 'EMPTY_RESPONSE'
  | 'PERSISTENCE_ERROR'
  | 'PROVIDER_ERROR'
  | 'STREAM_ABORTED'
  | 'SESSION_EXPIRED'
  | 'UNAUTHORIZED';

export type StreamEvent =
  | { type: 'token'; value: string }
  | { type: 'done' }
  | { type: 'error'; message: string; code?: StreamErrorCode };

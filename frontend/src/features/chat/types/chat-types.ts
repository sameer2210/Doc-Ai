export type ChatRole = 'user' | 'assistant' | 'system';

export type ChatMessageStatus = 'pending' | 'streaming' | 'complete' | 'error';

export type ChatAttachment = {
  id: string;
  name: string;
  mimeType?: string;
  size?: number;
  url?: string;
};

export type ChatMessage = {
  id: string;
  chatId: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  status: ChatMessageStatus;
  attachments?: ChatAttachment[];
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

export type StreamEvent =
  | { type: 'token'; value: string }
  | { type: 'done' }
  | { type: 'error'; message: string };

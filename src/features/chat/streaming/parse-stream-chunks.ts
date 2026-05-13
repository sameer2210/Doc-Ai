import type { StreamEvent } from '@/features/chat/types/chat-types';

function parseDataLine(value: string): StreamEvent | null {
  if (!value) {
    return null;
  }

  if (value === '[DONE]') {
    return { type: 'done' };
  }

  try {
    const parsed = JSON.parse(value) as
      | { type?: 'token' | 'done' | 'error'; token?: string; content?: string; message?: string }
      | undefined;

    if (!parsed) {
      return null;
    }
    if (parsed.type === 'done') {
      return { type: 'done' };
    }
    if (parsed.type === 'error') {
      return { type: 'error', message: parsed.message ?? 'Streaming failed' };
    }

    const token = parsed.token ?? parsed.content;
    if (token) {
      return { type: 'token', value: token };
    }
  } catch {
    return { type: 'token', value };
  }

  return null;
}

export function parseStreamChunkBuffer(buffer: string): {
  events: StreamEvent[];
  remainder: string;
} {
  const events: StreamEvent[] = [];
  const lines = buffer.split('\n');
  const remainder = lines.pop() ?? '';

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    if (line.startsWith('data:')) {
      const payload = line.slice(5).trim();
      const event = parseDataLine(payload);
      if (event) {
        events.push(event);
      }
      continue;
    }

    const event = parseDataLine(line);
    if (event) {
      events.push(event);
    }
  }

  return { events, remainder };
}

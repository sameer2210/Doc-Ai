export interface GeminiPayloadParseResult {
  tokens: string[];
  finishReason: string | null;
}

export function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function safeSerialize(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }

  try {
    const seen = new WeakSet<object>();
    const serialized = JSON.stringify(value, (_key, innerValue: unknown) => {
      if (typeof innerValue === 'object' && innerValue !== null) {
        if (seen.has(innerValue)) {
          return '[Circular]';
        }
        seen.add(innerValue);
      }
      return innerValue;
    });
    if (!serialized) {
      return '';
    }
    return serialized.length > 2_000
      ? `${serialized.slice(0, 2_000)}...`
      : serialized;
  } catch {
    return String(value);
  }
}

export function toSse(payload: Record<string, unknown>): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

export function extractSsePayloadsFromBuffer(buffer: string): {
  payloads: string[];
  remainder: string;
} {
  const normalized = buffer.replace(/\r\n/g, '\n');
  const eventBlocks = normalized.split('\n\n');
  const remainder = eventBlocks.pop() ?? '';
  const payloads: string[] = [];

  for (const rawBlock of eventBlocks) {
    const block = rawBlock.trim();
    if (!block) {
      continue;
    }

    const lines = block.split('\n');
    const dataLines: string[] = [];
    for (const rawLine of lines) {
      const line = rawLine.trimEnd();
      if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trim());
      }
    }

    if (dataLines.length > 0) {
      const combined = dataLines.join('\n').trim();
      if (combined) {
        payloads.push(combined);
      }
      continue;
    }

    // Fallback for providers/proxies that return raw JSON without SSE prefixes.
    if (block.startsWith('{') || block.startsWith('[')) {
      payloads.push(block);
    }
  }

  return { payloads, remainder };
}

export function extractGeminiPayloadData(
  payload: string,
): GeminiPayloadParseResult | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return null;
  }

  const chunks: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
  const tokens: string[] = [];
  let finishReason: string | null = null;

  for (const chunk of chunks) {
    if (!isObjectRecord(chunk)) {
      continue;
    }

    const candidatesRaw = chunk.candidates;
    if (!Array.isArray(candidatesRaw)) {
      continue;
    }

    for (const candidate of candidatesRaw) {
      if (!isObjectRecord(candidate)) {
        continue;
      }

      const candidateFinishReason = candidate.finishReason;
      if (
        finishReason === null &&
        typeof candidateFinishReason === 'string' &&
        candidateFinishReason.trim().length > 0
      ) {
        finishReason = candidateFinishReason;
      }

      const contentRaw = candidate.content;
      if (!isObjectRecord(contentRaw)) {
        continue;
      }

      const partsRaw = contentRaw.parts;
      if (!Array.isArray(partsRaw)) {
        continue;
      }

      for (const part of partsRaw) {
        if (!isObjectRecord(part)) {
          continue;
        }
        const text = part.text;
        if (typeof text === 'string' && text.length > 0) {
          tokens.push(text);
        }
      }
    }
  }

  return {
    tokens,
    finishReason,
  };
}

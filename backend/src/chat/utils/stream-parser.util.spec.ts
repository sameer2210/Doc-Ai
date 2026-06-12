import {
  isObjectRecord,
  safeSerialize,
  toSse,
  extractSsePayloadsFromBuffer,
  extractGeminiPayloadData,
} from './stream-parser.util';

describe('stream-parser.util', () => {
  describe('isObjectRecord', () => {
    it('returns true for objects that are not null or arrays', () => {
      expect(isObjectRecord({})).toBe(true);
      expect(isObjectRecord({ key: 'val' })).toBe(true);
    });

    it('returns false for null, arrays, and primitives', () => {
      expect(isObjectRecord(null)).toBe(false);
      expect(isObjectRecord([])).toBe(false);
      expect(isObjectRecord('string')).toBe(false);
      expect(isObjectRecord(123)).toBe(false);
      expect(isObjectRecord(true)).toBe(false);
    });
  });

  describe('safeSerialize', () => {
    it('returns empty string for null and undefined', () => {
      expect(safeSerialize(null)).toBe('');
      expect(safeSerialize(undefined)).toBe('');
    });

    it('returns string value unchanged', () => {
      expect(safeSerialize('hello')).toBe('hello');
    });

    it('serializes standard objects', () => {
      expect(safeSerialize({ val: 42 })).toBe('{"val":42}');
    });

    it('resolves and marks circular references', () => {
      const obj: any = { name: 'circular' };
      obj.self = obj;

      const result = safeSerialize(obj);
      expect(result).toContain('[Circular]');
    });

    it('truncates serialized strings longer than 2000 chars', () => {
      const longObj = {
        data: 'a'.repeat(2500),
      };

      const result = safeSerialize(longObj);
      expect(result).toHaveLength(2003); // 2000 + '...'
      expect(result.endsWith('...')).toBe(true);
    });

    it('falls back to String representation on serialization error', () => {
      const badObj = {
        toJSON: () => {
          throw new Error('fail');
        },
      };

      expect(safeSerialize(badObj)).toBe('[object Object]');
    });
  });

  describe('toSse', () => {
    it('wraps record into data: prefix and double newline', () => {
      expect(toSse({ token: 'test' })).toBe('data: {"token":"test"}\n\n');
    });
  });

  describe('extractSsePayloadsFromBuffer', () => {
    it('normalizes carriage returns and splits by double newline', () => {
      const buffer = 'data: {"event":"1"}\r\n\r\ndata: {"event":"2"}\r\n\r\n';
      const result = extractSsePayloadsFromBuffer(buffer);

      expect(result.payloads).toEqual(['{"event":"1"}', '{"event":"2"}']);
      expect(result.remainder).toBe('');
    });

    it('retains remainder if buffer ends in incomplete block', () => {
      const buffer = 'data: {"event":"1"}\n\ndata: {"eve';
      const result = extractSsePayloadsFromBuffer(buffer);

      expect(result.payloads).toEqual(['{"event":"1"}']);
      expect(result.remainder).toBe('data: {"eve');
    });

    it('combines multi-line data payloads', () => {
      const buffer = 'data: {\ndata: "token": "abc"\ndata: }\n\n';
      const result = extractSsePayloadsFromBuffer(buffer);

      expect(result.payloads).toEqual(['{\n"token": "abc"\n}']);
    });

    it('falls back to raw JSON blocks if data: prefix is missing', () => {
      const buffer = '{"token":"xyz"}\n\n';
      const result = extractSsePayloadsFromBuffer(buffer);

      expect(result.payloads).toEqual(['{"token":"xyz"}']);
    });
  });

  describe('extractGeminiPayloadData', () => {
    it('returns null on malformed JSON', () => {
      expect(extractGeminiPayloadData('invalid-json')).toBeNull();
    });

    it('returns empty list of tokens if candidate structures are missing', () => {
      const result = extractGeminiPayloadData('{}');
      expect(result).toEqual({ tokens: [], finishReason: null });
    });

    it('extracts candidate content text parts and finish reasons', () => {
      const payloadObj = {
        candidates: [
          {
            finishReason: 'STOP',
            content: {
              parts: [{ text: 'response token' }],
            },
          },
        ],
      };

      const result = extractGeminiPayloadData(JSON.stringify(payloadObj));
      expect(result).toEqual({
        tokens: ['response token'],
        finishReason: 'STOP',
      });
    });

    it('works if payload is wrapped in an array', () => {
      const payloadArray = [
        {
          candidates: [
            {
              content: {
                parts: [{ text: 'token1' }],
              },
            },
          ],
        },
      ];

      const result = extractGeminiPayloadData(JSON.stringify(payloadArray));
      expect(result?.tokens).toEqual(['token1']);
    });
  });
});

import { ChatHistoryService } from './chat-history.service';
import type { PrismaService } from '@prisma-local/prisma.service';
import { KNOWN_FAILED_ASSISTANT_TEXTS } from '../constants/chat.constants';

describe('ChatHistoryService', () => {
  let service: ChatHistoryService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      message: {
        findMany: jest.fn(),
      },
    };

    service = new ChatHistoryService(prisma as unknown as PrismaService);
  });

  describe('compactText', () => {
    it('should collapse multiple whitespaces and trim the text', () => {
      expect(service.compactText('  hello   world! \n  ')).toBe('hello world!');
    });
  });

  describe('isStructuredScanUserMessage', () => {
    it('should correctly identify structured scan messages', () => {
      const valid =
        'Eye Scan Result: Mature\nAnalysis Condition: Mature Cataract\nAI Confidence: 92%';
      const invalid = 'Hello doctor, my eye feels dry';
      expect(service.isStructuredScanUserMessage(valid)).toBe(true);
      expect(service.isStructuredScanUserMessage(invalid)).toBe(false);
    });
  });

  describe('shouldSkipForHistory', () => {
    it('skips SYSTEM messages', () => {
      expect(service.shouldSkipForHistory('SYSTEM', 'some text', null)).toBe(true);
    });

    it('skips empty text', () => {
      expect(service.shouldSkipForHistory('USER', '', null)).toBe(true);
    });

    it('skips known failed assistant texts', () => {
      const knownFail = Array.from(KNOWN_FAILED_ASSISTANT_TEXTS)[0];
      expect(service.shouldSkipForHistory('ASSISTANT', knownFail, null)).toBe(true);
    });

    it('skips assistant pending messages', () => {
      expect(service.shouldSkipForHistory('ASSISTANT', 'typing...', { streamState: 'pending' })).toBe(true);
    });

    it('skips error state messages', () => {
      expect(service.shouldSkipForHistory('ASSISTANT', 'failed to query', { streamState: 'error' })).toBe(true);
    });

    it('skips incomplete stream integrity messages', () => {
      expect(service.shouldSkipForHistory('ASSISTANT', 'incomplete content', { streamIntegrity: 'incomplete' })).toBe(true);
    });

    it('skips legacy truncated messages based on heuristics', () => {
      expect(service.shouldSkipForHistory('ASSISTANT', 'This is a short incomplete line', { streamState: 'complete' })).toBe(true);

      expect(service.shouldSkipForHistory('ASSISTANT', 'This is complete.', { streamState: 'complete' })).toBe(false);

      expect(service.shouldSkipForHistory('ASSISTANT', 'This is short and no punctuation', { streamState: 'complete', streamIntegrity: 'complete' })).toBe(false);
    });
  });

  describe('buildHistory', () => {
    it('returns empty contents if no messages exist', async () => {
      prisma.message.findMany.mockResolvedValueOnce([]);

      const result = await service.buildHistory('chat-1', 'msg-current');

      expect(result.contents).toEqual([]);
      expect(result.totalChars).toBe(0);
      expect(result.estimatedInputTokens).toBeGreaterThan(0);
    });

    it('deduplicates scan user/assistant messages to keep only the latest ones', async () => {
      const mockMessages = [
        {
          id: 'assistant-new',
          role: 'ASSISTANT',
          content: 'Scan results look good.',
          metadata: {
            type: 'scan_result',
            streamState: 'complete',
            streamIntegrity: 'complete',
          },
          createdAt: new Date('2026-06-12T12:00:00Z'), // newest
        },
        {
          id: 'user-new',
          role: 'USER',
          content:
            'Eye Scan Result Analysis Condition AI Confidence - Newest Scan',
          metadata: null,
          createdAt: new Date('2026-06-12T11:59:00Z'),
        },
        {
          id: 'assistant-old',
          role: 'ASSISTANT',
          content: 'Older scan results advice.',
          metadata: {
            type: 'scan_result',
            streamState: 'complete',
            streamIntegrity: 'complete',
          },
          createdAt: new Date('2026-06-12T11:00:00Z'),
        },
        {
          id: 'user-old',
          role: 'USER',
          content:
            'Eye Scan Result Analysis Condition AI Confidence - Older Scan',
          metadata: null,
          createdAt: new Date('2026-06-12T10:59:00Z'),
        },
      ];

      prisma.message.findMany.mockResolvedValueOnce(mockMessages);

      const result = await service.buildHistory('chat-1', 'msg-current');

      expect(result.contents).toHaveLength(2);
      expect(result.contents[0].parts[0].text).toContain('Newest Scan');
      expect(result.contents[1].parts[0].text).toBe('Scan results look good.');
    });

    it('enforces character budget window limits', async () => {
      const longMessage = 'a'.repeat(25000);
      const mockMessages = [
        { id: '1', role: 'USER', content: 'recent msg', metadata: null, createdAt: new Date('2026-06-12T10:00:00Z') },
        { id: '2', role: 'ASSISTANT', content: 'another msg', metadata: { streamState: 'complete', streamIntegrity: 'complete' }, createdAt: new Date('2026-06-12T09:00:00Z') },
        { id: '3', role: 'USER', content: longMessage, metadata: null, createdAt: new Date('2026-06-12T08:00:00Z') },
      ];

      prisma.message.findMany.mockResolvedValueOnce(mockMessages);

      const result = await service.buildHistory('chat-1', 'msg-current');

      expect(result.contents).toHaveLength(2);
      expect(result.contents[0].parts[0].text).toBe('another msg');
      expect(result.contents[1].parts[0].text).toBe('recent msg');
    });
  });
});

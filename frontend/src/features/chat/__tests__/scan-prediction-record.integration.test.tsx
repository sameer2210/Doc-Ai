import { listMessages } from '../api/chat-api';
import { httpClient } from '@/shared/api/http-client';
import type { ChatMessage } from '../types/chat-types';

describe('Scan Prediction Record Database Contract Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('correctly maps and validates the backend database schema contract for scan prediction records', async () => {
    // 1. Mock the API response to match the backend DB schema/relation mapping:
    // User has many AiPrediction / Upload / Chat
    // Message has type: 'scan_result' and metadata representing 'scan_prediction_record'
    const mockDbResponse = {
      data: {
        items: [
          {
            id: 'msg-abc-123',
            chatId: 'chat-xyz-789',
            role: 'assistant' as const,
            content: 'SpandaVidya AI Ayurvedic cataract detection screening result.',
            createdAt: new Date().toISOString(),
            status: 'complete' as const,
            type: 'scan_result' as const,
            scanResult: {
              prediction: 'Immature_Cataract',
              confidence: 0.92,
              aiProvider: 'GOOGLE_CLOUD_RUN',
              modelVersion: 'EfficientNet-B3',
            },
            metadata: {
              type: 'scan_prediction_record',
              uploadId: 'upload-img-999',
              userId: 'user-777',
            },
          },
        ],
        nextCursor: null,
      },
    };

    const httpGetSpy = jest.spyOn(httpClient, 'get').mockResolvedValue(mockDbResponse);

    // 2. Call the listMessages API
    const response = await listMessages({ chatId: 'chat-xyz-789' });

    // 3. Verify HTTP request parameters
    expect(httpGetSpy).toHaveBeenCalledWith('/chats/chat-xyz-789/messages', {
      params: {
        cursor: undefined,
        limit: 30,
      },
    });

    // 4. Verify structural contract correctness of the returned message list
    expect(response.items).toHaveLength(1);
    const message: ChatMessage = response.items[0];

    // Assert that fields match backend database schema properties exactly
    expect(message.id).toBe('msg-abc-123');
    expect(message.chatId).toBe('chat-xyz-789');
    expect(message.type).toBe('scan_result');
    
    // Assert prediction properties mapping
    expect(message.scanResult).toBeDefined();
    expect(message.scanResult?.prediction).toBe('Immature_Cataract');
    expect(message.scanResult?.confidence).toBe(0.92);
    expect(message.scanResult?.aiProvider).toBe('GOOGLE_CLOUD_RUN');

    // Assert relation metadata contract (scan_prediction_record type linking uploadId and messageId)
    expect(message.metadata).toBeDefined();
    expect(message.metadata?.type).toBe('scan_prediction_record');
    expect(message.metadata?.uploadId).toBe('upload-img-999');
    expect(message.metadata?.userId).toBe('user-777');
  });
});

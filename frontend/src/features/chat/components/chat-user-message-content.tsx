import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { useTheme } from '@/theme';

import { UserScanSummaryCard } from '@/features/chat/components/user-scan-summary-card';
import type { ChatMessage } from '@/features/chat/types/chat-types';
import { parseStructuredScanUserMessage } from '@/features/chat/utils/scan-result-formatters';

export function ChatUserMessageContent({ message }: { message: ChatMessage }) {
  const { theme } = useTheme();
  const structuredScan = parseStructuredScanUserMessage(message.content);
  if (structuredScan) {
    return (
      <UserScanSummaryCard
        prediction={structuredScan.prediction}
        confidence={structuredScan.confidence}
        aiProvider={structuredScan.aiProvider}
        modelVersion={structuredScan.modelVersion}
        variant="embedded"
      />
    );
  }

  return (
    <Text
      style={[
        styles.text,
        {
          color: theme.colors.chatUserBubbleText,
        },
      ]}
    >
      {message.content}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontWeight: '600',
    fontSize: 15,
    lineHeight: 22,
  },
});

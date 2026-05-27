import { StyleSheet, Text } from 'react-native';

import type { ChatMessage } from '@/features/chat/types/chat-types';
import { UserScanSummaryCard } from '@/features/chat/components/user-scan-summary-card';
import { parseStructuredScanUserMessage } from '@/features/chat/utils/scan-result-formatters';

export function ChatUserMessageContent({ message }: { message: ChatMessage }) {
  const structuredScan = parseStructuredScanUserMessage(message.content);
  if (structuredScan) {
    return (
      <UserScanSummaryCard
        prediction={structuredScan.prediction}
        confidence={structuredScan.confidence}
      />
    );
  }

  return <Text style={styles.text}>{message.content}</Text>;
}

const styles = StyleSheet.create({
  text: {
    color: '#F2F7FF',
    fontWeight: '600',
    fontSize: 15,
    lineHeight: 22,
  },
});

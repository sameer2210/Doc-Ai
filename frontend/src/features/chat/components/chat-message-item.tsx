import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Markdown from '@ronradtke/react-native-markdown-display';

import type { ChatMessage } from '@/features/chat/types/chat-types';
import { ScanResultCard } from '@/features/chat/components/scan-result-card';
import {
  parseScanResultFromContent,
  formatPredictionLabel,
  formatConfidenceLabel,
  getClinicalNote,
} from '@/features/chat/utils/scan-result-formatters';

export function ChatMessageItem({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  const containerStyle = isUser ? styles.userBubble : styles.assistantBubble;
  const textStyle = isUser ? styles.userText : styles.assistantText;

  // Determine if this message should render a ScanResultCard
  const scanResult =
    message.type === 'scan_result'
? { prediction: message.scanResult?.prediction ?? '', confidence: message.scanResult?.confidence ?? 0 }
: parseScanResultFromContent(message.content);

  const renderScanCard = scanResult && !isUser;

  return (
    <Animated.View
      entering={FadeInDown.duration(320)}
      style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}
    >
      <View style={[styles.bubble, containerStyle]}>
        {isUser ? (
          <Text style={[styles.baseText, textStyle]}>{message.content}</Text>
        ) : renderScanCard ? (
          <ScanResultCard
            prediction={scanResult.prediction}
            confidence={scanResult.confidence}
          />
        ) : (
          <Markdown
            style={{
              body: styles.assistantText,
              code_inline: styles.inlineCode,
              code_block: styles.codeBlock,
              fence: styles.codeBlock,
              paragraph: styles.markdownParagraph,
            }}
          >
            {message.content || '...'}
          </Markdown>
        )}

        {message.status === 'streaming' ? (
          <View style={styles.typingRow}>
            <View style={styles.dot} />
            <View style={[styles.dot, styles.dotMid]} />
            <View style={styles.dot} />
            <Text style={styles.streamingHint}>Generating response</Text>
          </View>
        ) : null}

        {message.status === 'error' ? (
          <Text style={styles.errorHint}>Response failed. Retry.</Text>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  rowUser: {
    alignItems: 'flex-end',
  },
  rowAssistant: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '90%',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  userBubble: {
    backgroundColor: '#5D8EEA',
    borderWidth: 1,
    borderColor: 'rgba(195, 218, 255, 0.34)',
  },
  assistantBubble: {
    backgroundColor: 'rgba(21, 29, 43, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(168, 188, 224, 0.24)',
  },
  baseText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: '#F2F7FF',
    fontWeight: '600',
  },
  assistantText: {
    color: '#E8F1FF',
    fontSize: 15,
    lineHeight: 22,
  },
  inlineCode: {
    backgroundColor: '#15233A',
    color: '#D7E8FF',
    borderRadius: 6,
    paddingHorizontal: 4,
  },
  codeBlock: {
    backgroundColor: '#091221',
    color: '#E6F1FF',
    borderRadius: 10,
    padding: 10,
    overflow: 'hidden',
  },
  markdownParagraph: {
    marginTop: 0,
    marginBottom: 8,
  },
  typingRow: {
    marginTop: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    height: 4,
    width: 4,
    borderRadius: 3,
    backgroundColor: '#9FB8E0',
  },
  dotMid: {
    opacity: 0.75,
  },
  streamingHint: {
    marginLeft: 4,
    fontSize: 11,
    color: '#9AB0D1',
  },
  errorHint: {
    fontSize: 12,
    color: '#F5A3A3',
    marginTop: 6,
  },
});

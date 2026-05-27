import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import type { ChatMessage } from '@/features/chat/types/chat-types';
import { ChatUserMessageContent } from '@/features/chat/components/chat-user-message-content';
import { ChatAssistantMessageContent } from '@/features/chat/components/chat-assistant-message-content';

export function ChatMessageItem({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  const containerStyle = isUser ? styles.userBubble : styles.assistantBubble;

  return (
    <Animated.View
      entering={FadeInDown.duration(320)}
      style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}
    >
      <View style={[styles.bubble, containerStyle]}>
        {isUser ? <ChatUserMessageContent message={message} /> : <ChatAssistantMessageContent message={message} />}

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

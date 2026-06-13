import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ErrorNotice } from '@/components/ui/ErrorNotice';
import { ChatAssistantMessageContent } from '@/features/chat/components/chat-assistant-message-content';
import { ChatUserMessageContent } from '@/features/chat/components/chat-user-message-content';
import type { ChatMessage } from '@/features/chat/types/chat-types';
import { getChatErrorContent } from '@/features/chat/utils/chat-error-content';
import { useTheme } from '@/theme';

export function ChatMessageItem({ message }: { message: ChatMessage }) {
  const { theme } = useTheme();
  const isUser = message.role === 'user';
  const errorContent = getChatErrorContent(message.errorCode);
  console.log('CHAT_ERROR', message.status, message.errorCode, message);

  const bubbleStyle: StyleProp<ViewStyle> = [
    styles.bubble,
    isUser
      ? {
          backgroundColor: theme.colors.chatUserBubble,
          borderColor: theme.colors.border.subtle,
          borderWidth: 1,
          maxWidth: '80%',
          alignSelf: 'flex-end',
        }
      : {
          backgroundColor: theme.colors.chatAssistantBubble,
          borderColor: theme.colors.border.subtle,
          borderWidth: 1,
          maxWidth: '92%',
          alignSelf: 'flex-start',
        },
  ];

  return (
    <Animated.View
      entering={FadeInDown.duration(320)}
      style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}
    >
      <View style={bubbleStyle}>
        {isUser ? (
          <ChatUserMessageContent message={message} />
        ) : (
          <ChatAssistantMessageContent message={message} />
        )}

        {message.status === 'streaming' ? (
          <View style={styles.typingRow}>
            <View style={[styles.dot, { backgroundColor: theme.colors.accent.primary }]} />
            <View style={[styles.dot, styles.dotMid, { backgroundColor: theme.colors.accent.primary }]} />
            <View style={[styles.dot, { backgroundColor: theme.colors.accent.primary }]} />
            <Text style={[styles.streamingHint, { color: theme.colors.text.secondary }]}>
              Generating response
            </Text>
          </View>
        ) : null}

        {message.status === 'error' ? (
          <ErrorNotice
            title={errorContent.title}
            message={errorContent.message}
            compact
            style={styles.errorHint}
          />
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
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
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
  },
  dotMid: {
    opacity: 0.75,
  },
  streamingHint: {
    marginLeft: 4,
    fontSize: 11,
  },
  errorHint: {
    marginTop: 6,
  },
});

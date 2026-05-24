import Markdown from '@ronradtke/react-native-markdown-display';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import type { ChatMessage } from '@/features/chat/types/chat-types';

export function ChatMessageItem({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  const containerStyle = isUser ? styles.userBubble : styles.assistantBubble;
  const textStyle = isUser ? styles.userText : styles.assistantText;

  return (
    <Animated.View entering={FadeInDown.duration(320)} style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      <View style={[styles.bubble, containerStyle]}>
        {isUser ? (
          <Text style={[styles.baseText, textStyle]}>{message.content}</Text>
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

        {message.status === 'error' ? <Text style={styles.errorHint}>Response failed. Retry.</Text> : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    marginBottom: 10,
    paddingHorizontal: 14,
  },
  rowUser: {
    alignItems: 'flex-end',
  },
  rowAssistant: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '92%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  userBubble: {
    backgroundColor: '#6EA8FF',
    borderWidth: 1,
    borderColor: 'rgba(205, 227, 255, 0.42)',
  },
  assistantBubble: {
    backgroundColor: 'rgba(15, 25, 40, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(179, 201, 240, 0.2)',
  },
  baseText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: '#03112D',
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

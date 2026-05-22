// import Markdown from 'react-native-markdown-display';
import Markdown from '@ronradtke/react-native-markdown-display';
import { StyleSheet, Text, View } from 'react-native';

import type { ChatMessage } from '@/features/chat/types/chat-types';

export function ChatMessageItem({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  const containerStyle = isUser ? styles.userBubble : styles.assistantBubble;
  const textStyle = isUser ? styles.userText : styles.assistantText;

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
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
            }}>
            {message.content || '...'}
          </Markdown>
        )}
        {message.status === 'streaming' ? <Text style={styles.streamingHint}>Generating...</Text> : null}
        {message.status === 'error' ? <Text style={styles.errorHint}>Response failed. Retry.</Text> : null}
      </View>
    </View>
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
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: {
    backgroundColor: '#1D4ED8',
  },
  assistantBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  baseText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#FFFFFF',
  },
  assistantText: {
    color: '#0F172A',
    fontSize: 16,
    lineHeight: 22,
  },
  inlineCode: {
    backgroundColor: '#E2E8F0',
    color: '#0F172A',
    borderRadius: 6,
    paddingHorizontal: 4,
  },
  codeBlock: {
    backgroundColor: '#0F172A',
    color: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    overflow: 'hidden',
  },
  markdownParagraph: {
    marginTop: 0,
    marginBottom: 8,
  },
  streamingHint: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
  },
  errorHint: {
    fontSize: 12,
    color: '#B91C1C',
    marginTop: 6,
  },
});

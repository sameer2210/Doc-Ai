import { StyleSheet, View } from 'react-native';
import Markdown from '@ronradtke/react-native-markdown-display';

import { ScanResultCard } from '@/features/chat/components/scan-result-card';
import type { ChatMessage } from '@/features/chat/types/chat-types';
import { parseScanResultFromContent } from '@/features/chat/utils/scan-result-formatters';

export function ChatAssistantMessageContent({ message }: { message: ChatMessage }) {
  const scanResult =
    message.type === 'scan_result'
      ? {
          prediction: message.scanResult?.prediction ?? '',
          confidence: message.scanResult?.confidence ?? 0,
        }
      : parseScanResultFromContent(message.content);

  const hasText = message.content.trim().length > 0;

  return (
    <View style={styles.container}>
      {hasText ? (
        <Markdown
          style={{
            body: styles.text,
            code_inline: styles.inlineCode,
            code_block: styles.codeBlock,
            fence: styles.codeBlock,
            paragraph: styles.markdownParagraph,
          }}
        >
          {message.content}
        </Markdown>
      ) : null}

      {scanResult ? (
        <View style={hasText ? styles.scanResultWithSpacing : undefined}>
          <ScanResultCard
            prediction={scanResult.prediction}
            confidence={scanResult.confidence}
          />
        </View>
      ) : null}

      {!hasText && !scanResult ? (
        <Markdown
          style={{
            body: styles.text,
            code_inline: styles.inlineCode,
            code_block: styles.codeBlock,
            fence: styles.codeBlock,
            paragraph: styles.markdownParagraph,
          }}
        >
          {'...'}
        </Markdown>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  text: {
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
  scanResultWithSpacing: {
    marginTop: 6,
  },
});

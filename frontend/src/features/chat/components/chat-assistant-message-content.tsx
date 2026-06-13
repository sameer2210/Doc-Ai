import Markdown from '@ronradtke/react-native-markdown-display';
import { StyleSheet, View } from 'react-native';

import { ScanResultCard } from '@/features/chat/components/scan-result-card';
import type { ChatMessage } from '@/features/chat/types/chat-types';
import { parseScanResultFromContent } from '@/features/chat/utils/scan-result-formatters';
import { useTheme } from '@/theme';

export function ChatAssistantMessageContent({ message }: { message: ChatMessage }) {
  const { theme } = useTheme();
  
  const scanResult =
    message.type === 'scan_result'
      ? {
          prediction: message.scanResult?.prediction ?? '',
          confidence: message.scanResult?.confidence ?? 0,
        }
      : parseScanResultFromContent(message.content);

  const hasText = message.content.trim().length > 0;

  const markdownStyle = {
    body: {
      color: theme.colors.text.primary,
      fontSize: 15,
      lineHeight: 24,
    },
    code_inline: {
      backgroundColor: theme.colors.markdownInlineCode,
      color: theme.colors.accent.primary,
      borderRadius: 6,
      paddingHorizontal: 4,
    },
    code_block: {
      backgroundColor: theme.colors.markdownCodeBlock,
      color: theme.colors.text.primary,
      borderRadius: 12,
      padding: 12,
      overflow: 'hidden' as const,
    },
    fence: {
      backgroundColor: theme.colors.markdownCodeBlock,
      color: theme.colors.text.primary,
      borderRadius: 12,
      padding: 12,
      overflow: 'hidden' as const,
    },
    paragraph: {
      marginTop: 0,
      marginBottom: 10,
    },
  };

  return (
    <View style={styles.container}>
      {hasText ? (
        <Markdown style={markdownStyle}>
          {message.content}
        </Markdown>
      ) : null}

      {scanResult ? (
        <View style={hasText ? styles.scanResultWithSpacing : undefined}>
          <ScanResultCard prediction={scanResult.prediction} confidence={scanResult.confidence} />
        </View>
      ) : null}

      {!hasText && !scanResult && message.status !== 'error' ? (
        <Markdown style={markdownStyle}>
          {'...'}
        </Markdown>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    minWidth: '100%',
  },
  scanResultWithSpacing: {
    marginTop: 10,
    width: '100%',
  },
});

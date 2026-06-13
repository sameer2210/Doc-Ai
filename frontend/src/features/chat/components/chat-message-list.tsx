import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { forwardRef, useMemo, useRef } from 'react';
import { Text, View } from 'react-native';

import { SkeletonBlock } from '@/components/ui/SkeletonBlock';
import { ChatMessageItem } from '@/features/chat/components/chat-message-item';
import type { ChatMessage } from '@/features/chat/types/chat-types';
import { useTheme } from '@/theme';

type ChatMessageListProps = {
  messages: ChatMessage[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  onStartReached: () => void;
};

function LoadingSkeleton() {
  return (
    <View className="flex-1 gap-3 px-5 pt-5">
      <SkeletonBlock style={{ height: 52, width: '78%' }} />
      <SkeletonBlock style={{ height: 92, width: '92%', alignSelf: 'flex-end' }} />
      <SkeletonBlock style={{ height: 64, width: '70%' }} />
      <SkeletonBlock style={{ height: 82, width: '86%', alignSelf: 'flex-end' }} />
    </View>
  );
}

export const ChatMessageList = forwardRef<
  FlashListRef<ChatMessage>,
  ChatMessageListProps
>(function ChatMessageList(
  { messages, isLoading, isFetchingNextPage, onStartReached },
  ref,
) {
  const { theme } = useTheme();
  const hasUserScrolledRef = useRef(false);
  
  const safeMessages = useMemo(() => {
    if (!Array.isArray(messages)) {
      return [];
    }

    const seenIds = new Set<string>();

    return messages.filter((msg): msg is ChatMessage => {
      if (
        !msg ||
        typeof msg !== 'object' ||
        !(msg.localKey || msg.id) ||
        !msg.role
      ) {
        return false;
      }

      const dedupeKey = msg.localKey ?? msg.id;
      if (seenIds.has(dedupeKey)) {
        return false;
      }

      seenIds.add(dedupeKey);
      return true;
    });
  }, [messages]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!safeMessages.length) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text style={{ textAlign: 'center', fontSize: 24, fontWeight: '700', color: theme.colors.text.primary }}>
          Start your AI consultation
        </Text>
        <Text style={{ marginTop: 8, textAlign: 'center', fontSize: 16, color: theme.colors.text.secondary }}>
          Upload an eye image from Home cataract detection, then your consultation will appear here.
        </Text>
      </View>
    );
  }

  return (
    <FlashList
      ref={ref}
      onScrollBeginDrag={() => {
        hasUserScrolledRef.current = true;
      }}
      maintainVisibleContentPosition={{
        autoscrollToTopThreshold: 0.2,
        autoscrollToBottomThreshold: 0.2,
        animateAutoScrollToBottom: false,
        startRenderingFromBottom: true,
      }}
      onStartReached={() => {
        if (!hasUserScrolledRef.current) {
          return;
        }
        onStartReached();
      }}
      onStartReachedThreshold={0.2}
      drawDistance={800}
      data={safeMessages}
      keyExtractor={(item) => (item.localKey ?? item.id).toString()}
      renderItem={({ item }) => <ChatMessageItem message={item} />}
      getItemType={(item) => (item.type === 'scan_result' ? 'scan_result' : item.role)}
      removeClippedSubviews={false}
      ListHeaderComponent={isFetchingNextPage ? <LoadingSkeleton /> : <View className="h-3" />}
      contentContainerStyle={{ paddingTop: 14, paddingBottom: 8 }}
    />
  );
});

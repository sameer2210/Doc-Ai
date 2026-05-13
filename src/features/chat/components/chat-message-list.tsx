import { FlashList } from '@shopify/flash-list';
import { ActivityIndicator, Text, View } from 'react-native';

import { ChatMessageItem } from '@/features/chat/components/chat-message-item';
import type { ChatMessage } from '@/features/chat/types/chat-types';

type ChatMessageListProps = {
  messages: ChatMessage[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  onEndReached: () => void;
};

export function ChatMessageList({
  messages,
  isLoading,
  isFetchingNextPage,
  onEndReached,
}: ChatMessageListProps) {
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <ActivityIndicator size="small" color="#1D4ED8" />
      </View>
    );
  }

  if (!messages.length) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-center text-2xl font-bold text-slate-900">Start your first message</Text>
        <Text className="mt-2 text-center text-base text-slate-600">
          Upload a file or ask a question to begin.
        </Text>
      </View>
    );
  }

  return (
    <FlashList
      data={messages}
      keyExtractor={item => item.id}
      renderItem={({ item }) => <ChatMessageItem message={item} />}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.2}
      ListFooterComponent={
        isFetchingNextPage ? (
          <ActivityIndicator size="small" color="#1D4ED8" />
        ) : (
          <View className="h-3" />
        )
      }
      contentContainerStyle={{ paddingTop: 12, paddingBottom: 6 }}
    />
  );
}

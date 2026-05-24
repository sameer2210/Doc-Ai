import { FlashList } from '@shopify/flash-list';
import { Text, View } from 'react-native';

import { SkeletonBlock } from '@/components/ui/SkeletonBlock';
import { ChatMessageItem } from '@/features/chat/components/chat-message-item';
import type { ChatMessage } from '@/features/chat/types/chat-types';

type ChatMessageListProps = {
  messages: ChatMessage[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  onEndReached: () => void;
};

function LoadingSkeleton() {
  return (
    <View className="flex-1 gap-3 px-4 pt-4">
      <SkeletonBlock style={{ height: 52, width: '78%' }} />
      <SkeletonBlock style={{ height: 92, width: '92%', alignSelf: 'flex-end' }} />
      <SkeletonBlock style={{ height: 64, width: '70%' }} />
      <SkeletonBlock style={{ height: 82, width: '86%', alignSelf: 'flex-end' }} />
    </View>
  );
}

export function ChatMessageList({
  messages,
  isLoading,
  isFetchingNextPage,
  onEndReached,
}: ChatMessageListProps) {
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!messages.length) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-center text-2xl font-bold text-[#F2F8FF]">Start your first message</Text>
        <Text className="mt-2 text-center text-base text-[#8EA1C2]">
          Upload a scan image, share documents, or ask anything to begin.
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
      ListFooterComponent={isFetchingNextPage ? <LoadingSkeleton /> : <View className="h-3" />}
      contentContainerStyle={{ paddingTop: 12, paddingBottom: 6 }}
    />
  );
}

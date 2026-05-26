import { FlatList, Text, View } from 'react-native';

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
    <View className="flex-1 gap-3 px-5 pt-5">
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

  const safeMessages = Array.isArray(messages)
    ? messages.filter(
        (msg) =>
          msg &&
          typeof msg === 'object' &&
          (msg.localKey || msg.id) &&
          msg.role
      )
    : [];

  if (!safeMessages.length) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-center text-2xl font-bold text-[#EAD6C3]">Start your AI consultation</Text>
        <Text className="mt-2 text-center text-base text-[#A59A91]">
          Upload an eye image from Home cataract detection, then your consultation will appear here.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={safeMessages}
      inverted={true}
      keyExtractor={(item) => (item.localKey ?? item.id).toString()}
      renderItem={({ item }) => <ChatMessageItem message={item} />}
      removeClippedSubviews={false}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.2}
      ListFooterComponent={isFetchingNextPage ? <LoadingSkeleton /> : <View className="h-3" />}
      contentContainerStyle={{ paddingTop: 14, paddingBottom: 8 }}
    />
  );
}

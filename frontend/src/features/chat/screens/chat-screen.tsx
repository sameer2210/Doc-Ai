import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChatComposer } from '@/features/chat/components/chat-composer';
import { ChatMessageList } from '@/features/chat/components/chat-message-list';
import { useChatMessages } from '@/features/chat/hooks/use-chat-messages';
import { useSendMessage } from '@/features/chat/hooks/use-send-message';
import type { ChatAttachment } from '@/features/chat/types/chat-types';

const DEFAULT_CHAT_ID = 'default';

export function ChatScreen() {
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const { messages, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useChatMessages(DEFAULT_CHAT_ID);
  const sendMessageMutation = useSendMessage(DEFAULT_CHAT_ID);

  const attachmentHint = useMemo(() => {
    if (!pendingAttachments.length) {
      return 'No attachments selected';
    }

    if (pendingAttachments.length === 1) {
      return pendingAttachments[0].name;
    }

    return `${pendingAttachments.length} attachments selected`;
  }, [pendingAttachments]);

  async function attachImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Media library permission is needed to select images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.9,
      selectionLimit: 1,
    });

    if (result.canceled || !result.assets.length) {
      return;
    }

    const asset = result.assets[0];
    setPendingAttachments(current => [
      ...current,
      {
        id: `asset_${Date.now().toString(36)}`,
        name: asset.fileName ?? `image-${Date.now()}.jpg`,
        mimeType: asset.mimeType,
        size: asset.fileSize,
        url: asset.uri,
      },
    ]);
  }

  async function attachDocument() {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      multiple: false,
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets.length) {
      return;
    }

    const asset = result.assets[0];
    setPendingAttachments(current => [
      ...current,
      {
        id: `doc_${Date.now().toString(36)}`,
        name: asset.name,
        mimeType: asset.mimeType,
        size: asset.size,
        url: asset.uri,
      },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
      <View className="flex-1 bg-slate-100">
        <LinearGradient
          colors={['#0F172A', '#1E293B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="px-4 pb-5 pt-3"
        >
          <View className="rounded-2xl border border-slate-600/40 bg-slate-900/55 p-4">
            <Text className="text-2xl font-bold tracking-tight text-white">SpandaVidya Chat</Text>
            <Text className="mt-1 text-sm text-slate-300">
              Streaming architecture + file-aware assistant UI
            </Text>
          </View>
        </LinearGradient>

        <View className="mx-3 mt-3 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <View className="flex-1">
            <ChatMessageList
              messages={messages}
              isLoading={isLoading}
              isFetchingNextPage={isFetchingNextPage}
              onEndReached={() => {
                if (hasNextPage) {
                  void fetchNextPage();
                }
              }}
            />
          </View>

          <View className="border-t border-slate-200 bg-slate-50 px-4 py-2">
            <Text numberOfLines={1} className="text-xs font-medium text-slate-600">
              {attachmentHint}
            </Text>
          </View>

          <ChatComposer
            loading={sendMessageMutation.isPending}
            onAttachImage={() => {
              void attachImage();
            }}
            onAttachDocument={() => {
              void attachDocument();
            }}
            onSend={text => {
              sendMessageMutation.mutate(
                {
                  content: text,
                  attachments: pendingAttachments,
                },
                {
                  onSuccess: () => {
                    setPendingAttachments([]);
                  },
                }
              );
            }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

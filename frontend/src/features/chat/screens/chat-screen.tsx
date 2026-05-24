import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Alert, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard } from '@/components/ui/GlassCard';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { AttachmentPreviewBar } from '@/features/chat/components/attachment-preview-bar';
import { ChatComposer } from '@/features/chat/components/chat-composer';
import { ChatMessageList } from '@/features/chat/components/chat-message-list';
import { useChatMessages } from '@/features/chat/hooks/use-chat-messages';
import { useSendMessage } from '@/features/chat/hooks/use-send-message';
import { useUploadAttachment } from '@/features/chat/hooks/use-upload-attachment';

const DEFAULT_CHAT_ID = 'default';

export function ChatScreen() {
  const {
    pendingAttachments,
    startUpload,
    removeAttachment,
    clearAttachments,
    isUploading,
  } = useUploadAttachment();

  const { messages, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useChatMessages(DEFAULT_CHAT_ID);
  const sendMessageMutation = useSendMessage(DEFAULT_CHAT_ID);

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

    if (result.canceled || !result.assets.length) return;

    const asset = result.assets[0];
    startUpload({
      localUri: asset.uri,
      name: asset.fileName ?? `image-${Date.now()}.jpg`,
      mimeType: asset.mimeType ?? 'image/jpeg',
      size: asset.fileSize ?? 0,
    });
  }

  async function attachDocument() {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      multiple: false,
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets.length) return;

    const asset = result.assets[0];
    startUpload({
      localUri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType ?? 'application/octet-stream',
      size: asset.size ?? 0,
    });
  }

  function handleSend(text: string) {
    const confirmedAttachments = pendingAttachments
      .filter(a => a.uploadStatus === 'success' && a.serverId && a.serverUrl)
      .map(a => ({
        id: a.serverId!,
        name: a.name,
        mimeType: a.mimeType,
        size: a.size,
        localUri: a.localUri,
        uploadStatus: a.uploadStatus,
        serverUrl: a.serverUrl,
        serverId: a.serverId,
      }));

    sendMessageMutation.mutate(
      { content: text, attachments: confirmedAttachments },
      { onSuccess: () => clearAttachments() },
    );
  }

  const isSendBlocked = sendMessageMutation.isPending || isUploading;

  const attachmentHint = (() => {
    if (!pendingAttachments.length) return null;
    const uploading = pendingAttachments.filter(a => a.uploadStatus === 'uploading').length;
    const failed = pendingAttachments.filter(a => a.uploadStatus === 'failed').length;
    if (uploading > 0) return `Uploading ${uploading} file${uploading > 1 ? 's' : ''}...`;
    if (failed > 0) return `${failed} upload${failed > 1 ? 's' : ''} failed. Remove failed items.`;
    return null;
  })();

  return (
    <SafeAreaView className="flex-1 bg-[#06080D]" edges={['top', 'left', 'right']}>
      <View className="flex-1">
        <ScreenBackground />

        <Animated.View entering={FadeInDown.duration(520)} className="px-5 pb-3 pt-2">
          <GlassCard style={{ padding: 14 }}>
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-2xl bg-[#1A2A43]">
                <Ionicons name="sparkles-outline" size={18} color="#B9D0FF" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-[#F2F8FF]">AI Health Chat</Text>
                <Text className="mt-0.5 text-xs text-[#8FA2C3]">Clinical-grade responses with streaming updates</Text>
              </View>
            </View>
          </GlassCard>
        </Animated.View>

        <View className="mx-4 mb-3 flex-1 overflow-hidden rounded-[24px] border border-[#B4C8EC2D] bg-[#0B111CE8]">
          <View className="flex-1">
            <ChatMessageList
              messages={messages}
              isLoading={isLoading}
              isFetchingNextPage={isFetchingNextPage}
              onEndReached={() => {
                if (hasNextPage) void fetchNextPage();
              }}
            />
          </View>

          <AttachmentPreviewBar attachments={pendingAttachments} onRemove={removeAttachment} />

          {attachmentHint ? (
            <View className="border-t border-[#B5C6E81F] bg-[#132338] px-4 py-1.5">
              <Text numberOfLines={1} className="text-xs font-semibold text-[#A8C2EF]">
                {attachmentHint}
              </Text>
            </View>
          ) : null}

          <ChatComposer
            loading={isSendBlocked}
            onAttachImage={() => {
              void attachImage();
            }}
            onAttachDocument={() => {
              void attachDocument();
            }}
            onSend={handleSend}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

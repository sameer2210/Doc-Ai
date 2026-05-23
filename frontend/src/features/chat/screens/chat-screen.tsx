import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Alert, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
    // Start S3 upload immediately — shows progress in the preview bar
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
    // Start S3 upload immediately
    startUpload({
      localUri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType ?? 'application/octet-stream',
      size: asset.size ?? 0,
    });
  }

  function handleSend(text: string) {
    // Only pass attachments that fully uploaded to S3
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

  // Determine if send should be blocked
  const isSendBlocked = sendMessageMutation.isPending || isUploading;

  // Build status hint text for the attachment row
  const attachmentHint = (() => {
    if (!pendingAttachments.length) return null;
    const uploading = pendingAttachments.filter(a => a.uploadStatus === 'uploading').length;
    const failed = pendingAttachments.filter(a => a.uploadStatus === 'failed').length;
    if (uploading > 0) return `Uploading ${uploading} file${uploading > 1 ? 's' : ''}…`;
    if (failed > 0) return `${failed} upload${failed > 1 ? 's' : ''} failed — tap ✕ to remove`;
    return null;
  })();

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
                if (hasNextPage) void fetchNextPage();
              }}
            />
          </View>

          {/* Attachment preview bar — shows upload progress per file */}
          <AttachmentPreviewBar
            attachments={pendingAttachments}
            onRemove={removeAttachment}
          />

          {/* Status hint shown only when there's something notable */}
          {attachmentHint ? (
            <View className="border-t border-slate-200 bg-amber-50 px-4 py-1.5">
              <Text numberOfLines={1} className="text-xs font-medium text-amber-700">
                {attachmentHint}
              </Text>
            </View>
          ) : null}

          <ChatComposer
            loading={isSendBlocked}
            onAttachImage={() => { void attachImage(); }}
            onAttachDocument={() => { void attachDocument(); }}
            onSend={handleSend}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

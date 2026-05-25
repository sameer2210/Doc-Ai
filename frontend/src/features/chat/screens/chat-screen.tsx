import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Alert, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useRef } from 'react';

import { GlassCard } from '@/components/ui/GlassCard';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { AttachmentPreviewBar } from '@/features/chat/components/attachment-preview-bar';
import { ChatComposer } from '@/features/chat/components/chat-composer';
import { ChatMessageList } from '@/features/chat/components/chat-message-list';
import { useChatMessages } from '@/features/chat/hooks/use-chat-messages';
import { useSendMessage } from '@/features/chat/hooks/use-send-message';
import { useUploadAttachment } from '@/features/chat/hooks/use-upload-attachment';
import { useSessionStore } from '@/features/auth/store/session-store';
import { usePredictionStore } from '@/store/prediction-store';

// ─── Build the auto-message text from a cataract prediction result ────────────
function buildConsultationMessage(prediction: string, confidence: number): string {
  const pct = Math.round(confidence * 100);
  const resultLine =
    prediction.toLowerCase().includes('normal') || prediction.toLowerCase().includes('no cataract')
      ? `✅ **Result: ${prediction}** (${pct}% confidence)`
      : `⚠️ **Result: ${prediction}** (${pct}% confidence)`;

  return (
    `I just received my eye scan result from the AI model:\n\n` +
    `${resultLine}\n\n` +
    `Based on this cataract detection result, please provide me with:\n` +
    `1. What this result means for my eye health\n` +
    `2. Ayurvedic perspective and remedies for my eye condition\n` +
    `3. Dietary recommendations to support eye health\n` +
    `4. Lifestyle changes and eye exercises I should follow\n` +
    `5. When I should see an ophthalmologist`
  );
}

export function ChatScreen() {
  const {
    pendingAttachments,
    startUpload,
    removeAttachment,
    clearAttachments,
    isUploading,
  } = useUploadAttachment();

  // ── ML prediction auto-send ─────────────────────────────────────────────────
  const pending = usePredictionStore(state => state.pending);
  const storedChatId = usePredictionStore(state => state.activeChatId);
  const clearPending = usePredictionStore(state => state.clearPending);
  const accessToken = useSessionStore(state => state.accessToken);
  const user = useSessionStore(state => state.user);
  const hydrated = useSessionStore(state => state.hydrated);
  const tabBarHeight = useBottomTabBarHeight();
  const hasSentRef = useRef(false);

  // Prefer chatId returned by ML/upload flow. Fall back to user's default chat only when needed.
  const activeChatId = pending?.chatId ?? storedChatId ?? 'default';

  console.log('[ChatScreen] Active chat context:', {
    activeChatId,
    pendingChatId: pending?.chatId ?? null,
    storedChatId: storedChatId ?? null,
    hydrated,
    hasAccessToken: Boolean(accessToken),
    tokenPreview: accessToken ? `${accessToken.slice(0, 8)}...` : 'none',
  });

  const {
    messages,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useChatMessages(activeChatId);
  const sendMessageMutation = useSendMessage(activeChatId);

  useEffect(() => {
    if (!hydrated || !accessToken || !activeChatId) return;
    console.log('[ChatScreen] Refetching messages for chatId:', activeChatId);
    void refetch();
  }, [accessToken, activeChatId, hydrated, refetch]);

  useEffect(() => {
    if (!pending || hasSentRef.current || sendMessageMutation.isPending) return;

    // Only auto-send once per prediction result
    hasSentRef.current = true;
    const consultationMsg = buildConsultationMessage(pending.prediction, pending.confidence);

    sendMessageMutation.mutate(
      { content: consultationMsg, attachments: [] },
      {
        onSuccess: () => {
          clearPending();
          clearAttachments();
        },
        onError: () => {
          // On failure, keep the prediction so user can retry manually
          hasSentRef.current = false;
        },
      },
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, activeChatId]);

  // ─── Reset sentinel when new prediction comes in ────────────────────────────
  useEffect(() => {
    if (pending) {
      hasSentRef.current = false;
    }
  }, [pending]);

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
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name?.split(' ')[0] ?? 'there';

  const attachmentHint = (() => {
    if (!pendingAttachments.length) return null;
    const uploading = pendingAttachments.filter(a => a.uploadStatus === 'uploading').length;
    const failed = pendingAttachments.filter(a => a.uploadStatus === 'failed').length;
    if (uploading > 0) return `Uploading ${uploading} file${uploading > 1 ? 's' : ''}...`;
    if (failed > 0) return `${failed} upload${failed > 1 ? 's' : ''} failed. Remove failed items.`;
    return null;
  })();

  return (
    <SafeAreaView className="flex-1 bg-[#121212]" edges={['top', 'left', 'right']}>
      <View className="flex-1" style={{ paddingBottom: tabBarHeight + 8 }}>
        <ScreenBackground />

        <Animated.View entering={FadeInDown.duration(520)} className="px-5 pb-3 pt-5">
          <GlassCard style={{ padding: 16, backgroundColor: 'rgba(28, 28, 28, 0.92)' }}>
            <View className="flex-row items-center gap-2">
              <View className="h-9 w-9 items-center justify-center rounded-2xl bg-[#2B2118]">
                <Ionicons name="sparkles" size={16} color="#E39A5E" />
              </View>
              <View className="flex-1">
                <Text className="text-[36px] font-semibold text-[#E8D1BA]">{`${greeting}, ${firstName}`}</Text>
                <Text className="mt-0.5 text-xs text-[#A4A4A4]">
                  {pending
                    ? '🔬 Analyzing your eye scan result…'
                    : 'How can I help you today?'}
                </Text>
              </View>
            </View>
          </GlassCard>
        </Animated.View>

        <View className="mx-4 mb-3 flex-1 overflow-hidden rounded-[24px] border border-[#363636] bg-[#1D1D1D]">
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

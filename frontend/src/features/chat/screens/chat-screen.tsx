import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { ErrorNotice } from '@/components/ui/ErrorNotice';
import { useSessionStore } from '@/features/auth/store/session-store';
import { AttachmentPreviewBar } from '@/features/chat/components/attachment-preview-bar';
import { ChatComposer } from '@/features/chat/components/chat-composer';
import { ChatMessageList } from '@/features/chat/components/chat-message-list';
import { useChatMessages } from '@/features/chat/hooks/use-chat-messages';
import { useSendMessage, useStartConsultation } from '@/features/chat/hooks/use-send-message';
import { useUploadAttachment } from '@/features/chat/hooks/use-upload-attachment';
import { usePredictionStore } from '@/store/prediction-store';

export function ChatScreen() {
  const {
    pendingAttachments,
    startUpload,
    removeAttachment,
    clearAttachments,
    isUploading,
    uploadError,
    clearUploadError,
  } = useUploadAttachment();
  const [chatError, setChatError] = useState<unknown>(null);

  // ── ML prediction auto-send ─────────────────────────────────────────────────
  const pending = usePredictionStore(state => state.pending);
  const storedChatId = usePredictionStore(state => state.activeChatId);
  const clearPending = usePredictionStore(state => state.clearPending);
  const pendingMessage = usePredictionStore(state => state.pendingMessage);
  const setPendingMessage = usePredictionStore(state => state.setPendingMessage);
  const accessToken = useSessionStore(state => state.accessToken);
  const user = useSessionStore(state => state.user);
  const hydrated = useSessionStore(state => state.hydrated);
  const insets = useSafeAreaInsets();
  const hasSentRef = useRef(false);
  const autoSendMessageRef = useRef<string | null>(null);

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

  const { messages, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useChatMessages(activeChatId);
  const sendMessageMutation = useSendMessage(activeChatId);
  const startConsultationMutation = useStartConsultation(activeChatId);

  // ── Home screen query auto-send effect ─────────────────────────────────────
  useEffect(() => {
    if (
      !hydrated ||
      !accessToken ||
      !activeChatId ||
      !pendingMessage ||
      sendMessageMutation.isPending
    )
      return;
    if (autoSendMessageRef.current === pendingMessage) return;

    const messageToSend = pendingMessage;
    autoSendMessageRef.current = messageToSend;
    // Clear immediately to prevent double sends
    setPendingMessage(null);

    console.log('[ChatScreen] Auto-sending home screen query:', messageToSend);
    sendMessageMutation.mutate(
      { content: messageToSend, attachments: [] },
      {
        onSettled: () => {
          autoSendMessageRef.current = null;
        },
      }
    );
  }, [hydrated, accessToken, activeChatId, pendingMessage, sendMessageMutation, setPendingMessage]);

  useEffect(() => {
    if (!pending || hasSentRef.current || startConsultationMutation.isPending) return;

    // Only auto-send once per prediction result
    hasSentRef.current = true;

    startConsultationMutation.mutate(
      { prediction: pending.prediction, confidence: pending.confidence },
      {
        onSuccess: () => {
          clearPending();
          clearAttachments();
          setChatError(null);
        },
        onError: error => {
          // On failure, keep the prediction so user can retry manually
          hasSentRef.current = false;
          setChatError(error);
        },
      }
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
      setChatError(new Error('Media library permission is needed to select images.'));
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
    setChatError(null);
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
    setChatError(null);
    startUpload({
      localUri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType ?? 'application/octet-stream',
      size: asset.size ?? 0,
    });
  }

  function handleSend(text: string) {
    if (sendMessageMutation.isPending || isUploading) {
      return;
    }

    if (pendingAttachments.some(a => a.uploadStatus === 'failed')) {
      setChatError(new Error('Remove failed uploads before sending this message.'));
      return;
    }

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
      {
        onSuccess: () => {
          clearAttachments();
          setChatError(null);
        },
        onError: error => {
          setChatError(error);
        },
      }
    );
  }

  const isSendBlocked = sendMessageMutation.isPending || isUploading;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const hasStartedConversation =
    messages.length > 0 || sendMessageMutation.isPending || Boolean(pending);
  const showHeroState = !hasStartedConversation && !isLoading;
  const orbOpacity = useSharedValue(0.5);
  const orbScale = useSharedValue(1);

  const attachmentHint = (() => {
    if (!pendingAttachments.length) return null;
    const uploading = pendingAttachments.filter(a => a.uploadStatus === 'uploading').length;
    const failed = pendingAttachments.filter(a => a.uploadStatus === 'failed').length;
    if (uploading > 0) return `Uploading ${uploading} file${uploading > 1 ? 's' : ''}...`;
    if (failed > 0) return `${failed} upload${failed > 1 ? 's' : ''} failed. Remove failed items.`;
    return null;
  })();
  const visibleError = chatError ?? uploadError ?? sendMessageMutation.error ?? startConsultationMutation.error;

  function dismissVisibleError() {
    setChatError(null);
    clearUploadError();
    sendMessageMutation.reset();
    startConsultationMutation.reset();
  }

  useEffect(() => {
    orbOpacity.value = withRepeat(
      withSequence(withTiming(0.85, { duration: 1800 }), withTiming(0.45, { duration: 1800 })),
      -1,
      true
    );
    orbScale.value = withRepeat(
      withSequence(withTiming(1.08, { duration: 2400 }), withTiming(1, { duration: 2400 })),
      -1,
      true
    );
  }, [orbOpacity, orbScale]);

  const heroSparkleStyle = useAnimatedStyle(() => ({
    opacity: orbOpacity.value,
    transform: [{ scale: orbScale.value }],
  }));

  return (
    <SafeAreaView className="flex-1 bg-[#030406]" edges={['top', 'left', 'right']}>
      <View className="flex-1" style={{ paddingBottom: insets.bottom + 8 }}>
        <ScreenBackground />

        <Animated.View
          entering={FadeIn.duration(420)}
          className="mx-4 mb-3 mt-3 flex-1 overflow-hidden  bg-[#0A0D14]"
        >
          <LinearGradient
            colors={['rgba(8, 13, 26, 0.85)', 'rgba(6, 10, 20, 0.95)', 'rgba(12, 27, 70, 0.55)']}
            style={{ flex: 1 }}
          >
            <Animated.View
              entering={FadeInDown.duration(450)}
              className="flex-row items-center justify-between px-5 pb-3 pt-4"
            >
              <View className="flex-row items-center gap-3">
                <View>
                  <Text className="text-base font-semibold text-[#E5ECFA]">Spanda Gemini</Text>
                  <Text className="text-xs text-[#8FA2C7]">{`${greeting}, ${firstName}`}</Text>
                </View>
              </View>
            </Animated.View>

            <KeyboardAvoidingView
              className="flex-1"
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? insets.bottom + 12 : 0}
            >
              <View className="flex-1 px-1">
                {showHeroState ? (
                  <View className="flex-1 items-center justify-center px-8">
                    <Animated.View
                      style={heroSparkleStyle}
                      className="mb-4 h-10 w-10 items-center justify-center rounded-full bg-[#131F38]"
                    >
                      <Ionicons name="sparkles" size={20} color="#AFC8FF" />
                    </Animated.View>
                    <Text className="text-center text-4xl font-semibold text-[#E8EEF9]">
                      Tag, you&apos;re it
                    </Text>
                    <Text className="mt-3 text-center text-sm text-[#8CA0C4]">
                      Start a conversation or upload an eye image from Home.
                    </Text>
                  </View>
                ) : (
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
                )}
              </View>

              <View className="px-3 pb-3">
                <AttachmentPreviewBar
                  attachments={pendingAttachments}
                  onRemove={removeAttachment}
                />

                {attachmentHint ? (
                  <View className="mb-2 mt-1 rounded-xl border border-[#2E4267] bg-[#14284A] px-3 py-1.5">
                    <Text numberOfLines={1} className="text-xs font-semibold text-[#A8C2EF]">
                      {attachmentHint}
                    </Text>
                  </View>
                ) : null}

                {visibleError ? (
                  <ErrorNotice
                    error={visibleError}
                    onDismiss={dismissVisibleError}
                    compact
                    style={{ marginBottom: 8, marginTop: 4 }}
                  />
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
            </KeyboardAvoidingView>
          </LinearGradient>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

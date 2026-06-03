import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Network from 'expo-network';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
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

import { ErrorNotice } from '@/components/ui/ErrorNotice';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { useSessionStore } from '@/features/auth/store/session-store';
import { AttachmentPreviewBar } from '@/features/chat/components/attachment-preview-bar';
import { ChatComposer } from '@/features/chat/components/chat-composer';
import { ChatMessageList } from '@/features/chat/components/chat-message-list';
import { useChatMessages } from '@/features/chat/hooks/use-chat-messages';
import { useSendMessage, useStartConsultation } from '@/features/chat/hooks/use-send-message';
import { useUploadAttachment } from '@/features/chat/hooks/use-upload-attachment';
import { AnalysisProgress } from '@/features/upload/components/analysis-progress';
import { useUploadWorkflowStore } from '@/features/upload/store/upload-workflow-store';
import { createWorkingImageForCrop } from '@/features/upload/utils/image-cropper';
import { IMAGE_NOT_FOUND_MESSAGE, NO_INTERNET_MESSAGE } from '@/shared/uploads/upload-errors';
import {
  resolveUploadImageMetadata,
  validateUploadImageSelection,
} from '@/shared/uploads/upload-validation';
import { usePredictionStore } from '@/store/prediction-store';

const IMAGE_CROP_FLOW_LOG_PREFIX = '[EyeCropFlow]';

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
  const workflow = useUploadWorkflowStore(state => state);
  const insets = useSafeAreaInsets();
  const hasSentRef = useRef(false);
  const autoSendMessageRef = useRef<string | null>(null);
  const handledWorkflowIdRef = useRef<string | null>(null);
  const lastUploadPercentRef = useRef<number | null>(null);

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
  }, [pending, activeChatId, startConsultationMutation, clearPending, clearAttachments]);

  // ─── Reset sentinel when new prediction comes in ────────────────────────────
  useEffect(() => {
    if (pending) {
      hasSentRef.current = false;
    }
  }, [pending]);

  useEffect(() => {
    if (
      workflow.origin !== 'chat' ||
      workflow.uploadStatus !== 'ready' ||
      !workflow.optimizedImage ||
      !workflow.flowId ||
      handledWorkflowIdRef.current === workflow.flowId
    ) {
      return;
    }

    handledWorkflowIdRef.current = workflow.flowId;
    workflow.setUploadStatus('uploading');
    workflow.setCurrentProgressState('uploading_image');
    workflow.setUploadProgressPercent(0);
    setChatError(null);
    console.log(IMAGE_CROP_FLOW_LOG_PREFIX, 'upload-start', {
      flowId: workflow.flowId,
      origin: workflow.origin,
    });

    startUpload({
      localUri: workflow.optimizedImage.uri,
      name: workflow.optimizedImage.name,
      mimeType: workflow.optimizedImage.mimeType,
      size: workflow.optimizedImage.fileSizeBytes,
    });
  }, [
    startUpload,
    workflow.flowId,
    workflow.optimizedImage,
    workflow.origin,
    workflow.uploadStatus,
    workflow,
  ]);

  useEffect(() => {
    if (
      workflow.origin !== 'chat' ||
      workflow.uploadStatus !== 'uploading' ||
      !workflow.optimizedImage
    ) {
      return;
    }

    const optimizedImage = workflow.optimizedImage;
    const activeAttachment = pendingAttachments.find(
      attachment =>
        attachment.localUri === optimizedImage.uri && attachment.name === optimizedImage.name
    );

    if (!activeAttachment) {
      return;
    }

    if (typeof activeAttachment.progress === 'number') {
      if (lastUploadPercentRef.current !== activeAttachment.progress) {
        lastUploadPercentRef.current = activeAttachment.progress;
        workflow.setUploadProgressPercent(activeAttachment.progress);
      }
    }

    if (activeAttachment.uploadStatus === 'success') {
      lastUploadPercentRef.current = 100;
      workflow.setUploadProgressPercent(100);
      workflow.setCurrentProgressState('image_uploaded');
      workflow.setUploadStatus('complete');
      console.log(IMAGE_CROP_FLOW_LOG_PREFIX, 'upload-complete', {
        flowId: workflow.flowId,
        origin: workflow.origin,
      });
      workflow.clearWorkflow();
      handledWorkflowIdRef.current = null;
      lastUploadPercentRef.current = null;
      return;
    }

    if (activeAttachment.uploadStatus === 'failed') {
      workflow.setLastErrorCode('UPLOAD_FAILED');
      workflow.setUploadStatus('failed');
      workflow.setCurrentProgressState('image_uploaded');
      setChatError(new Error('Image upload failed. Please try again.'));
      workflow.clearWorkflow();
      handledWorkflowIdRef.current = null;
      lastUploadPercentRef.current = null;
    }
  }, [
    pendingAttachments,
    workflow.optimizedImage,
    workflow.origin,
    workflow.uploadStatus,
    workflow,
  ]);

  async function getValidatedWorkflowImage(asset: ImagePicker.ImagePickerAsset) {
    console.log(IMAGE_CROP_FLOW_LOG_PREFIX, 'chat:getValidatedWorkflowImage:start', {
      uri: asset.uri,
      mimeType: asset.mimeType,
      fileSize: asset.fileSize,
    });
    console.log(IMAGE_CROP_FLOW_LOG_PREFIX, 'chat:getValidatedWorkflowImage:network:start');
    const networkState = await Network.getNetworkStateAsync();
    console.log(IMAGE_CROP_FLOW_LOG_PREFIX, 'chat:getValidatedWorkflowImage:network:done', {
      isConnected: networkState.isConnected,
      isInternetReachable: networkState.isInternetReachable,
    });
    if (!networkState.isConnected) {
      throw new Error(NO_INTERNET_MESSAGE);
    }

    console.log(IMAGE_CROP_FLOW_LOG_PREFIX, 'chat:getValidatedWorkflowImage:metadata:start');
    const metadata = await resolveUploadImageMetadata(asset.uri, asset.fileSize);
    console.log(
      IMAGE_CROP_FLOW_LOG_PREFIX,
      'chat:getValidatedWorkflowImage:metadata:done',
      metadata
    );
    if (!metadata.exists) {
      throw new Error(IMAGE_NOT_FOUND_MESSAGE);
    }

    console.log(IMAGE_CROP_FLOW_LOG_PREFIX, 'chat:getValidatedWorkflowImage:validation:start');
    const validation = validateUploadImageSelection({
      uri: asset.uri,
      mimeType: asset.mimeType,
      fileSizeBytes: metadata.fileSizeBytes,
      width: metadata.width,
      height: metadata.height,
    });
    console.log(
      IMAGE_CROP_FLOW_LOG_PREFIX,
      'chat:getValidatedWorkflowImage:validation:done',
      validation
    );

    if (!validation.valid) {
      throw new Error(validation.message);
    }

    return {
      uri: asset.uri,
      name: asset.fileName ?? `image-${Date.now()}.jpg`,
      mimeType: validation.mimeType,
      fileSizeBytes: validation.fileSizeBytes,
      width: validation.width,
      height: validation.height,
    };
  }

  async function openWorkflowCropScreen(asset: ImagePicker.ImagePickerAsset) {
    setChatError(null);

    try {
      console.log(IMAGE_CROP_FLOW_LOG_PREFIX, 'chat:openWorkflowCropScreen:start', {
        uri: asset.uri,
        name: asset.fileName,
      });
      const originalImage = await getValidatedWorkflowImage(asset);
      const flowId = `chat_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

      workflow.startWorkflow({
        flowId,
        origin: 'chat',
        originalImage,
      });
      workflow.setCurrentProgressState('validating_image');
      workflow.setCurrentProgressState('checking_internet');
      workflow.setCurrentProgressState('preparing_image');
      workflow.setUploadStatus('preparing');

      console.log(
        IMAGE_CROP_FLOW_LOG_PREFIX,
        'chat:openWorkflowCropScreen:createWorkingImage:start',
        {
          flowId,
        }
      );
      const workingImage = await createWorkingImageForCrop(originalImage);
      console.log(
        IMAGE_CROP_FLOW_LOG_PREFIX,
        'chat:openWorkflowCropScreen:createWorkingImage:done',
        {
          flowId,
          uri: workingImage.uri,
        }
      );
      workflow.setWorkingImage(workingImage);

      console.log(IMAGE_CROP_FLOW_LOG_PREFIX, 'chat:openWorkflowCropScreen:navigate:start', {
        flowId,
      });
      router.push('/eye-crop' as never);
      console.log(IMAGE_CROP_FLOW_LOG_PREFIX, 'chat:openWorkflowCropScreen:navigate:done', {
        flowId,
      });
    } catch (error) {
      console.log(IMAGE_CROP_FLOW_LOG_PREFIX, 'chat:openWorkflowCropScreen:error', error);
      workflow.clearWorkflow();
      setChatError(error instanceof Error ? error : new Error('Invalid image file'));
    }
  }

  async function attachImage() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setChatError(new Error('Media library permission is needed to select images.'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        selectionLimit: 1,
      });

      if (result.canceled || !result.assets.length) return;

      await openWorkflowCropScreen(result.assets[0]);
    } catch (error) {
      setChatError(error instanceof Error ? error : new Error('Invalid image file'));
    }
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
  const visibleError =
    chatError ?? uploadError ?? sendMessageMutation.error ?? startConsultationMutation.error;

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

        <Animated.View entering={FadeIn.duration(420)} className=" flex-1 overflow-hidden  ">
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
                <Text className="mt-2 text-center text-sm text-[#8CA0C4]">
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

          <KeyboardStickyView className="px-2">
            <AttachmentPreviewBar attachments={pendingAttachments} onRemove={removeAttachment} />

            {attachmentHint ? (
              <View className="mb-2 mt-1 rounded-xl border border-[#2E4267] bg-[#14284A] px-3 py-1.5">
                <Text numberOfLines={1} className="text-xs font-semibold text-[#A8C2EF]">
                  {attachmentHint}
                </Text>
              </View>
            ) : null}

            {workflow.origin === 'chat' &&
            (workflow.currentProgressState !== 'image_selected' ||
              workflow.uploadStatus !== 'idle') ? (
              <View className="mb-2">
                <AnalysisProgress
                  activeStage={workflow.currentProgressState}
                  uploadPercent={workflow.uploadProgressPercent}
                  compact
                />
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
              onSend={handleSend}
            />
          </KeyboardStickyView>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

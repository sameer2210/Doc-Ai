import { type FlashListRef } from '@shopify/flash-list';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { ErrorNotice } from '@/components/ui/ErrorNotice';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { useSessionStore } from '@/features/auth/store/session-store';
import { AttachmentPreviewBar } from '@/features/chat/components/attachment-preview-bar';
import { ChatComposer } from '@/features/chat/components/chat-composer';
import { ChatMessageList } from '@/features/chat/components/chat-message-list';
import { useChatMessages } from '@/features/chat/hooks/use-chat-messages';
import { useSendMessage } from '@/features/chat/hooks/use-send-message';
import { useConsultationTrigger } from '@/features/chat/hooks/use-consultation-trigger';
import { useUploadAttachment } from '@/features/chat/hooks/use-upload-attachment';
import { useChatImageWorkflow } from '@/features/chat/hooks/use-chat-image-workflow';
import { AnalysisProgress } from '@/features/upload/components/analysis-progress';
import { useUploadWorkflowStore } from '@/features/upload/store/upload-workflow-store';
import { usePredictionStore } from '@/store/prediction-store';
import type { ChatMessage } from '@/features/chat/types/chat-types';

import { useTheme } from '@/theme';
import { useChatStore } from '../store/chat-store';
import { useCreateChatMutation, useDeleteChatMutation } from '../hooks/use-chats';
import { ChatHeader } from '../components/chat-header';
import { ChatOverflowMenu, type MenuAction } from '../components/chat-overflow-menu';
import { ChatEmptyState } from '../components/chat-empty-state';
import { ChatUploadStatus } from '../components/chat-upload-status';

export function ChatScreen() {
  const { theme } = useTheme();

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
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  // ── Chat Store ─────────────────────────────────────────────────────────────
  const { activeChatId: storeChatId, setActiveChatId } = useChatStore();

  // Mutations
  const createChatMutation = useCreateChatMutation();
  const deleteChatMutation = useDeleteChatMutation();

  // ── ML prediction auto-send ─────────────────────────────────────────────────
  const pending = usePredictionStore(state => state.pending);
  const pendingMessage = usePredictionStore(state => state.pendingMessage);
  const setPendingMessage = usePredictionStore(state => state.setPendingMessage);
  const accessToken = useSessionStore(state => state.accessToken);
  const user = useSessionStore(state => state.user);
  const hydrated = useSessionStore(state => state.hydrated);
  const workflow = useUploadWorkflowStore(state => state);
  const insets = useSafeAreaInsets();
  const autoSendMessageRef = useRef<string | null>(null);
  const { attachImage } = useChatImageWorkflow({
    startUpload,
    pendingAttachments,
    setChatError,
  });
  const isFocused = useIsFocused();
  const messageListRef = useRef<FlashListRef<ChatMessage>>(null);
  const pinnedLatestOnceRef = useRef(false);

  // Prefer chatId returned by ML/upload flow. Fall back to store or 'default'.
  const activeChatId = pending?.chatId ?? storeChatId ?? 'default';

  console.log('[ChatScreen] Active chat context:', {
    activeChatId,
    pendingChatId: pending?.chatId ?? null,
    storeChatId: storeChatId ?? null,
    hydrated,
    hasAccessToken: Boolean(accessToken),
  });

  const {
    messages,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useChatMessages(activeChatId);

  const sendMessageMutation = useSendMessage(activeChatId);
  const { startConsultationMutation, handleRetryConsultation } = useConsultationTrigger({
    activeChatId,
    clearAttachments,
    setChatError,
  });

  useEffect(() => {
    if (isFocused) {
      pinnedLatestOnceRef.current = false;
    }
  }, [activeChatId, isFocused]);

  useEffect(() => {
    if (!isFocused || isLoading || !messages.length || pinnedLatestOnceRef.current) {
      return;
    }

    messageListRef.current?.scrollToEnd({ animated: false });
    pinnedLatestOnceRef.current = true;
  }, [activeChatId, isFocused, isLoading, messages.length]);

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

  console.log('[CONSULTATION_TRIGGER]', Date.now(), {
    prediction: pending?.prediction,
    confidence: pending?.confidence,
    isPending: startConsultationMutation.isPending,
  });

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

  const attachmentHint = (() => {
    if (!pendingAttachments.length) return null;
    const uploading = pendingAttachments.filter(a => a.uploadStatus === 'uploading').length;
    const failed = pendingAttachments.filter(a => a.uploadStatus === 'failed').length;
    if (uploading > 0) return `Uploading ${uploading} file${uploading > 1 ? 's' : ''}...`;
    if (failed > 0) return `${failed} upload${failed > 1 ? 's' : ''} failed. Remove failed items.`;
    return null;
  })();

  const visibleError = chatError ?? uploadError ?? sendMessageMutation.error ?? startConsultationMutation.error;

  console.log('VISIBLE_ERROR_DEBUG', visibleError);

  function dismissVisibleError() {
    setChatError(null);
    clearUploadError();
    sendMessageMutation.reset();
    startConsultationMutation.reset();
  }

  // ── Overflow Menu Configuration ─────────────────────────────────────────────
  const menuActions: MenuAction[] = [
    {
      label: 'New Chat',
      icon: 'add-outline',
      onPress: () => {
        createChatMutation.mutate(undefined, {
          onSuccess: (newChat) => {
            setActiveChatId(newChat.id);
            clearAttachments();
            setChatError(null);
          },
          onError: (err) => {
            setChatError(err);
          },
        });
      },
    },
    {
      label: 'History',
      icon: 'time-outline',
      onPress: () => {
        router.push('/chat-history' as any);
      },
    },
    {
      label: 'Clear Chat',
      icon: 'trash-outline',
      isDestructive: true,
      onPress: () => {
        if (!activeChatId || activeChatId === 'default') {
          setActiveChatId(null);
          clearAttachments();
          setChatError(null);
          return;
        }
        deleteChatMutation.mutate(activeChatId, {
          onSuccess: () => {
            setActiveChatId(null);
            clearAttachments();
            setChatError(null);
          },
          onError: (err) => {
            setChatError(err);
          },
        });
      },
    },
  ];

  const headerTitle = activeChatId === 'default' ? 'Spanda Gemini' : 'Spanda AI Consultation';
  const headerSubtitle = `${greeting}, ${firstName}`;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.colors.background.base }}
      edges={['top', 'left', 'right']}
    >
      <View className="flex-1" style={{ paddingBottom: insets.bottom + 8 }}>
        <ScreenBackground />

        <Animated.View entering={FadeIn.duration(420)} className="flex-1 overflow-hidden">
          {/* ── Chat Header ── */}
          <ChatHeader
            title={headerTitle}
            subtitle={headerSubtitle}
            onMenuPress={rect => {
              setMenuAnchor(rect);
              setMenuVisible(true);
            }}
            showBackButton={activeChatId !== 'default' && activeChatId !== null}
            onBackPress={() => setActiveChatId(null)}
          />

          <View className="flex-1 px-1">
            {showHeroState ? (
              <ChatEmptyState onSelectPrompt={handleSend} />
            ) : (
              <View className="flex-1">
                <ChatMessageList
                  ref={messageListRef}
                  messages={messages}
                  isLoading={isLoading}
                  isFetchingNextPage={isFetchingNextPage}
                  onStartReached={() => {
                    if (hasNextPage) void fetchNextPage();
                  }}
                />
              </View>
            )}
          </View>

          <KeyboardStickyView className="px-2">
            <AttachmentPreviewBar attachments={pendingAttachments} onRemove={removeAttachment} />

            <ChatUploadStatus message={attachmentHint} />

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
                actionLabel={startConsultationMutation.error ? 'Retry' : undefined}
                onAction={startConsultationMutation.error ? handleRetryConsultation : undefined}
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

      {/* ── 3-Dot Overflow Menu Modal ── */}
      <ChatOverflowMenu
        visible={menuVisible}
        onClose={() => {
          setMenuVisible(false);
          setMenuAnchor(null);
        }}
        actions={menuActions}
        anchorRect={menuAnchor}
      />
    </SafeAreaView>
  );
}

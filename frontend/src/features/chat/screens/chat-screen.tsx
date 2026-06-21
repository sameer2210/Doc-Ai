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
import { ChatComposer } from '@/features/chat/components/chat-composer';
import { ChatMessageList } from '@/features/chat/components/chat-message-list';
import { useChatMessages } from '@/features/chat/hooks/use-chat-messages';
import { useSendMessage } from '@/features/chat/hooks/use-send-message';
import { useConsultationTrigger } from '@/features/chat/hooks/use-consultation-trigger';
import { useChatImageWorkflow } from '@/features/chat/hooks/use-chat-image-workflow';
import { usePredictionStore } from '@/store/prediction-store';
import type { ChatMessage } from '@/features/chat/types/chat-types';

import { useTheme } from '@/theme';
import { useChatStore } from '../store/chat-store';
import { useCreateChatMutation, useDeleteChatMutation } from '../hooks/use-chats';
import { ChatHeader } from '../components/chat-header';
import { ChatOverflowMenu, type MenuAction } from '../components/chat-overflow-menu';
import { ChatEmptyState } from '../components/chat-empty-state';

export function ChatScreen() {
  const { theme } = useTheme();

  const [chatError, setChatError] = useState<unknown>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  // ── Chat Store ─────────────────────────────────────────────────────────────
  const { activeChatId: storeChatId, setActiveChatId } = useChatStore();

  // Single source of truth is activeChatId from the store (falls back to 'default').
  const activeChatId = storeChatId ?? 'default';

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
  const insets = useSafeAreaInsets();
  const autoSendMessageRef = useRef<string | null>(null);
  const { attachImage } = useChatImageWorkflow({
    setChatError,
    chatId: activeChatId,
  });
  const isFocused = useIsFocused();
  const messageListRef = useRef<FlashListRef<ChatMessage>>(null);
  const pinnedLatestOnceRef = useRef(false);



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

    sendMessageMutation.mutate(
      { content: messageToSend, attachments: [] },
      {
        onSettled: () => {
          autoSendMessageRef.current = null;
        },
      }
    );
  }, [hydrated, accessToken, activeChatId, pendingMessage, sendMessageMutation, setPendingMessage]);



  function handleSend(text: string) {
    if (sendMessageMutation.isPending) {
      return;
    }

    sendMessageMutation.mutate(
      { content: text, attachments: [] },
      {
        onSuccess: () => {
          setChatError(null);
        },
        onError: error => {
          setChatError(error);
        },
      }
    );
  }

  const isSendBlocked = sendMessageMutation.isPending || createChatMutation.isPending;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const hasStartedConversation =
    messages.length > 0 || sendMessageMutation.isPending || Boolean(pending);
  const showHeroState = !hasStartedConversation && !isLoading;
  const visibleError = chatError ?? sendMessageMutation.error ?? startConsultationMutation.error;


  function dismissVisibleError() {
    setChatError(null);
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
        router.push('/chat-history');
      },
    },
    {
      label: 'Clear Chat',
      icon: 'trash-outline',
      isDestructive: true,
      onPress: () => {
        if (!activeChatId || activeChatId === 'default') {
          setActiveChatId(null);
          setChatError(null);
          return;
        }
        deleteChatMutation.mutate(activeChatId, {
          onSuccess: () => {
            setActiveChatId(null);
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
                if (isSendBlocked) return;
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

import React from 'react';
import { ScrollView, StyleSheet, View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { isToday, isYesterday, subDays, isAfter } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard } from '@/components/ui/GlassCard';
import { PressableScale } from '@/components/ui/PressableScale';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { useTheme } from '@/theme';
import { ThemeText } from '@/components/ui/theme/ThemeText';
import { ThemeDivider } from '@/components/ui/theme/ThemeDivider';
import { ThemeSurface } from '@/components/ui/theme/ThemeSurface';
import { useChatsList, useDeleteChatMutation } from '../hooks/use-chats';
import { useChatStore } from '../store/chat-store';
import { ChatHistoryItem } from '../components/chat-history-item';
import { ChatSectionHeader } from '../components/chat-section-header';
import type { ChatSessionInfo } from '../api/chat-api';

export function ChatHistoryScreen() {
  const { theme, isDark } = useTheme();
  const { activeChatId, setActiveChatId } = useChatStore();

  const { data: sessions = [], isLoading } = useChatsList();
  const deleteChatMutation = useDeleteChatMutation();

  // Categorize sessions into timeframes
  const now = new Date();
  const sevenDaysAgo = subDays(now, 7);

  const groups = {
    today: [] as ChatSessionInfo[],
    yesterday: [] as ChatSessionInfo[],
    last7Days: [] as ChatSessionInfo[],
    older: [] as ChatSessionInfo[],
  };

  sessions.forEach((session) => {
    const date = new Date(session.updatedAt);
    if (isToday(date)) {
      groups.today.push(session);
    } else if (isYesterday(date)) {
      groups.yesterday.push(session);
    } else if (isAfter(date, sevenDaysAgo)) {
      groups.last7Days.push(session);
    } else {
      groups.older.push(session);
    }
  });

  const handleSelectSession = (sessionId: string) => {
    setActiveChatId(sessionId);
    router.push('/chat');
  };

  const handleDeleteSession = (sessionId: string) => {
    deleteChatMutation.mutate(sessionId, {
      onSuccess: () => {
        if (activeChatId === sessionId) {
          setActiveChatId(null);
        }
      },
    });
  };

  const renderGroupSection = (title: string, groupSessions: ChatSessionInfo[]) => {
    if (groupSessions.length === 0) return null;

    return (
      <View style={styles.sectionContainer}>
        <ChatSectionHeader title={title} style={styles.sectionHeader} />
        <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
          {groupSessions.map((session, index) => (
            <React.Fragment key={session.id}>
              {index > 0 && (
                <ThemeDivider style={{ marginVertical: 0, opacity: isDark ? 0.08 : 0.15 }} />
              )}
              <ChatHistoryItem
                session={session}
                onSelect={handleSelectSession}
                onDelete={handleDeleteSession}
              />
            </React.Fragment>
          ))}
        </GlassCard>
      </View>
    );
  };

  const hasAnySessions = sessions.length > 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background.base }} edges={['top']}>
      <View style={styles.flex1}>
        <ScreenBackground />

        {/* ── Header ── */}
        <View
          style={[
            styles.header,
            {
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border.subtle,
            },
          ]}
        >
          <PressableScale onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color={theme.colors.text.primary} />
          </PressableScale>
          <ThemeText
            style={{
              fontSize: 18,
              fontWeight: '700',
              color: theme.colors.text.primary,
            }}
          >
            Chat History
          </ThemeText>
          <View style={styles.headerRightPlaceholder} />
        </View>

        {/* ── Sessions List ── */}
        {isLoading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={theme.colors.accent.primary} />
          </View>
        ) : hasAnySessions ? (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {renderGroupSection('Today', groups.today)}
            {renderGroupSection('Yesterday', groups.yesterday)}
            {renderGroupSection('Last 7 Days', groups.last7Days)}
            {renderGroupSection('Older', groups.older)}
          </ScrollView>
        ) : (
          <View style={styles.emptyContainer}>
            <ThemeSurface
              variant="elevated"
              style={[
                styles.emptyIconWrapper,
                {
                  backgroundColor: theme.colors.border.subtle,
                },
              ]}
            >
              <Ionicons
                name="chatbox-ellipses-outline"
                size={28}
                color={theme.colors.accent.primary}
              />
            </ThemeSurface>
            <ThemeText
              style={{
                fontSize: 20,
                fontWeight: '600',
                color: theme.colors.text.primary,
                marginTop: 16,
              }}
            >
              No Chat History
            </ThemeText>
            <ThemeText
              style={{
                color: theme.colors.text.secondary,
                marginTop: 8,
                textAlign: 'center',
                paddingHorizontal: 32,
              }}
            >
              Archived consultations or chats will appear here after they are saved.
            </ThemeText>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backButton: {
    padding: 4,
    borderRadius: 8,
  },
  headerRightPlaceholder: {
    width: 30,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 10,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  emptyIconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

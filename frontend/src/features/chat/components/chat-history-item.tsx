import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, isToday } from 'date-fns';
import { useTheme } from '@/theme';
import { ThemeText } from '@/components/ui/theme/ThemeText';
import { ThemeSurface } from '@/components/ui/theme/ThemeSurface';
import { PressableScale } from '@/components/ui/PressableScale';
import type { ChatSessionInfo } from '../api/chat-api';

interface ChatHistoryItemProps {
  session: ChatSessionInfo;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ChatHistoryItem({ session, onSelect, onDelete }: ChatHistoryItemProps) {
  const { theme } = useTheme();

  const displayTime = format(new Date(session.updatedAt), 'p');
  const displayDate = format(new Date(session.updatedAt), 'MMM d');
  const isTodaySession = isToday(new Date(session.updatedAt));

  return (
    <PressableScale
      onPress={() => onSelect(session.id)}
      style={styles.sessionItem}
    >
      <ThemeSurface
        variant="elevated"
        style={[
          styles.iconWrapper,
          {
            backgroundColor: theme.colors.border.subtle,
          },
        ]}
      >
        <Ionicons
          name="chatbubble-ellipses-outline"
          size={20}
          color={theme.colors.accent.primary}
        />
      </ThemeSurface>

      <View style={styles.contentWrapper}>
        <View style={styles.titleRow}>
          <View style={styles.titleTextContainer}>
            <ThemeText
              numberOfLines={1}
              style={{
                fontFamily: 'SpaceGrotesk_700Bold',
                fontSize: 16,
                fontWeight: '700',
                color: theme.colors.text.primary,
                flexShrink: 1,
              }}
            >
              {session.title}
            </ThemeText>
            {session.messageCount > 0 && (
              <View
                style={[
                  styles.countBadge,
                  {
                    backgroundColor: theme.colors.border.subtle,
                  },
                ]}
              >
                <ThemeText
                  style={{
                    fontSize: 10,
                    fontWeight: '700',
                    color: theme.colors.accent.primary,
                  }}
                >
                  {session.messageCount}
                </ThemeText>
              </View>
            )}
          </View>
          <ThemeText
            variant="caption"
            style={{
              color: theme.colors.text.tertiary,
              fontSize: 12,
              fontWeight: '500',
            }}
          >
            {isTodaySession ? displayTime : displayDate}
          </ThemeText>
        </View>

        <View style={styles.previewRow}>
          <ThemeText
            variant="caption"
            numberOfLines={1}
            style={{
              color: theme.colors.text.secondary,
              fontSize: 13,
              flex: 1,
              marginRight: 8,
            }}
          >
            {session.lastMessage || 'New consultation started'}
          </ThemeText>
          
          <PressableScale
            onPress={() => onDelete(session.id)}
            style={styles.deleteButton}
          >
            <Ionicons
              name="trash-outline"
              size={14}
              color={theme.colors.text.danger}
            />
          </PressableScale>
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 18,
  } as ViewStyle,
  iconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  } as ViewStyle,
  contentWrapper: {
    flex: 1,
  } as ViewStyle,
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  } as ViewStyle,
  titleTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  } as ViewStyle,
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 8,
    marginLeft: 6,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  } as ViewStyle,
  deleteButton: {
    padding: 4,
  } as ViewStyle,
});

import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { getUserFacingError } from '@/shared/errors/user-facing-error';

type ErrorNoticeProps = {
  error?: unknown;
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  compact?: boolean;
  style?: ViewStyle;
};

export function ErrorNotice({
  error,
  title,
  message,
  actionLabel,
  onAction,
  onDismiss,
  compact = false,
  style,
}: ErrorNoticeProps) {
  const normalized = getUserFacingError(error, { title, message });
  const displayTitle = title ?? normalized.title;
  const displayMessage = message ?? normalized.message;

  return (
    <View style={[styles.container, compact && styles.compactContainer, style]} accessibilityRole="alert">
      <View style={styles.iconWrap}>
        <Ionicons name="alert-circle" size={compact ? 15 : 18} color="#FFB4A8" />
      </View>

      <View style={styles.copy}>
        <Text style={[styles.title, compact && styles.compactTitle]}>{displayTitle}</Text>
        <Text style={[styles.message, compact && styles.compactMessage]}>{displayMessage}</Text>
      </View>

      {actionLabel && onAction ? (
        <Pressable onPress={onAction} style={styles.action}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}

      {onDismiss ? (
        <Pressable onPress={onDismiss} style={styles.dismiss} hitSlop={8}>
          <Ionicons name="close" size={16} color="#FFC7C2" />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 123, 123, 0.38)',
    backgroundColor: 'rgba(56, 20, 24, 0.86)',
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  compactContainer: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  iconWrap: {
    paddingTop: 1,
  },
  copy: {
    flex: 1,
    gap: 3,
  },
  title: {
    color: '#FFE1DD',
    fontSize: 13,
    fontWeight: '800',
  },
  compactTitle: {
    fontSize: 12,
  },
  message: {
    color: '#FFC7C2',
    fontSize: 12,
    lineHeight: 17,
  },
  compactMessage: {
    fontSize: 11,
    lineHeight: 15,
  },
  action: {
    borderRadius: 9,
    backgroundColor: 'rgba(255, 180, 168, 0.14)',
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  actionText: {
    color: '#FFE1DD',
    fontSize: 11,
    fontWeight: '800',
  },
  dismiss: {
    paddingTop: 1,
  },
});

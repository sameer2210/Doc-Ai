import { Text, View, StyleSheet, type ViewStyle } from 'react-native';

import { PressableScale } from '@/components/ui/PressableScale';
import type { ChatAttachment } from '@/features/chat/types/chat-types';
import { useTheme } from '@/theme';

type AttachmentPreviewBarProps = {
  attachments: ChatAttachment[];
  onRemove: (id: string) => void;
};

function statusLabel(status: ChatAttachment['uploadStatus']): string {
  if (status === 'uploading') return 'Uploading';
  if (status === 'success') return 'Ready';
  if (status === 'failed') return 'Failed';
  return 'Attached';
}

export function AttachmentPreviewBar({ attachments, onRemove }: AttachmentPreviewBarProps) {
  const { theme } = useTheme();

  if (!attachments.length) return null;

  return (
    <View
      style={[
        styles.mainContainer,
        {
          backgroundColor: theme.colors.background.elevated,
          borderColor: theme.colors.border.soft,
        },
      ]}
    >
      <View style={styles.flexRowWrap}>
        {attachments.map(att => {
          const statusTextStyle = {
            marginTop: 4,
            fontSize: 11,
            fontWeight: '500' as const,
            color: att.uploadStatus === 'failed'
              ? theme.colors.text.danger
              : att.uploadStatus === 'success'
              ? theme.colors.text.success
              : theme.colors.text.secondary,
          };

          return (
            <View
              key={att.id}
              style={[
                styles.itemContainer,
                {
                  backgroundColor: theme.colors.background.surface,
                  borderColor: theme.colors.border.subtle,
                },
              ]}
            >
              <View style={styles.textWrapper}>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.itemName,
                    {
                      color: theme.colors.text.primary,
                    },
                  ]}
                >
                  {att.name}
                </Text>
                <Text style={statusTextStyle}>{statusLabel(att.uploadStatus)}</Text>
              </View>

              {att.uploadStatus === 'uploading' ? (
                <View
                  style={[
                    styles.progressBarTrack,
                    {
                      backgroundColor: theme.colors.border.subtle,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        backgroundColor: theme.colors.accent.primary,
                        width: `${att.progress ?? 0}%`,
                      },
                    ]}
                  />
                </View>
              ) : null}

              <PressableScale
                hitSlop={8}
                onPress={() => onRemove(att.id)}
                style={[
                  styles.removeButton,
                  {
                    backgroundColor: theme.colors.border.soft,
                  },
                ]}
              >
                <Text
                  style={{
                    color: theme.colors.text.primary,
                    fontSize: 10,
                    lineHeight: 12,
                    fontWeight: '700',
                  }}
                >
                  x
                </Text>
              </PressableScale>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  } as ViewStyle,
  flexRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  } as ViewStyle,
  itemContainer: {
    position: 'relative',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: '100%',
  } as ViewStyle,
  textWrapper: {
    paddingRight: 20,
  } as ViewStyle,
  itemName: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressBarTrack: {
    marginTop: 6,
    height: 6,
    width: '100%',
    overflow: 'hidden',
    borderRadius: 3,
  } as ViewStyle,
  progressBarFill: {
    height: 6,
    borderRadius: 3,
  } as ViewStyle,
  removeButton: {
    position: 'absolute',
    right: -4,
    top: -4,
    height: 18,
    width: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
});

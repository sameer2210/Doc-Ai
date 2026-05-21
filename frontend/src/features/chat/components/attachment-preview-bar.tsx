import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import type { ChatAttachment } from '@/features/chat/types/chat-types';

type AttachmentPreviewBarProps = {
  attachments: ChatAttachment[];
  onRemove: (id: string) => void;
};

function statusIcon(status: ChatAttachment['uploadStatus']): string {
  if (status === 'uploading') return '⏳';
  if (status === 'success') return '✅';
  if (status === 'failed') return '❌';
  return '📎';
}

/** Thin horizontal scrollable bar showing pending attachments with upload state */
export function AttachmentPreviewBar({ attachments, onRemove }: AttachmentPreviewBarProps) {
  if (!attachments.length) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="border-t border-slate-200 bg-slate-50 px-3 py-2"
      contentContainerStyle={{ gap: 8, alignItems: 'center' }}
    >
      {attachments.map(att => (
        <View
          key={att.id}
          className="relative rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm"
          style={{ maxWidth: 180 }}
        >
          {/* Icon + file name */}
          <View className="flex-row items-center gap-2">
            <Text style={{ fontSize: 16 }}>{statusIcon(att.uploadStatus)}</Text>
            <Text
              numberOfLines={1}
              className="flex-1 text-xs font-medium text-slate-700"
            >
              {att.name}
            </Text>
          </View>

          {/* Progress bar — only shown while uploading */}
          {att.uploadStatus === 'uploading' && (
            <View className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-200">
              <View
                className="h-1 rounded-full bg-blue-500"
                style={{ width: `${att.progress ?? 0}%` }}
              />
            </View>
          )}

          {/* Failed label */}
          {att.uploadStatus === 'failed' && (
            <Text className="mt-1 text-xs font-semibold text-red-500">Upload failed</Text>
          )}

          {/* Remove button — always visible */}
          <Pressable
            hitSlop={8}
            onPress={() => onRemove(att.id)}
            className="absolute -right-1.5 -top-1.5 h-5 w-5 items-center justify-center rounded-full bg-slate-500"
          >
            <Text style={{ color: '#fff', fontSize: 10, lineHeight: 12, fontWeight: '700' }}>
              ✕
            </Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

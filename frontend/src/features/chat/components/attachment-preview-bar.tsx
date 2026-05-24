import { Text, View } from 'react-native';

import { PressableScale } from '@/components/ui/PressableScale';
import type { ChatAttachment } from '@/features/chat/types/chat-types';

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
  if (!attachments.length) return null;

  return (
    <View className="border-t border-[#B5C6E81F] bg-[#0D1523F0] px-3 py-2">
      <View className="flex-row flex-wrap gap-2">
        {attachments.map(att => (
          <View
            key={att.id}
            className="relative rounded-2xl border border-[#B7CAEC24] bg-[#101B2EDB] px-3 py-2"
            style={{ maxWidth: '100%' }}
          >
            <View className="pr-5">
              <Text numberOfLines={1} className="text-xs font-semibold text-[#E4EEFF]">
                {att.name}
              </Text>
              <Text className="mt-1 text-[11px] font-medium text-[#9BB3D7]">{statusLabel(att.uploadStatus)}</Text>
            </View>

            {att.uploadStatus === 'uploading' ? (
              <View className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#223A5B]">
                <View
                  className="h-1.5 rounded-full bg-[#6EA8FF]"
                  style={{ width: `${att.progress ?? 0}%` }}
                />
              </View>
            ) : null}

            <PressableScale
              hitSlop={8}
              onPress={() => onRemove(att.id)}
              style={{
                position: 'absolute',
                right: -5,
                top: -5,
                height: 18,
                width: 18,
                borderRadius: 9,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#2A3F62',
              }}
            >
              <Text style={{ color: '#E8F1FF', fontSize: 10, lineHeight: 12, fontWeight: '700' }}>x</Text>
            </PressableScale>
          </View>
        ))}
      </View>
    </View>
  );
}

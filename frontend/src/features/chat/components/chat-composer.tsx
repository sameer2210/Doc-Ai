import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Text, TextInput, View } from 'react-native';
import { z } from 'zod';

import { PressableScale } from '@/components/ui/PressableScale';

const composerSchema = z.object({
  message: z.string().trim().min(1, 'Message cannot be empty').max(8_000),
});

type ComposerValues = z.infer<typeof composerSchema>;

type ChatComposerProps = {
  loading: boolean;
  onSend: (text: string) => void;
  onAttachImage?: () => void;
  onAttachDocument?: () => void;
};

export function ChatComposer({
  loading,
  onSend,
  onAttachImage,
  onAttachDocument,
}: ChatComposerProps) {
  const { control, handleSubmit, reset } = useForm<ComposerValues>({
    resolver: zodResolver(composerSchema),
    defaultValues: {
      message: '',
    },
  });

  const submit = handleSubmit(values => {
    onSend(values.message);
    reset({ message: '' });
  });

  return (
    <View className="border-t border-[#333333] bg-[#1D1D1D] px-3 pb-3 pt-2">
      <View className="mb-2 flex-row gap-2">
        <PressableScale
          onPress={onAttachImage}
          style={{
            borderRadius: 999,
            borderWidth: 1,
            borderColor: '#3B3B3B',
            backgroundColor: '#252525',
            paddingHorizontal: 12,
            paddingVertical: 7,
          }}
        >
          <Text className="text-xs font-bold text-[#D9D9D9]">Image</Text>
        </PressableScale>

        <PressableScale
          onPress={onAttachDocument}
          style={{
            borderRadius: 999,
            borderWidth: 1,
            borderColor: '#3B3B3B',
            backgroundColor: '#252525',
            paddingHorizontal: 12,
            paddingVertical: 7,
          }}
        >
          <Text className="text-xs font-bold text-[#D9D9D9]">Document</Text>
        </PressableScale>
      </View>

      <View className="flex-row items-end gap-2">
        <Controller
          control={control}
          name="message"
          render={({ field }) => (
            <TextInput
              placeholder="How can I help you today?"
              placeholderTextColor="#9C8E81"
              className="max-h-36 min-h-12 flex-1 rounded-2xl border border-[#3D3D3D] bg-[#2A2A2A] px-3 py-2.5 text-base text-[#F0E5DA]"
              multiline
              value={field.value}
              onChangeText={field.onChange}
            />
          )}
        />

        <PressableScale
          style={{
            minHeight: 44,
            minWidth: 68,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 14,
            borderWidth: 1,
            borderColor: loading ? '#4A4A4A' : '#8A6A4E',
            backgroundColor: loading ? '#454545' : '#D8A57A',
          }}
          onPress={submit}
          disabled={loading}
        >
          <Text className="text-sm font-black text-[#1E1711]">{loading ? '...' : 'Send'}</Text>
        </PressableScale>
      </View>
    </View>
  );
}

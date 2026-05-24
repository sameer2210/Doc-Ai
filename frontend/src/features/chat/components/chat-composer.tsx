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
    <View className="border-t border-[#B5C6E81F] bg-[#0A1220F2] px-3 pb-3 pt-2">
      <View className="mb-2 flex-row gap-2">
        <PressableScale
          onPress={onAttachImage}
          style={{
            borderRadius: 999,
            borderWidth: 1,
            borderColor: 'rgba(183, 202, 236, 0.28)',
            backgroundColor: 'rgba(17, 28, 45, 0.9)',
            paddingHorizontal: 12,
            paddingVertical: 7,
          }}
        >
          <Text className="text-xs font-bold text-[#DCE8FB]">Image</Text>
        </PressableScale>

        <PressableScale
          onPress={onAttachDocument}
          style={{
            borderRadius: 999,
            borderWidth: 1,
            borderColor: 'rgba(183, 202, 236, 0.28)',
            backgroundColor: 'rgba(17, 28, 45, 0.9)',
            paddingHorizontal: 12,
            paddingVertical: 7,
          }}
        >
          <Text className="text-xs font-bold text-[#DCE8FB]">Document</Text>
        </PressableScale>
      </View>

      <View className="flex-row items-end gap-2">
        <Controller
          control={control}
          name="message"
          render={({ field }) => (
            <TextInput
              placeholder="Ask about diagnostics, scans, or recommendations..."
              placeholderTextColor="#6D81A3"
              className="max-h-36 min-h-12 flex-1 rounded-2xl border border-[#B7CAEC24] bg-[#101A2BD9] px-3 py-2.5 text-base text-[#EBF3FF]"
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
            borderColor: loading ? 'rgba(127, 149, 183, 0.38)' : 'rgba(206, 228, 255, 0.35)',
            backgroundColor: loading ? 'rgba(88, 110, 145, 0.6)' : '#6EA8FF',
          }}
          onPress={submit}
          disabled={loading}
        >
          <Text className="text-sm font-black text-[#03112D]">{loading ? '...' : 'Send'}</Text>
        </PressableScale>
      </View>
    </View>
  );
}

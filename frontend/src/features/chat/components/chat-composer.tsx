import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
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
  const { control, handleSubmit, reset, watch } = useForm<ComposerValues>({
    resolver: zodResolver(composerSchema),
    defaultValues: {
      message: '',
    },
  });
  const text = watch('message') ?? '';
  const hasText = text.trim().length > 0;

  const submit = handleSubmit(values => {
    onSend(values.message);
    reset({ message: '' });
  });

  return (
    <Animated.View entering={FadeInDown.duration(260)}>
      <View className="mb-2 flex-row gap-2 px-1">
        <PressableScale
          onPress={onAttachImage}
          style={{
            borderRadius: 999,
            borderWidth: 1,
            borderColor: '#2D3850',
            backgroundColor: '#121A2A',
            paddingHorizontal: 12,
            paddingVertical: 7,
          }}
        >
          <Text className="text-xs font-bold text-[#C8D6F3]">Image</Text>
        </PressableScale>

        <PressableScale
          onPress={onAttachDocument}
          style={{
            borderRadius: 999,
            borderWidth: 1,
            borderColor: '#2D3850',
            backgroundColor: '#121A2A',
            paddingHorizontal: 12,
            paddingVertical: 7,
          }}
        >
          <Text className="text-xs font-bold text-[#C8D6F3]">Document</Text>
        </PressableScale>
      </View>

      <View className="flex-row items-end gap-2 rounded-[30px] border border-[#2D3545] bg-[#1B202B] px-2 py-2">
        <PressableScale
          onPress={onAttachImage}
          style={{
            height: 40,
            width: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#111826',
          }}
        >
          <Ionicons name="add" size={22} color="#C8D5EE" />
        </PressableScale>

        <Controller
          control={control}
          name="message"
          render={({ field }) => (
            <TextInput
              placeholder="Ask Spanda AI"
              placeholderTextColor="#8FA1C2"
              className="max-h-36 min-h-10 flex-1 px-2 py-2.5 text-base text-[#E5ECFA]"
              multiline
              textAlignVertical="top"
              value={field.value}
              onChangeText={field.onChange}
            />
          )}
        />

        <PressableScale
          style={{
            height: 40,
            width: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: loading || !hasText ? '#2E3A52' : '#769DFF',
            backgroundColor: loading || !hasText ? '#131D30' : '#5A8FFF',
          }}
          onPress={submit}
          disabled={loading || !hasText}
        >
          {loading ? (
            <Text className="text-sm font-black text-[#D9E7FF]">...</Text>
          ) : (
            <Ionicons name="arrow-up" size={20} color="#EEF4FF" />
          )}
        </PressableScale>
      </View>
    </Animated.View>
  );
}

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, Text, TextInput, View } from 'react-native';
import { z } from 'zod';

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
    <View className="border-t border-slate-200 bg-white px-3 pb-3 pt-2">
      <View className="mb-2 flex-row gap-2">
        <Pressable onPress={onAttachImage} className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1.5">
          <Text className="text-xs font-semibold text-slate-700">Image</Text>
        </Pressable>
        <Pressable
          onPress={onAttachDocument}
          className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1.5">
          <Text className="text-xs font-semibold text-slate-700">Document</Text>
        </Pressable>
      </View>

      <View className="flex-row items-end gap-2">
        <Controller
          control={control}
          name="message"
          render={({ field }) => (
            <TextInput
              placeholder="Ask something..."
              placeholderTextColor="#64748B"
              className="max-h-36 min-h-12 flex-1 rounded-2xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-base text-slate-900"
              multiline
              value={field.value}
              onChangeText={field.onChange}
            />
          )}
        />

        <Pressable
          className={`h-11 min-w-16 items-center justify-center rounded-xl px-4 ${
            loading ? 'bg-blue-400' : 'bg-blue-700'
          }`}
          onPress={submit}
          disabled={loading}>
          <Text className="text-sm font-bold text-white">{loading ? '...' : 'Send'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

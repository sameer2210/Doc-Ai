import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Keyboard, ActivityIndicator, TextInput, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { z } from 'zod';

import { PressableScale } from '@/components/ui/PressableScale';
import { useTheme } from '@/theme';
import { ChatComposerSurface } from './chat-composer-surface';

const composerSchema = z.object({
  message: z.string().trim().min(1, 'Message cannot be empty').max(8_000),
});

type ComposerValues = z.infer<typeof composerSchema>;

type ChatComposerProps = {
  loading: boolean;
  onSend: (text: string) => void;
  onAttachImage?: () => void;
};

export function ChatComposer({ loading, onSend, onAttachImage }: ChatComposerProps) {
  const { theme, isDark } = useTheme();
  
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
    Keyboard.dismiss();
  });

  return (
    <Animated.View entering={FadeInDown.duration(260)}>
      <ChatComposerSurface>
        <PressableScale
          onPress={onAttachImage}
          style={[
            styles.attachButton,
            {
              backgroundColor: theme.colors.border.subtle,
            },
          ]}
        >
          <Ionicons
            name="add"
            size={22}
            color={theme.colors.accent.primary}
          />
        </PressableScale>

        <Controller
          control={control}
          name="message"
          render={({ field }) => (
            <TextInput
              placeholder="Ask Spanda AI..."
              placeholderTextColor={theme.colors.inputPlaceholder}
              style={[
                styles.textInput,
                {
                  color: theme.colors.text.primary,
                },
              ]}
              multiline
              textAlignVertical="top"
              value={field.value}
              onChangeText={field.onChange}
            />
          )}
        />

        <PressableScale
          style={[
            styles.sendButton,
            {
              borderColor: loading || !hasText
                ? theme.colors.border.subtle
                : theme.colors.accent.primary,
              backgroundColor: loading || !hasText
                ? theme.colors.border.subtle
                : theme.colors.accent.primary,
            },
          ]}
          onPress={submit}
          disabled={loading || !hasText}
        >
          {loading ? (
            <ActivityIndicator size="small" color={isDark ? theme.colors.text.primary : theme.colors.background.elevated} />
          ) : (
            <Ionicons
              name="arrow-up"
              size={20}
              color={loading || !hasText ? theme.colors.text.tertiary : (isDark ? theme.colors.background.base : theme.colors.background.elevated)}
            />
          )}
        </PressableScale>
      </ChatComposerSurface>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  attachButton: {
    height: 40,
    width: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    maxHeight: 144,
    minHeight: 40,
    flex: 1,
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 16,
  },
  sendButton: {
    height: 40,
    width: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});

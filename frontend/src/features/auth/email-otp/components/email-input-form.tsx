import { zodResolver } from '@hookform/resolvers/zod';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, TextInput, View } from 'react-native';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { ThemeText } from '@/components/ui/theme/ThemeText';
import { useTheme } from '@/theme';

const emailSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { message: 'Email is required' })
    .email({ message: 'Please enter a valid email address' }),
});

type EmailFormValues = z.infer<typeof emailSchema>;

interface EmailInputFormProps {
  onSubmit: (email: string) => void;
  isLoading?: boolean;
  error?: string | null;
}

export function EmailInputForm({ onSubmit, isLoading, error }: EmailInputFormProps) {
  const { theme, isDark } = useTheme();
  const { colors, spacing, radii } = theme;

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: '',
    },
  });

  const onFormSubmit = handleSubmit((values) => {
    onSubmit(values.email);
  });

  return (
    <View style={styles.container}>
      <ThemeText variant="body" style={[styles.description, { color: colors.text.secondary }]}>
        Enter your email address to receive a secure 6-digit verification code.
      </ThemeText>

      <View style={{ marginBottom: spacing.md }}>
        <ThemeText variant="caption" style={[styles.label, { color: colors.text.tertiary }]}>
          Email Address
        </ThemeText>
        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <TextInput
              value={field.value}
              onChangeText={field.onChange}
              placeholder="name@example.com"
              placeholderTextColor={colors.inputPlaceholder}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              style={[
                styles.textInput,
                {
                  color: colors.text.primary,
                  borderColor: errors.email || error
                    ? colors.text.danger
                    : colors.border.soft,
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.04)'
                    : 'rgba(0, 0, 0, 0.02)',
                  borderRadius: radii.md,
                  paddingHorizontal: spacing.md,
                },
              ]}
              editable={!isLoading}
            />
          )}
        />
        {errors.email && (
          <ThemeText variant="caption" style={[styles.errorText, { color: colors.text.danger }]}>
            {errors.email.message}
          </ThemeText>
        )}
        {error && !errors.email && (
          <ThemeText variant="caption" style={[styles.errorText, { color: colors.text.danger }]}>
            {error}
          </ThemeText>
        )}
      </View>

      <Button
        label="Send Verification Code"
        isLoading={isLoading}
        onPress={onFormSubmit}
        variant="primary"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    height: 54,
    borderWidth: 1,
    fontSize: 15,
  },
  errorText: {
    fontSize: 12,
    marginTop: 6,
  },
});

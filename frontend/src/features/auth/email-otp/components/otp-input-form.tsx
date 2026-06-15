import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, TextInput, View, Pressable, Platform } from 'react-native';

import { Button } from '@/components/ui/Button';
import { ThemeText } from '@/components/ui/theme/ThemeText';
import { useTheme } from '@/theme';

interface OtpInputFormProps {
  onSubmit: (otp: string) => void;
  isLoading?: boolean;
  error?: string | null;
  email: string;
  onBackToEmail: () => void;
}

export function OtpInputForm({ onSubmit, isLoading, error, email, onBackToEmail }: OtpInputFormProps) {
  const { theme, isDark } = useTheme();
  const { colors, spacing, radii } = theme;

  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const inputsRef = useRef<(TextInput | null)[]>([]);

  // Auto-focus first input on mount
  useEffect(() => {
    setTimeout(() => {
      inputsRef.current[0]?.focus();
    }, 100);
  }, []);

  const handleChangeText = (text: string, index: number) => {
    const newOtp = [...otp];

    // Handle paste events
    if (text.length > 1) {
      const pasteData = text.trim().slice(0, 6).replace(/\D/g, '');
      const pasteArray = pasteData.split('');
      const populatedOtp = [...otp];
      for (let i = 0; i < 6; i++) {
        populatedOtp[i] = pasteArray[i] ?? '';
      }
      setOtp(populatedOtp);

      // Focus last populated box
      const targetIndex = Math.min(pasteArray.length, 5);
      inputsRef.current[targetIndex]?.focus();
      return;
    }

    newOtp[index] = text;
    setOtp(newOtp);

    // Auto-focus next input if a value is typed
    if (text !== '' && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // If backspace is pressed on an empty input, move focus to the previous one
    if (e.nativeEvent.key === 'Backspace' && otp[index] === '' && index > 0) {
      const newOtp = [...otp];
      newOtp[index - 1] = '';
      setOtp(newOtp);
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleVerify = () => {
    const fullOtp = otp.join('');
    if (fullOtp.length === 6) {
      onSubmit(fullOtp);
    }
  };

  const isComplete = otp.every((val) => val !== '');

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <ThemeText variant="body" style={[styles.description, { color: colors.text.secondary }]}>
          We sent a verification code to:{'\n'}
          <ThemeText style={{ fontWeight: '700', color: colors.text.primary }}>{email}</ThemeText>
        </ThemeText>
        <Pressable onPress={onBackToEmail} hitSlop={8}>
          <ThemeText variant="caption" style={[styles.changeEmailText, { color: colors.accent.primary }]}>
            Change Email
          </ThemeText>
        </Pressable>
      </View>

      <View style={[styles.inputsContainer, { marginVertical: spacing.lg }]}>
        {otp.map((val, idx) => (
          <TextInput
            key={idx}
            ref={(ref) => {
              inputsRef.current[idx] = ref;
            }}
            value={val}
            onChangeText={(text) => handleChangeText(text, idx)}
            onKeyPress={(e) => handleKeyPress(e, idx)}
            keyboardType="number-pad"
            maxLength={6} // Allow paste on any box
            selectTextOnFocus
            textAlign="center"
            accessibilityLabel={`Digit ${idx + 1}`}
            style={[
              styles.inputBox,
              {
                color: colors.text.primary,
                borderColor: error ? colors.text.danger : colors.border.soft,
                backgroundColor: isDark
                  ? 'rgba(255, 255, 255, 0.04)'
                  : 'rgba(0, 0, 0, 0.02)',
                borderRadius: radii.md,
                marginRight: idx < 5 ? 8 : 0,
              },
            ]}
            editable={!isLoading}
          />
        ))}
      </View>

      {error && (
        <ThemeText variant="caption" style={[styles.errorText, { color: colors.text.danger, marginBottom: spacing.md }]}>
          {error}
        </ThemeText>
      )}

      <Button
        label="Verify & Login"
        isLoading={isLoading}
        disabled={!isComplete}
        onPress={handleVerify}
        variant="primary"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  changeEmailText: {
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 12,
    marginTop: 2,
  },
  inputsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputBox: {
    flex: 1,
    height: 56,
    fontSize: 20,
    fontWeight: '700',
    borderWidth: 1,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  errorText: {
    fontSize: 12,
    textAlign: 'center',
  },
});

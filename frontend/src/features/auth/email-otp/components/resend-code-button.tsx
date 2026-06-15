import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemeText } from '@/components/ui/theme/ThemeText';
import { useTheme } from '@/theme';

interface ResendCodeButtonProps {
  onResend: () => void;
  isLoading?: boolean;
}

export function ResendCodeButton({ onResend, isLoading }: ResendCodeButtonProps) {
  const { theme } = useTheme();
  const { colors } = theme;
  const [cooldown, setCooldown] = useState(60);

  useEffect(() => {
    if (cooldown <= 0) return;

    const interval = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldown]);

  const handlePress = () => {
    if (cooldown <= 0 && !isLoading) {
      setCooldown(60); // Reset cooldown
      onResend();
    }
  };

  const active = cooldown <= 0;

  return (
    <View style={styles.container}>
      {active ? (
        <Pressable onPress={handlePress} disabled={isLoading} hitSlop={8}>
          <ThemeText
            variant="body"
            style={[
              styles.resendText,
              {
                color: colors.accent.primary,
                textDecorationLine: 'underline',
                opacity: isLoading ? 0.5 : 1,
              },
            ]}
          >
            Resend Code
          </ThemeText>
        </Pressable>
      ) : (
        <ThemeText variant="body" style={{ color: colors.text.tertiary }}>
          Resend code in <ThemeText style={{ fontWeight: '700' }}>{cooldown}s</ThemeText>
        </ThemeText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  resendText: {
    fontWeight: '700',
  },
});

import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemeText } from '@/components/ui/theme/ThemeText';
import { useTheme } from '@/theme';

interface OtpTimerProps {
  initialSeconds?: number;
  onExpire: () => void;
  isActive: boolean;
}

export function OtpTimer({ initialSeconds = 600, onExpire, isActive }: OtpTimerProps) {
  const { theme } = useTheme();
  const { colors } = theme;
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    // Reset timer if active changes to true
    if (isActive) {
      setSecondsLeft(initialSeconds);
    }
  }, [isActive, initialSeconds]);

  useEffect(() => {
    if (!isActive || secondsLeft <= 0) {
      if (secondsLeft === 0) {
        onExpire();
      }
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, secondsLeft, onExpire]);

  const formatTime = (totalSecs: number) => {
    const minutes = Math.floor(totalSecs / 60);
    const seconds = totalSecs % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (secondsLeft <= 0) {
    return (
      <View style={styles.container}>
        <ThemeText variant="body" style={{ color: colors.text.danger }}>
          Code expired. Please request a new OTP.
        </ThemeText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ThemeText variant="body" style={{ color: colors.text.secondary }}>
        Code expires in:{' '}
        <ThemeText style={{ fontWeight: '700', color: colors.accent.primary }}>
          {formatTime(secondsLeft)}
        </ThemeText>
      </ThemeText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
});

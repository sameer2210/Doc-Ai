import React from 'react';
import { ActivityIndicator, Text, type PressableProps, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { PressableScale } from '@/components/ui/PressableScale';
import { useTheme } from '@/theme';

interface ButtonProps extends PressableProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'outline';
  icon?: React.ReactNode;
  isLoading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const Button = ({
  label,
  variant = 'primary',
  icon,
  isLoading,
  style,
  textStyle,
  disabled,
  ...props
}: ButtonProps) => {
  const { theme } = useTheme();
  const { colors } = theme;

  const tone = {
    primary: {
      bg: colors.accent.primary,
      border: colors.border.soft,
      text: colors.background.base,
      indicator: colors.background.base,
    },
    secondary: {
      bg: colors.background.surfaceStrong,
      border: colors.border.subtle,
      text: colors.text.primary,
      indicator: colors.text.primary,
    },
    outline: {
      bg: colors.background.surface,
      border: colors.border.subtle,
      text: colors.text.secondary,
      indicator: colors.text.secondary,
    },
  }[variant];

  return (
    <PressableScale
      {...props}
      style={[
        {
          minHeight: 54,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: theme.radii.lg,
          borderWidth: 1,
          borderColor: tone.border,
          backgroundColor: tone.bg,
          paddingHorizontal: 18,
          opacity: disabled || isLoading ? 0.65 : 1,
        },
        style,
      ]}
      disabled={disabled || isLoading}
    >
      {isLoading ? (
        <ActivityIndicator color={tone.indicator} />
      ) : (
        <>
          {icon}
          <Text
            style={[
              {
                fontSize: 15,
                fontWeight: '700',
                letterSpacing: 0.1,
                color: tone.text,
              },
              textStyle,
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </PressableScale>
  );
};

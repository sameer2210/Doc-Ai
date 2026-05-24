import React from 'react';
import { ActivityIndicator, Text, type PressableProps, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { PressableScale } from '@/components/ui/PressableScale';

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
  const tone = {
    primary: {
      bg: '#6EA8FF',
      border: 'rgba(206, 228, 255, 0.36)',
      text: '#03112D',
    },
    secondary: {
      bg: 'rgba(20, 30, 47, 0.85)',
      border: 'rgba(200, 214, 246, 0.2)',
      text: '#EAF2FF',
    },
    outline: {
      bg: 'rgba(9, 14, 22, 0.55)',
      border: 'rgba(200, 214, 246, 0.22)',
      text: '#C7D7F4',
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
          borderRadius: 18,
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
        <ActivityIndicator color={variant === 'primary' ? '#03112D' : '#EAF2FF'} />
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

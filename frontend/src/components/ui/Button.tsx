import React from 'react';
import {
  Text,
  Pressable,
  PressableProps,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

interface ButtonProps extends PressableProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'outline';
  icon?: React.ReactNode;
  isLoading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  className?: string;
  textClassName?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const Button = ({
  label,
  variant = 'primary',
  icon,
  isLoading,
  style,
  textStyle,
  className,
  textClassName,
  disabled,
  ...props
}: ButtonProps) => {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const getContainerStyle = (): ViewStyle => {
    switch (variant) {
      case 'primary':
        return { backgroundColor: '#FFFFFF' };
      case 'secondary':
        return { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 1 };
      case 'outline':
        return { backgroundColor: 'transparent', borderColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 1 };
      default:
        return { backgroundColor: '#FFFFFF' };
    }
  };

  const getTextStyle = (): TextStyle => {
    switch (variant) {
      case 'primary':
        return { color: '#000000' };
      case 'secondary':
      case 'outline':
        return { color: '#FFFFFF' };
      default:
        return { color: '#000000' };
    }
  };

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        {
          height: 52,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          borderRadius: 26,
          paddingHorizontal: 24,
          opacity: disabled || isLoading ? 0.6 : 1,
        },
        getContainerStyle(),
        animatedStyle,
        style,
      ]}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={variant === 'primary' ? '#000' : '#FFF'} />
      ) : (
        <>
          {icon && icon}
          <Text
            style={[
              {
                fontSize: 16,
                fontWeight: '600',
                letterSpacing: -0.3,
              },
              getTextStyle(),
              textStyle,
            ]}>
            {label}
          </Text>
        </>
      )}
    </AnimatedPressable>
  );
};

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

  const getContainerClassName = () => {
    switch (variant) {
      case 'primary':
        return 'bg-white';
      case 'secondary':
        return 'border border-white/10 bg-white/5';
      case 'outline':
        return 'border border-white/10 bg-transparent';
      default:
        return 'bg-white';
    }
  };

  const getTextClassName = () => {
    switch (variant) {
      case 'primary':
        return 'text-black';
      case 'secondary':
      case 'outline':
        return 'text-white';
      default:
        return 'text-black';
    }
  };

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      className={`h-[52px] flex-row items-center justify-center gap-2 rounded-full px-6 ${
        getContainerClassName()
      } ${disabled || isLoading ? 'opacity-60' : ''} ${className ?? ''}`}
      style={[
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
            className={`text-base font-semibold tracking-[-0.3px] ${getTextClassName()} ${textClassName ?? ''}`}
            style={textStyle}>
            {label}
          </Text>
        </>
      )}
    </AnimatedPressable>
  );
};

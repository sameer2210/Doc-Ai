import * as Haptics from 'expo-haptics';
import type { PropsWithChildren } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

type PressableScaleProps = PropsWithChildren<
  PressableProps & {
    style?: StyleProp<ViewStyle>;
    haptic?: boolean;
  }
>;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PressableScale({
  children,
  onPressIn,
  onPressOut,
  onPress,
  haptic = true,
  style,
  ...props
}: PressableScaleProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      {...props}
      style={[style, animatedStyle]}
      onPressIn={event => {
        scale.value = withSpring(0.97, { damping: 14, stiffness: 280 });
        onPressIn?.(event);
      }}
      onPressOut={event => {
        scale.value = withSpring(1, { damping: 14, stiffness: 280 });
        onPressOut?.(event);
      }}
      onPress={event => {
        if (haptic) {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress?.(event);
      }}
    >
      {children}
    </AnimatedPressable>
  );
}

import { useEffect } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

type SkeletonBlockProps = {
  style?: StyleProp<ViewStyle>;
  className?: string;
};

export function SkeletonBlock({ style, className }: SkeletonBlockProps) {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [shimmer]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0.38, 0.8]),
  }));

  return (
    <View
      className={className}
      style={[
        {
          overflow: 'hidden',
          borderRadius: 16,
          backgroundColor: 'rgba(164, 184, 220, 0.16)',
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          {
            height: '100%',
            width: '100%',
            backgroundColor: 'rgba(210, 225, 255, 0.2)',
          },
          animatedStyle,
        ]}
      />
    </View>
  );
}

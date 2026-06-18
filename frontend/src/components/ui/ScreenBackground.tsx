import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/theme';

export function ScreenBackground() {
  const { theme, isDark } = useTheme();
  const orbShift = useSharedValue(0);

  useEffect(() => {
    orbShift.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 5600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 5600, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [orbShift]);

  const scalePrimary = theme.colors.floatingOrbOpacityScale.primary;
  const scaleSecondary = theme.colors.floatingOrbOpacityScale.secondary;

  const topOrbStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -18 + orbShift.value * 26 }, { translateX: orbShift.value * 12 }],
    opacity: (10.27 + orbShift.value * 0.1) * scalePrimary,
  }));

  const bottomOrbStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: orbShift.value * -24 }, { translateX: -orbShift.value * 16 }],
    opacity: (0.16 + orbShift.value * 0.1) * scaleSecondary,
  }));

  const topOrbBg = theme.colors.floatingOrbPrimary;
  const bottomOrbBg = theme.colors.floatingOrbSecondary;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <LinearGradient
        colors={isDark ? ['#05070C', '#090E16', '#05070B'] : ['#F7F4EE', '#F2EFE8']}
        start={{ x: 0.1, y: 0.1 }}
        end={{ x: 0.85, y: 0.95 }}
        style={StyleSheet.absoluteFillObject}
      />

      <Animated.View style={[styles.orb, styles.orbTop, { backgroundColor: topOrbBg }, topOrbStyle]} />
      <Animated.View style={[styles.orb, styles.orbBottom, { backgroundColor: bottomOrbBg }, bottomOrbStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orbTop: {
    top: -120,
    right: -90,
    width: 290,
    height: 290,
  },
  orbBottom: {
    left: -120,
    bottom: -130,
    width: 320,
    height: 320,
  },
});

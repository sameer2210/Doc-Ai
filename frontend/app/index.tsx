import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Inter_400Regular,
  Inter_500Medium,
  useFonts as useInterFonts,
} from '@expo-google-fonts/inter';

import { SpaceGrotesk_700Bold, useFonts as useSpaceFonts } from '@expo-google-fonts/space-grotesk';

import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { useSessionStore } from '@/features/auth/store/session-store';

export default function AppEntryScreen() {
  const user = useSessionStore(state => state.user);
  const hydrated = useSessionStore(state => state.hydrated);

  const floating = useSharedValue(0);
  const glow = useSharedValue(0);

  // Fonts
  const [interLoaded] = useInterFonts({
    Inter_400Regular,
    Inter_500Medium,
  });

  const [spaceLoaded] = useSpaceFonts({
    SpaceGrotesk_700Bold,
  });

  const fontsLoaded = interLoaded && spaceLoaded;

  // Animations
  useEffect(() => {
    floating.value = withRepeat(
      withTiming(1, {
        duration: 3200,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );

    glow.value = withRepeat(
      withTiming(1, {
        duration: 2200,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );
  }, []);

  // Navigation
  useEffect(() => {
    if (!hydrated || !fontsLoaded) return;

    const timer = setTimeout(() => {
      if (user) {
        router.replace('/(tabs)');
      } else {
        router.replace('/login');
      }
    }, 2200);

    return () => clearTimeout(timer);
  }, [hydrated, fontsLoaded]);

  const orbStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: interpolate(floating.value, [0, 1], [0, -12]),
        },
        {
          scale: interpolate(floating.value, [0, 1], [1, 1.04]),
        },
      ],
    };
  });

  const glowStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(glow.value, [0, 1], [0.3, 0.7]),
      transform: [
        {
          scale: interpolate(glow.value, [0, 1], [1, 1.15]),
        },
      ],
    };
  });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#020617' }}>
      <ScreenBackground />

      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 28,
          overflow: 'hidden',
        }}
      >
        {/* Ambient Blue Glow */}
        <Animated.View
          entering={FadeIn.duration(1200)}
          style={[
            glowStyle,
            {
              position: 'absolute',
              width: 240,
              height: 240,
              borderRadius: 999,
              backgroundColor: 'rgba(59,130,246,0.22)',
              shadowColor: '#3B82F6',
              shadowOpacity: 0.45,
              shadowRadius: 80,
            },
          ]}
        />

        {/* Glass Card */}
        <Animated.View
          style={[
            orbStyle,
            {
              borderRadius: 100,
              overflow: 'hidden',
              alignItems: 'center',
              justifyContent: 'center',
              shadowOpacity: 0.28,
              shadowOffset: {
                width: 0,
                height: 8,
              },
              elevation: 18,
            },
          ]}
        >
          <LinearGradient
            colors={['rgba(59,130,246,0.16)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
            }}
          />

          {/* LOGO */}
          <Image
            source={require('@/assets/images/splash-icon.png')}
            style={{
              width: 92,
              height: 92,
            }}
            contentFit="contain"
          />
        </Animated.View>

        {/* Branding */}
        <Animated.View
          entering={FadeInDown.delay(250).duration(700)}
          style={{
            alignItems: 'center',
            marginTop: 46,
          }}
        >
          <Text
            style={{
              color: '#F8FAFC',
              fontSize: 32,
              fontFamily: 'SpaceGrotesk_700Bold',
              letterSpacing: 0.8,
            }}
          >
            SpandaVidya AI
          </Text>

          <Text
            style={{
              color: '#94A3B8',
              fontSize: 12,
              marginTop: 12,
              letterSpacing: 2.6,
              textTransform: 'uppercase',
              fontFamily: 'Inter_500Medium',
            }}
          >
            AI-Powered Ayurvedic Diagnostics
          </Text>
        </Animated.View>

        {/* Premium Loader */}
        <Animated.View
          entering={FadeInDown.delay(500).duration(700)}
          style={{
            marginTop: 42,
            alignItems: 'center',
          }}
        >
          <ActivityIndicator size="small" color="#60A5FA" />

          <Text
            style={{
              color: '#64748B',
              fontSize: 11,
              marginTop: 18,
              letterSpacing: 1.8,
              fontFamily: 'Inter_400Regular',
            }}
          >
            PRECISION EYE HEALTH ANALYSIS
          </Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

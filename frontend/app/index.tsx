import { router } from 'expo-router';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { SkeletonBlock } from '@/components/ui/SkeletonBlock';
import { useSessionStore } from '@/features/auth/store/session-store';

export default function AppEntryScreen() {
  const user = useSessionStore(state => state.user);
  const hydrated = useSessionStore(state => state.hydrated);

  useEffect(() => {
    if (!hydrated) return;

    if (user) {
      router.replace('/(tabs)');
      return;
    }

    router.replace({ pathname: '/login', params: { from: '/(tabs)' } });
  }, [hydrated, user]);

  return (
    <SafeAreaView className="flex-1 bg-[#06080D]">
      <View className="flex-1 items-center justify-center px-6">
        <ScreenBackground />

        <Animated.View entering={FadeIn.duration(500)} className="w-full max-w-xs items-center">
          <View className="h-14 w-14 items-center justify-center rounded-2xl border border-[#CBDCFF30] bg-[#0E1624D8]">
            <Text className="text-lg font-black tracking-wide text-[#EBF3FF]">SV</Text>
          </View>
          <Text className="mt-5 text-lg font-bold text-[#F3F8FF]">Preparing your workspace</Text>
          <View className="mt-5 w-full gap-2">
            <SkeletonBlock style={{ height: 10, borderRadius: 999 }} />
            <SkeletonBlock style={{ height: 10, width: '70%', borderRadius: 999 }} />
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

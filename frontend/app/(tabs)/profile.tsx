import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard } from '@/components/ui/GlassCard';
import { PressableScale } from '@/components/ui/PressableScale';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { useSessionStore } from '@/features/auth/store/session-store';
import { clearPersistedSession } from '@/shared/auth/token-storage';

export default function ProfileTabScreen() {
  const user = useSessionStore(state => state.user);
  const clearSession = useSessionStore(state => state.clearSession);

  async function handleLogout() {
    await clearPersistedSession();
    clearSession();
    router.replace('/login');
  }

  return (
    <SafeAreaView className="flex-1 bg-[#06080D]" edges={['top']}>
      <View className="flex-1">
        <ScreenBackground />

        <View className="px-5 pb-32 pt-3">
          <Animated.View entering={FadeInDown.duration(520)}>
            <Text className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8BA0C5]">profile</Text>
            <Text className="mt-1 text-3xl font-black text-[#F5FAFF]">Account & Security</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(580).delay(120)} className="mt-7">
            <GlassCard>
              <View className="flex-row items-center gap-3">
                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-[#1A2A43]">
                  <Text className="text-lg font-bold text-[#DDE9FF]">{(user?.name || user?.email || 'U').slice(0, 1).toUpperCase()}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-[#F4F9FF]">{user?.name || 'Guest User'}</Text>
                  <Text className="mt-1 text-xs text-[#8FA2C3]">{user?.email || 'No email linked'}</Text>
                </View>
              </View>
            </GlassCard>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(620).delay(220)} className="mt-4 gap-3">
            <PressableScale
              onPress={() => router.push('/reports')}
              style={{
                borderRadius: 18,
                borderWidth: 1,
                borderColor: 'rgba(172, 192, 230, 0.22)',
                backgroundColor: 'rgba(12, 19, 31, 0.9)',
                padding: 14,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <Ionicons name="shield-checkmark-outline" size={18} color="#B9D0FF" />
              <Text className="flex-1 text-sm font-semibold text-[#EAF3FF]">Clinical privacy and records</Text>
              <Ionicons name="chevron-forward" size={16} color="#91A6C8" />
            </PressableScale>

            <PressableScale
              onPress={handleLogout}
              style={{
                borderRadius: 18,
                borderWidth: 1,
                borderColor: 'rgba(242, 155, 155, 0.3)',
                backgroundColor: 'rgba(42, 18, 18, 0.68)',
                padding: 14,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <Ionicons name="log-out-outline" size={18} color="#F5A5A5" />
              <Text className="flex-1 text-sm font-semibold text-[#FFD9D9]">Sign out</Text>
              <Ionicons name="chevron-forward" size={16} color="#F3B0B0" />
            </PressableScale>
          </Animated.View>
        </View>
      </View>
    </SafeAreaView>
  );
}

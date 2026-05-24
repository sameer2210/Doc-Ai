import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard } from '@/components/ui/GlassCard';
import { PressableScale } from '@/components/ui/PressableScale';
import { ScreenBackground } from '@/components/ui/ScreenBackground';

const reports = [
  { title: 'Cataract Risk Summary', time: 'Today • 10:42 AM', badge: 'Ready' },
  { title: 'AI Diagnosis Insights', time: 'Today • 9:55 AM', badge: 'Ready' },
  { title: 'Ayurvedic Recommendation Brief', time: 'Yesterday • 6:30 PM', badge: 'Synced' },
];

export default function ReportsTabScreen() {
  return (
    <SafeAreaView className="flex-1 bg-[#06080D]" edges={['top']}>
      <View className="flex-1">
        <ScreenBackground />

        <View className="px-5 pb-32 pt-3">
          <Animated.View entering={FadeInDown.duration(520)}>
            <Text className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8BA0C5]">reports</Text>
            <Text className="mt-1 text-3xl font-black text-[#F5FAFF]">Health Intelligence</Text>
          </Animated.View>

          <View className="mt-7 gap-3">
            {reports.map((item, index) => (
              <Animated.View key={item.title} entering={FadeInDown.duration(560).delay(80 + index * 60)}>
                <GlassCard style={{ borderRadius: 20 }}>
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-[#F3F8FF]">{item.title}</Text>
                      <Text className="mt-1 text-xs text-[#8FA2C3]">{item.time}</Text>
                    </View>
                    <View className="rounded-full border border-[#A0E4C280] bg-[#123327D9] px-3 py-1">
                      <Text className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#95E6C0]">{item.badge}</Text>
                    </View>
                  </View>
                </GlassCard>
              </Animated.View>
            ))}
          </View>

          <Animated.View entering={FadeInDown.duration(620).delay(260)} className="mt-7">
            <PressableScale
              onPress={() => router.push('/chat')}
              style={{
                borderRadius: 20,
                borderWidth: 1,
                borderColor: 'rgba(180, 200, 235, 0.22)',
                backgroundColor: 'rgba(13, 21, 34, 0.9)',
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <View className="h-10 w-10 items-center justify-center rounded-2xl bg-[#1A2A43]">
                <Ionicons name="sparkles-outline" size={18} color="#B9D0FF" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-[#F3F8FF]">Summarize with AI</Text>
                <Text className="mt-1 text-xs text-[#8FA2C3]">Generate concise patient-friendly report summary.</Text>
              </View>
              <Ionicons name="arrow-forward" size={17} color="#90A5C8" />
            </PressableScale>
          </Animated.View>
        </View>
      </View>
    </SafeAreaView>
  );
}

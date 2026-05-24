import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard } from '@/components/ui/GlassCard';
import { PressableScale } from '@/components/ui/PressableScale';
import { ScreenBackground } from '@/components/ui/ScreenBackground';

const scanActions = [
  {
    title: 'Cataract Detection',
    subtitle: 'Capture or upload retinal photo for AI screening.',
    route: '/data-collection',
    icon: 'scan-outline' as const,
  },
  {
    title: 'Ayurvedic Assessment',
    subtitle: 'Run Agni-Bala intake for personalized recommendations.',
    route: '/agni-bala-assessment',
    icon: 'leaf-outline' as const,
  },
  {
    title: 'AI Assistant Intake',
    subtitle: 'Start with guided questions before submitting scan.',
    route: '/chat',
    icon: 'chatbubble-ellipses-outline' as const,
  },
];

export default function ScanTabScreen() {
  return (
    <SafeAreaView className="flex-1 bg-[#06080D]" edges={['top']}>
      <View className="flex-1">
        <ScreenBackground />

        <View className="px-5 pb-32 pt-3">
          <Animated.View entering={FadeInDown.duration(520)}>
            <Text className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8BA0C5]">scan center</Text>
            <Text className="mt-1 text-3xl font-black text-[#F5FAFF]">Clinical AI Scanning</Text>
            <Text className="mt-2 text-sm leading-6 text-[#8EA1C2]">
              Choose a workflow to continue cataract analysis or complementary Ayurvedic assessment.
            </Text>
          </Animated.View>

          <View className="mt-7 gap-3">
            {scanActions.map((item, index) => (
              <Animated.View key={item.title} entering={FadeInDown.duration(580).delay(80 + index * 80)}>
                <PressableScale
                  onPress={() => router.push(item.route as never)}
                  style={{
                    borderRadius: 22,
                    borderWidth: 1,
                    borderColor: 'rgba(173, 193, 230, 0.23)',
                    backgroundColor: 'rgba(12, 19, 31, 0.9)',
                    padding: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <View className="h-12 w-12 items-center justify-center rounded-2xl bg-[#182841]">
                    <Ionicons name={item.icon} size={22} color="#B9D0FF" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-[#F3F8FF]">{item.title}</Text>
                    <Text className="mt-1 text-xs leading-5 text-[#8CA1C3]">{item.subtitle}</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={18} color="#90A5C8" />
                </PressableScale>
              </Animated.View>
            ))}
          </View>

          <Animated.View entering={FadeInDown.duration(620).delay(250)} className="mt-7">
            <GlassCard>
              <Text className="text-sm font-bold uppercase tracking-[0.12em] text-[#90A6CB]">AI Readiness</Text>
              <Text className="mt-2 text-lg font-bold text-[#F4F9FF]">Before you begin</Text>
              <Text className="mt-2 text-sm leading-6 text-[#8FA4C8]">
                Ensure eye images are clear, well-lit, and close-focused. This improves model confidence and perceived response speed.
              </Text>
            </GlassCard>
          </Animated.View>
        </View>
      </View>
    </SafeAreaView>
  );
}

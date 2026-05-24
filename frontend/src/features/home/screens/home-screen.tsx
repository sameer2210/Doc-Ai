import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
import Animated, {
  FadeInDown,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard } from '@/components/ui/GlassCard';
import { PressableScale } from '@/components/ui/PressableScale';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { SkeletonBlock } from '@/components/ui/SkeletonBlock';
import { useSessionStore } from '@/features/auth/store/session-store';

type QuickTool = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
};

const quickTools: QuickTool[] = [
  {
    title: 'Cataract Detection',
    subtitle: 'Upload eye image',
    icon: 'scan-outline',
    route: '/data-collection',
  },
  {
    title: 'AI Health Chat',
    subtitle: 'Live assistant',
    icon: 'sparkles-outline',
    route: '/chat',
  },
  {
    title: 'Ayurvedic Recommendations',
    subtitle: 'Agni & wellness',
    icon: 'leaf-outline',
    route: '/agni-bala-assessment',
  },
  {
    title: 'Scan Reports',
    subtitle: 'Clinical exports',
    icon: 'document-text-outline',
    route: '/reports',
  },
  {
    title: 'AI Diagnosis Insights',
    subtitle: 'Model confidence',
    icon: 'analytics-outline',
    route: '/reports',
  },
  {
    title: 'Medical History',
    subtitle: 'Timeline view',
    icon: 'time-outline',
    route: '/profile',
  },
];

const recentActivity = [
  { title: 'Left eye cataract scan', time: 'Today • 10:42 AM', status: 'Assessment ready' },
  { title: 'AI chat follow-up', time: 'Today • 9:16 AM', status: 'Ayurvedic guidance generated' },
  { title: 'Report summary exported', time: 'Yesterday • 6:28 PM', status: 'PDF synced' },
];

const smartSuggestions = [
  'Compare current scan with prior baseline',
  'Ask AI for post-op recovery checklist',
  'Generate a concise physician handoff note',
];

export function HomeDashboardScreen() {
  const user = useSessionStore(state => state.user);
  const hydrated = useSessionStore(state => state.hydrated);
  const scrollY = useSharedValue(0);

  const firstName = useMemo(() => {
    const base = user?.name?.trim() || user?.email || 'Clinician';
    return base.split(' ')[0];
  }, [user?.email, user?.name]);

  const onScroll = useAnimatedScrollHandler(event => {
    scrollY.value = event.contentOffset.y;
  });

  const parallaxOrbStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(scrollY.value, [0, 500], [0, -80]) }],
    opacity: interpolate(scrollY.value, [0, 350], [0.3, 0.12]),
  }));

  const HeaderSkeleton = () => (
    <View className="gap-3">
      <SkeletonBlock style={{ height: 18, width: 140 }} />
      <SkeletonBlock style={{ height: 34, width: 230 }} />
      <SkeletonBlock style={{ height: 82, borderRadius: 22 }} />
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#06080D]" edges={['top']}>
      <View className="flex-1">
        <ScreenBackground />
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: 70,
              right: -80,
              width: 240,
              height: 240,
              borderRadius: 999,
              backgroundColor: 'rgba(108, 159, 255, 0.28)',
            },
            parallaxOrbStyle,
          ]}
        />

        <Animated.ScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, paddingTop: 10 }}
        >
          <Animated.View entering={FadeInDown.duration(550)}>
            <View className="mb-5 flex-row items-center justify-between">
              <View>
                <Text className="text-sm font-semibold uppercase tracking-[0.15em] text-[#7E91B6]">spandaVidya</Text>
                <Text className="mt-1 text-3xl font-black text-[#F6FAFF]">Hello, {firstName}</Text>
              </View>
              <PressableScale
                onPress={() => router.push('/profile')}
                style={{
                  height: 48,
                  width: 48,
                  borderRadius: 24,
                  borderWidth: 1,
                  borderColor: 'rgba(189, 210, 248, 0.38)',
                  backgroundColor: 'rgba(15, 24, 38, 0.88)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text className="text-base font-bold text-[#E8F1FF]">{firstName.slice(0, 1).toUpperCase()}</Text>
              </PressableScale>
            </View>
          </Animated.View>

          {!hydrated ? (
            <HeaderSkeleton />
          ) : (
            <Animated.View entering={FadeInDown.duration(600).delay(80)}>
              <LinearGradient
                colors={['rgba(107,154,255,0.24)', 'rgba(120,207,191,0.16)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ borderRadius: 24, padding: 1 }}
              >
                <GlassCard style={{ borderWidth: 0, backgroundColor: 'rgba(12, 19, 32, 0.92)' }}>
                  <Text className="text-sm font-semibold uppercase tracking-[0.15em] text-[#94A9CF]">AI Workspace</Text>
                  <Text className="mt-1 text-lg font-bold text-[#F7FBFF]">What do you want to analyze today?</Text>
                  <View className="mt-3 rounded-2xl border border-[#C7D9FF26] bg-[#0A1220D6] px-3 py-2">
                    <TextInput
                      placeholder="Ask AI about scans, reports, or Ayurvedic insights"
                      placeholderTextColor="#6E80A0"
                      className="min-h-12 text-[15px] text-[#EEF5FF]"
                    />
                  </View>
                  <View className="mt-3 flex-row gap-2">
                    <PressableScale
                      onPress={() => Alert.alert('Voice input', 'Voice AI input will open from the chat flow.')}
                      style={{
                        flex: 1,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: 'rgba(188, 210, 250, 0.26)',
                        backgroundColor: 'rgba(17, 27, 42, 0.82)',
                        paddingVertical: 11,
                        alignItems: 'center',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                    >
                      <Ionicons name="mic-outline" size={16} color="#D8E7FF" />
                      <Text className="text-xs font-bold uppercase tracking-[0.08em] text-[#D8E7FF]">Voice</Text>
                    </PressableScale>
                    <PressableScale
                      onPress={() => router.push('/data-collection')}
                      style={{
                        flex: 1,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: 'rgba(188, 210, 250, 0.26)',
                        backgroundColor: 'rgba(17, 27, 42, 0.82)',
                        paddingVertical: 11,
                        alignItems: 'center',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                    >
                      <Ionicons name="image-outline" size={16} color="#D8E7FF" />
                      <Text className="text-xs font-bold uppercase tracking-[0.08em] text-[#D8E7FF]">Upload Image</Text>
                    </PressableScale>
                    <PressableScale
                      onPress={() => router.push('/chat')}
                      style={{
                        flex: 1,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: 'rgba(188, 210, 250, 0.26)',
                        backgroundColor: 'rgba(17, 27, 42, 0.82)',
                        paddingVertical: 11,
                        alignItems: 'center',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                    >
                      <Ionicons name="document-attach-outline" size={16} color="#D8E7FF" />
                      <Text className="text-xs font-bold uppercase tracking-[0.08em] text-[#D8E7FF]">Upload Doc</Text>
                    </PressableScale>
                  </View>
                </GlassCard>
              </LinearGradient>
            </Animated.View>
          )}

          <Animated.View entering={FadeInDown.duration(640).delay(130)} className="mt-8">
            <Text className="mb-3 text-lg font-bold text-[#F2F7FF]">Quick AI Tools</Text>
            <View className="flex-row flex-wrap justify-between gap-y-3">
              {quickTools.map(tool => (
                <PressableScale
                  key={tool.title}
                  onPress={() => router.push(tool.route as never)}
                  style={{
                    width: '48.4%',
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: 'rgba(177, 199, 236, 0.2)',
                    backgroundColor: 'rgba(11, 17, 28, 0.88)',
                    padding: 14,
                  }}
                >
                  <View className="mb-3 h-10 w-10 items-center justify-center rounded-2xl bg-[#17253A]">
                    <Ionicons name={tool.icon} size={19} color="#AFCBFF" />
                  </View>
                  <Text className="text-sm font-bold leading-5 text-[#F4F8FF]">{tool.title}</Text>
                  <Text className="mt-1 text-xs text-[#8FA2C3]">{tool.subtitle}</Text>
                </PressableScale>
              ))}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(670).delay(180)} className="mt-8">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-[#F2F7FF]">Recent Activity</Text>
              <Text className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8BA0C5]">Timeline</Text>
            </View>
            <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
              {recentActivity.map((item, index) => (
                <View
                  key={item.title}
                  style={{
                    borderBottomWidth: index === recentActivity.length - 1 ? 0 : 1,
                    borderBottomColor: 'rgba(166, 186, 224, 0.18)',
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                  }}
                >
                  <Text className="text-sm font-semibold text-[#F3F8FF]">{item.title}</Text>
                  <Text className="mt-1 text-xs text-[#8CA0C0]">{item.time}</Text>
                  <Text className="mt-1 text-xs font-medium text-[#7CD8C0]">{item.status}</Text>
                </View>
              ))}
            </GlassCard>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(700).delay(220)} className="mt-8">
            <Text className="mb-3 text-lg font-bold text-[#F2F7FF]">Smart Suggestions</Text>
            <View className="gap-3">
              {smartSuggestions.map(suggestion => (
                <PressableScale
                  key={suggestion}
                  onPress={() => router.push('/chat')}
                  style={{
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: 'rgba(177, 199, 236, 0.2)',
                    backgroundColor: 'rgba(11, 17, 28, 0.88)',
                    paddingHorizontal: 14,
                    paddingVertical: 13,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <View className="h-8 w-8 items-center justify-center rounded-xl bg-[#16263C]">
                    <Ionicons name="bulb-outline" size={14} color="#AFCBFF" />
                  </View>
                  <Text className="flex-1 text-sm leading-5 text-[#DCE8FB]">{suggestion}</Text>
                  <Ionicons name="arrow-forward" size={15} color="#7F93B7" />
                </PressableScale>
              ))}
            </View>
          </Animated.View>
        </Animated.ScrollView>
      </View>
    </SafeAreaView>
  );
}

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Image, View, TextInput } from 'react-native';
import Animated, {
  FadeInDown,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard } from '@/components/ui/GlassCard';
import { ErrorNotice } from '@/components/ui/ErrorNotice';
import { PressableScale } from '@/components/ui/PressableScale';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { SkeletonBlock } from '@/components/ui/SkeletonBlock';
import { useTheme } from '@/theme';
import { ThemeText } from '@/components/ui/theme/ThemeText';
import { ThemeDivider } from '@/components/ui/theme/ThemeDivider';
import { ThemeSectionHeader } from '@/components/ui/theme/ThemeSectionHeader';
import { ThemeSurface } from '@/components/ui/theme/ThemeSurface';
import { useSessionStore } from '@/features/auth/store/session-store';
import { usePredictionStore } from '@/store/prediction-store';
import { ImageGuidelinesCard } from '@/features/upload/instructions';

const IMAGE_CROP_FLOW_LOG_PREFIX = '[EyeCropFlow]';

type QuickTool = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
};

const quickTools: QuickTool[] = [
  {
    title: 'AI Health Chat',
    subtitle: 'Live assistant',
    icon: 'sparkles-outline',
    route: '/(tabs)/chat',
  },
  {
    title: 'Scan Reports',
    subtitle: 'Open in profile',
    icon: 'document-text-outline',
    route: '/profile',
  },
  {
    title: 'AI Diagnosis Insights',
    subtitle: 'Open in profile',
    icon: 'analytics-outline',
    route: '/profile',
  },
  {
    title: 'Medical History',
    subtitle: 'Timeline view',
    icon: 'time-outline',
    route: '/profile',
  },
  {
    title: 'Body Insight Form',
    subtitle: 'Digestive wellness',
    icon: 'leaf-outline',
    route: '/body-insight',
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
  const { theme, isDark } = useTheme();
  const user = useSessionStore(state => state.user);
  const hydrated = useSessionStore(state => state.hydrated);
  const setPendingMessage = usePredictionStore(state => state.setPendingMessage);
  
  const scrollY = useSharedValue(0);
  const [chatQuery, setChatQuery] = useState('');
  const [homeError, setHomeError] = useState<{
    title: string;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
  } | null>(null);

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

  

  async function handleSendQueryToAI() {
    if (!chatQuery.trim()) {
      setHomeError({
        title: 'Empty query',
        message: 'Please type a question to ask our AI.',
      });
      return;
    }

    if (!user) {
      setHomeError({
        title: 'Login required',
        message: 'Please login to chat with Spanda AI.',
        actionLabel: 'Login',
        onAction: () => router.push('/login'),
      });
      return;
    }

    const message = chatQuery.trim();
    setChatQuery(''); // Instantly clear input
    setHomeError(null);
    setPendingMessage(message); // Save message to be auto-sent on mount/focus
    router.push('/(tabs)/chat');
  }

  function openChatPage() {
    router.push('/(tabs)/chat');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background.base }} edges={['top']}>
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
              backgroundColor: isDark ? 'rgba(108, 159, 255, 0.28)' : 'rgba(36, 74, 133, 0.05)',
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
                <ThemeText
                  variant="label"
                  style={{ color: isDark ? '#7E91B6' : theme.colors.accent.mutedGold }}
                >
                  spandaVidya
                </ThemeText>
                <ThemeText
                  variant="title"
                  style={{
                    fontSize: 30,
                    fontWeight: '900',
                    color: isDark ? '#F6FAFF' : theme.colors.text.primary,
                    marginTop: 4,
                  }}
                >
                  Hello, {firstName}
                </ThemeText>
              </View>
              <PressableScale
                onPress={() => router.push('/profile')}
                style={{
                  height: 48,
                  width: 48,
                  borderRadius: 24,
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(189, 210, 248, 0.38)' : 'rgba(140, 107, 62, 0.18)',
                  backgroundColor: isDark ? 'rgba(15, 24, 38, 0.88)' : 'rgba(255, 255, 255, 0.88)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {user?.avatarUrl ? (
                  <Image
                    source={{ uri: user.avatarUrl }}
                    resizeMode="cover"
                    style={{ height: '100%', width: '100%' }}
                  />
                ) : (
                  <ThemeText
                    style={{
                      fontSize: 16,
                      fontWeight: 'bold',
                      color: isDark ? '#E8F1FF' : theme.colors.accent.secondary,
                    }}
                  >
                    {firstName.slice(0, 1).toUpperCase()}
                  </ThemeText>
                )}
              </PressableScale>
            </View>
          </Animated.View>

          {!hydrated ? (
            <HeaderSkeleton />
          ) : (
            <Animated.View entering={FadeInDown.duration(600).delay(80)}>
              <ImageGuidelinesCard />
              <LinearGradient
                colors={
                  isDark
                    ? ['rgba(107,154,255,0.24)', 'rgba(120,207,191,0.16)']
                    : ['rgba(140,107,62,0.15)', 'rgba(36,74,133,0.1)']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ borderRadius: 24, padding: 1 }}
              >
                <GlassCard
                  style={{
                    borderWidth: 0,
                    backgroundColor: isDark ? 'rgba(12, 19, 32, 0.92)' : 'rgba(255, 255, 255, 0.92)',
                  }}
                >
                  <ThemeSectionHeader
                    title="Cataract Detection"
                    subtitle="AI Workspace"
                    style={{ marginBottom: 12 }}
                  />
                  <ThemeText
                    style={{
                      color: isDark ? '#8FA2C3' : theme.colors.text.secondary,
                      lineHeight: 22,
                    }}
                    variant="body"
                  >
                    Upload a clear eye image to run your ML cataract prediction. Result is saved and
                    opened in AI chat.
                  </ThemeText>
                  <View className="mt-4">
                    <PressableScale
                      onPress={() => router.push('/scan-upload' as never)}
                      style={{
                        flex: 1,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: isDark ? 'rgba(188, 210, 250, 0.26)' : 'rgba(140, 107, 62, 0.18)',
                        backgroundColor: isDark ? 'rgba(17, 27, 42, 0.82)' : 'rgba(255, 255, 255, 0.92)',
                        paddingVertical: 14,
                        alignItems: 'center',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        gap: 8,
                      }}
                    >
                      <Ionicons name="scan-outline" size={18} color={isDark ? '#D8E7FF' : '#8C6B3E'} />
                      <ThemeText
                        style={{
                          fontSize: 14,
                          fontWeight: 'bold',
                          letterSpacing: 0.8,
                          color: isDark ? '#D8E7FF' : '#8C6B3E',
                          textTransform: 'uppercase',
                        }}
                      >
                        Start Scan
                      </ThemeText>
                    </PressableScale>
                  </View>

                  {homeError ? (
                    <ErrorNotice
                      title={homeError.title}
                      message={homeError.message}
                      actionLabel={homeError.actionLabel}
                      onAction={homeError.onAction}
                      onDismiss={() => setHomeError(null)}
                      compact
                      style={{ marginTop: 12 }}
                    />
                  ) : null}
                </GlassCard>
              </LinearGradient>

              {/* ── Chat with Spanda AI input section ── */}
              <View className="mt-4">
                <LinearGradient
                  colors={
                    isDark
                      ? ['rgba(120,207,191,0.20)', 'rgba(107,154,255,0.12)']
                      : ['rgba(36, 74, 133, 0.12)', 'rgba(140, 107, 62, 0.08)']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ borderRadius: 24, padding: 1 }}
                >
                  <GlassCard
                    style={{
                      borderWidth: 0,
                      backgroundColor: isDark ? 'rgba(11, 18, 30, 0.92)' : 'rgba(255, 255, 255, 0.92)',
                      padding: 16,
                    }}
                  >
                    <PressableScale
                      onPress={openChatPage}
                      style={{
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: isDark ? 'rgba(120,207,191,0.22)' : 'rgba(36, 74, 133, 0.12)',
                        backgroundColor: isDark ? 'rgba(10, 16, 26, 0.75)' : 'rgba(36, 74, 133, 0.04)',
                        paddingHorizontal: 10,
                        paddingVertical: 10,
                        marginBottom: 10,
                      }}
                    >
                      <View className="flex-row items-center gap-2 mb-2">
                        <View
                          style={{
                            height: 28,
                            width: 28,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 8,
                            backgroundColor: isDark ? 'rgba(120,207,191,0.18)' : 'rgba(36, 74, 133, 0.08)',
                          }}
                        >
                          <Ionicons name="chatbubbles-outline" size={15} color={isDark ? '#8C6B3E' : '#244A85'} />
                        </View>
                        <ThemeText
                          style={{
                            fontWeight: 'bold',
                            color: isDark ? '#F7FBFF' : '#111827',
                          }}
                          variant="body"
                        >
                          Chat with Spanda AI
                        </ThemeText>
                        <View className="flex-1" />
                        <Ionicons name="arrow-forward" size={16} color={isDark ? '#8FB1E3' : '#244A85'} />
                      </View>
                      <ThemeText
                        style={{
                          color: isDark ? '#8FA2C3' : '#6B7280',
                          lineHeight: 18,
                        }}
                        variant="caption"
                      >
                        Tap here to open full AI Chat page.
                      </ThemeText>
                    </PressableScale>

                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        backgroundColor: isDark ? '#090F18' : 'rgba(140, 107, 62, 0.04)',
                        borderWidth: 1,
                        borderColor: isDark ? '#C7D9FF1A' : 'rgba(140, 107, 62, 0.12)',
                        borderRadius: 12,
                        paddingHorizontal: 12,
                        paddingVertical: 4,
                      }}
                    >
                      <TextInput
                        value={chatQuery}
                        onChangeText={setChatQuery}
                        placeholder="Ask anything or consult about eye symptoms..."
                        placeholderTextColor={isDark ? '#5C6F8E' : '#6B7280'}
                        onSubmitEditing={handleSendQueryToAI}
                        style={{
                          flex: 1,
                          color: isDark ? '#E8F1FF' : '#111827',
                          fontSize: 13,
                          paddingVertical: 8,
                        }}
                      />
                      <PressableScale
                        onPress={handleSendQueryToAI}
                        style={{
                          height: 32,
                          width: 32,
                          borderRadius: 8,
                          backgroundColor: isDark ? '#1E2D44' : '#244A85',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Ionicons name="send" size={13} color={isDark ? '#8C6B3E' : '#FFFFFF'} />
                      </PressableScale>
                    </View>
                  </GlassCard>
                </LinearGradient>
              </View>
            </Animated.View>
          )}

          <Animated.View entering={FadeInDown.duration(640).delay(130)} className="mt-8">
            <ThemeSectionHeader title="Quick AI Tools" />
            <View className="flex-row flex-wrap justify-between gap-y-3">
              {quickTools.map(tool => (
                <PressableScale
                  key={tool.title}
                  onPress={() => router.push(tool.route as never)}
                  style={{
                    width: '48.4%',
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(177, 199, 236, 0.2)' : 'rgba(140, 107, 62, 0.12)',
                    backgroundColor: isDark ? 'rgba(11, 17, 28, 0.88)' : '#FFFFFF',
                    padding: 14,
                    shadowColor: isDark ? '#000000' : '#8C6B3E',
                    shadowOpacity: isDark ? 0 : 0.02,
                    shadowOffset: { width: 0, height: 4 },
                    shadowRadius: 8,
                    elevation: isDark ? 0 : 1,
                  }}
                >
                  <ThemeSurface
                    variant="elevated"
                    style={{
                      height: 40,
                      width: 40,
                      borderRadius: 16,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 12,
                      backgroundColor: isDark ? '#17253A' : 'rgba(36, 74, 133, 0.08)',
                    }}
                  >
                    <Ionicons name={tool.icon} size={19} color={isDark ? '#AFCBFF' : '#244A85'} />
                  </ThemeSurface>
                  <ThemeText
                    style={{
                      fontSize: 14,
                      fontWeight: 'bold',
                      lineHeight: 20,
                      color: isDark ? '#F4F8FF' : '#111827',
                    }}
                    variant="body"
                  >
                    {tool.title}
                  </ThemeText>
                  <ThemeText
                    style={{
                      marginTop: 4,
                      fontSize: 12,
                      color: isDark ? '#8FA2C3' : '#6B7280',
                    }}
                    variant="caption"
                  >
                    {tool.subtitle}
                  </ThemeText>
                </PressableScale>
              ))}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(670).delay(180)} className="mt-8">
            <ThemeSectionHeader
              title="Recent Activity"
              action={
                <ThemeText
                  style={{ color: isDark ? '#8BA0C5' : theme.colors.accent.mutedGold }}
                  variant="label"
                >
                  Timeline
                </ThemeText>
              }
            />
            <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
              {recentActivity.map((item, index) => (
                <View key={item.title}>
                  {index > 0 && (
                    <ThemeDivider style={{ marginVertical: 0 }} />
                  )}
                  <View
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                    }}
                  >
                    <ThemeText
                      style={{
                        fontWeight: '600',
                        color: isDark ? '#F3F8FF' : '#111827',
                      }}
                      variant="body"
                    >
                      {item.title}
                    </ThemeText>
                    <ThemeText
                      style={{
                        marginTop: 4,
                        color: isDark ? '#8CA0C0' : '#6B7280',
                      }}
                      variant="caption"
                    >
                      {item.time}
                    </ThemeText>
                    <ThemeText
                      style={{
                        marginTop: 4,
                        fontWeight: '500',
                        color: theme.colors.accent.mutedGold,
                      }}
                      variant="caption"
                    >
                      {item.status}
                    </ThemeText>
                  </View>
                </View>
              ))}
            </GlassCard>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(700).delay(220)} className="mt-8">
            <ThemeSectionHeader title="Smart Suggestions" />
            <View className="gap-3">
              {smartSuggestions.map(suggestion => (
                <PressableScale
                  key={suggestion}
                  onPress={() => router.push('/(tabs)/chat')}
                  style={{
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(177, 199, 236, 0.2)' : 'rgba(140, 107, 62, 0.12)',
                    backgroundColor: isDark ? 'rgba(11, 17, 28, 0.88)' : '#FFFFFF',
                    paddingHorizontal: 14,
                    paddingVertical: 13,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    shadowColor: isDark ? '#000000' : '#8C6B3E',
                    shadowOpacity: isDark ? 0 : 0.02,
                    shadowOffset: { width: 0, height: 4 },
                    shadowRadius: 8,
                    elevation: isDark ? 0 : 1,
                  }}
                >
                  <ThemeSurface
                    variant="elevated"
                    style={{
                      height: 32,
                      width: 32,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isDark ? '#16263C' : 'rgba(140, 107, 62, 0.08)',
                    }}
                  >
                    <Ionicons name="bulb-outline" size={14} color={isDark ? '#AFCBFF' : '#8C6B3E'} />
                  </ThemeSurface>
                  <ThemeText
                    style={{
                      flex: 1,
                      fontSize: 14,
                      lineHeight: 20,
                      color: isDark ? '#DCE8FB' : '#111827',
                    }}
                    variant="body"
                  >
                    {suggestion}
                  </ThemeText>
                  <Ionicons name="arrow-forward" size={15} color={isDark ? '#7F93B7' : '#8C6B3E'} />
                </PressableScale>
              ))}
            </View>
          </Animated.View>
        </Animated.ScrollView>
      </View>
    </SafeAreaView>
  );
}

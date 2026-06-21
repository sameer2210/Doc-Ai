import React, { useCallback, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, {
  FadeInDown,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { useTheme } from '@/theme';
import { useSessionStore } from '@/features/auth/store/session-store';
import { SkeletonBlock } from '@/components/ui/SkeletonBlock';
import { BodyInsightCard } from '@/features/body-insight/components/body-insight-card';
// import { useIsFocused } from '@react-navigation/native';
// import { usePredictionStore } from '@/store/prediction-store';
// import { useUploadWorkflowStore } from '@/features/upload/store/upload-workflow-store';

import {
  GreetingHeader,
  CataractHeroCard,
  AiConsultationCard,
  ToolsEntryCard,
  SmartSuggestionsSection,
} from '../components';

export function HomeDashboardScreen() {
  const { theme, isDark } = useTheme();
  const hydrated = useSessionStore(state => state.hydrated);
  const user = useSessionStore(state => state.user);
  const scrollY = useSharedValue(0);
  // const isFocused = useIsFocused();

  // useEffect(() => {
  //   if (isFocused) {
  //     usePredictionStore.getState().clearPending();
  //     useUploadWorkflowStore.getState().clearWorkflow();
  //   }
  // }, [isFocused]);

  const onScroll = useAnimatedScrollHandler(event => {
    scrollY.value = event.contentOffset.y;
  });

  const parallaxOrbStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(scrollY.value, [0, 500], [0, -80]) }],
    opacity: interpolate(scrollY.value, [0, 350], [0.3, 0.12]),
  }));

  const handleStartScan = useCallback(() => {
    router.push('/scan-upload');
  }, []);

  const handleOpenBodyInsight = useCallback(() => {
    router.push('/body-insight');
  }, []);

  const handleOpenChat = useCallback(() => {
    router.push('/(tabs)/chat');
  }, []);

  const handleOpenTools = useCallback(() => {
    router.push('/tools' as never);
  }, []);

  const DashboardSkeleton = () => (
    <View style={styles.skeletonContainer}>
      <SkeletonBlock style={styles.skeletonTitle} />
      <SkeletonBlock style={styles.skeletonSubtitle} />
      <SkeletonBlock style={styles.skeletonCard} />
      <SkeletonBlock style={styles.skeletonCard} />
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background.base }]} edges={['top']}>
      <View style={styles.flex1}>
        <ScreenBackground />

        <Animated.View
          pointerEvents="none"
          style={[
            styles.parallaxOrb,
            {
              backgroundColor: isDark ? 'rgba(108, 159, 255, 0.28)' : 'rgba(36, 74, 133, 0.05)',
            },
            parallaxOrbStyle,
          ]}
        />

        <Animated.ScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {!hydrated ? (
            <DashboardSkeleton />
          ) : (
            <Animated.View entering={FadeInDown.duration(600)}>
              {/* Greeting Header */}
              <GreetingHeader />

              {/* Priority 1: Large Hero Cataract Detection Card */}
              <CataractHeroCard onPress={handleStartScan} />

              {/* Body Insight Profile Card (Secondary CTA) */}
              <BodyInsightCard
                variant="home"
                completed={user?.bodyInsightCompleted ?? false}
                onPress={handleOpenBodyInsight}
              />

              {/* Priority 2: SpandaVidya AI Consultation Card */}
              <AiConsultationCard onPress={handleOpenChat} />

              {/* Priority 3: More Tools Card */}
              <ToolsEntryCard onPress={handleOpenTools} />

              {/* Smart Suggestions Section */}
              <SmartSuggestionsSection />
            </Animated.View>
          )}
        </Animated.ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex1: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 48,
    paddingTop: 10,
  },
  parallaxOrb: {
    position: 'absolute',
    top: 70,
    right: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
  },
  skeletonContainer: {
    gap: 12,
  },
  skeletonTitle: {
    height: 18,
    width: 140,
  },
  skeletonSubtitle: {
    height: 34,
    width: 230,
    marginTop: 8,
  },
  skeletonCard: {
    height: 120,
    borderRadius: 22,
    marginTop: 12,
  },
});

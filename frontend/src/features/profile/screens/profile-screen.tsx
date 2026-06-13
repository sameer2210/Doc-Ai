import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { useTheme } from '@/theme';
import { logoutMobile } from '@/features/auth/api/auth-api';
import { useSessionStore } from '@/features/auth/store/session-store';
import { clearNativeGoogleSession } from '@/services/auth/google-auth';
import { cancelAuthRefresh } from '@/shared/api/http-client';
import { clearUserScopedClientState } from '@/shared/auth/client-session-boundary';
import { clearPersistedSession } from '@/shared/auth/token-storage';

import { ProfileHeader } from '../components/profile-header';
import { ProfileInfoCard } from '../components/profile-info-card';
import { ProfileActionItem } from '../components/profile-action-item';
import { ThemeText } from '@/components/ui/theme/ThemeText';
import { ThemeSectionHeader } from '@/components/ui/theme/ThemeSectionHeader';

export function ProfileScreen() {
  const { theme } = useTheme();
  const refreshToken = useSessionStore((state) => state.refreshToken);
  const clearSession = useSessionStore((state) => state.clearSession);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    const refreshTokenToRevoke = refreshToken;

    cancelAuthRefresh();
    clearUserScopedClientState();
    clearSession();

    try {
      const results = await Promise.allSettled([
        logoutMobile(refreshTokenToRevoke),
        clearNativeGoogleSession({ revokeAccess: true }),
        clearPersistedSession(),
      ]);

      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.warn('[Auth][Logout] Logout cleanup step failed.', {
            step: ['backend', 'google-native', 'storage'][index],
            message: result.reason instanceof Error ? result.reason.message : 'Unknown logout error',
          });
        }
      });
    } finally {
      router.replace('/login');
      setIsLoggingOut(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background.base }]} edges={['top']}>
      <View style={styles.flex1}>
        <ScreenBackground />

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header titles */}
          <Animated.View entering={FadeInDown.duration(520)} style={styles.headerContainer}>
            <ThemeText style={styles.headerLabel}>profile</ThemeText>
            <ThemeText style={styles.headerTitle}>Account & Security</ThemeText>
          </Animated.View>

          {/* Account Card */}
          <Animated.View entering={FadeInDown.duration(580).delay(120)} style={styles.section}>
            <ProfileHeader />
            <ProfileInfoCard />
          </Animated.View>

          {/* Actions */}
          <Animated.View entering={FadeInDown.duration(620).delay(200)} style={styles.actionsSection}>
            <ThemeSectionHeader title="Quick Actions" />
            <ProfileActionItem
              icon="document-text-outline"
              title="View Reports"
              description="Review your previous clinical and cataract screening scans"
              onPress={() => router.push('/reports')}
            />

            <ThemeSectionHeader title="System Settings" style={styles.sectionTitle} />
            <ProfileActionItem
              icon="settings-outline"
              title="App Settings"
              description="Configure themes, notification triggers, and privacy modes"
              onPress={() => router.push('/settings' as any)}
            />

            <ThemeSectionHeader title="Account Actions" style={styles.sectionTitle} />
            <ProfileActionItem
              icon="log-out-outline"
              title="Sign Out"
              description="Logout from Spanda AI on this device securely"
              isDestructive
              loading={isLoggingOut}
              onPress={handleLogout}
            />
          </Animated.View>
        </ScrollView>
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
    paddingTop: 12,
    paddingBottom: 48,
  },
  headerContainer: {
    marginBottom: 20,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.6,
    opacity: 0.7,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    fontFamily: 'SpaceGrotesk_700Bold',
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  actionsSection: {
    gap: 12,
  },
  sectionTitle: {
    marginTop: 12,
  },
});

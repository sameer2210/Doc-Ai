import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { useTheme } from '@/theme';
import { PressableScale } from '@/components/ui/PressableScale';
import { ThemeText } from '@/components/ui/theme/ThemeText';
import { ProfileActionItem } from '@/features/profile/components/profile-action-item';

import { SettingsSection } from '../components/settings-section';
import {
  APPEARANCE_SECTION_ITEMS,
  GENERAL_SECTION_ITEMS,
  SUPPORT_SECTION_ITEMS,
} from '../constants/settings-items';

export function SettingsScreen() {
  const { theme } = useTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background.base }]} edges={['top']}>
      <View style={styles.flex1}>
        <ScreenBackground />

        {/* Header with Back Trigger */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border.subtle }]}>
          <PressableScale onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color={theme.colors.text.primary} />
          </PressableScale>
          <ThemeText style={styles.headerTitle}>Settings</ThemeText>
          <View style={styles.headerRightPlaceholder} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Animated.View entering={FadeInDown.duration(500)}>
            {/* Appearance settings */}
            <SettingsSection title="Appearance">
              {APPEARANCE_SECTION_ITEMS.map((item) => (
                <ProfileActionItem
                  key={item.title}
                  icon={item.icon}
                  title={item.title}
                  description={item.description}
                  onPress={() => item.route && router.push(item.route as any)}
                />
              ))}
            </SettingsSection>

            {/* General Preferences placeholder */}
            <SettingsSection title="General Preferences">
              {GENERAL_SECTION_ITEMS.map((item) => (
                <ProfileActionItem
                  key={item.title}
                  icon={item.icon}
                  title={item.title}
                  description={item.tag ? `${item.description} (${item.tag})` : item.description}
                  disabled={item.disabled}
                  onPress={() => {}}
                />
              ))}
            </SettingsSection>

            {/* Help & Support placeholder */}
            <SettingsSection title="Support & Info">
              {SUPPORT_SECTION_ITEMS.map((item) => (
                <ProfileActionItem
                  key={item.title}
                  icon={item.icon}
                  title={item.title}
                  description={item.tag ? `${item.description} (${item.tag})` : item.description}
                  disabled={item.disabled}
                  onPress={() => {}}
                />
              ))}
            </SettingsSection>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  headerRightPlaceholder: {
    width: 30,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 48,
  },
});

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { useTheme } from '@/theme';
import { PressableScale } from '@/components/ui/PressableScale';
import { ThemeText } from '@/components/ui/theme/ThemeText';
import { ThemeSectionHeader } from '@/components/ui/theme/ThemeSectionHeader';
import { AppearanceOptionCard } from '../components/appearance-option-card';

export function AppearanceScreen() {
  const { theme, themeMode, setThemeMode } = useTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background.base }]} edges={['top']}>
      <View style={styles.flex1}>
        <ScreenBackground />

        {/* Header with Back Trigger */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border.subtle }]}>
          <PressableScale onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color={theme.colors.text.primary} />
          </PressableScale>
          <ThemeText style={styles.headerTitle}>Appearance</ThemeText>
          <View style={styles.headerRightPlaceholder} />
        </View>

        <View style={styles.content}>
          <Animated.View entering={FadeInDown.duration(500)}>
            <ThemeSectionHeader title="Theme Selection" style={styles.sectionTitle} />

            <AppearanceOptionCard
              icon="sunny-outline"
              title="Light Theme"
              description="A clean, high-contrast, premium medical screening portal feel"
              isSelected={themeMode === 'light'}
              onPress={() => void setThemeMode('light')}
            />

            <AppearanceOptionCard
              icon="moon-outline"
              title="Dark Theme"
              description="A comfortable, dark slate palette optimized for low-light environments"
              isSelected={themeMode === 'dark'}
              onPress={() => void setThemeMode('dark')}
            />

            <AppearanceOptionCard
              icon="options-outline"
              title="System Theme"
              description="Automatically matches your device's global operating system scheme"
              isSelected={themeMode === 'system'}
              onPress={() => void setThemeMode('system')}
            />
          </Animated.View>
        </View>
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
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sectionTitle: {
    marginBottom: 16,
  },
});

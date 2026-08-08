import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { ThemeText } from '@/components/ui/theme/ThemeText';
import { EyeScanIllustration } from '@/components/illustrations';
import { useTheme } from '@/theme';
import { ScanUploadCard, UploadActionButtons } from '../components/scan-upload-card';
import { ImageGuidelinesCard } from '../instructions/components/image-guidelines-card';

export function UploadScreen() {
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.base }}>
      <ScreenBackground />
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Start Eye Scan',
          headerStyle: {
            backgroundColor: colors.background.base,
          },
          headerTintColor: colors.text.primary,
          headerShadowVisible: false,
          headerBackTitle: 'Back',
        }}
      />
      <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Priority 1: Hero AI Eye Scanning Vector Illustration */}
          <View style={styles.illustrationWrap}>
            <EyeScanIllustration width={220} height={190} />
          </View>

          {/* Priority 2: Photo Capture Guidelines */}
          <View style={styles.guidelinesSection}>
            <ImageGuidelinesCard />
          </View>
          {/* Priority 3: Large New Scan Visual Feature Card */}
          <ScanUploadCard />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  illustrationWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  guidelinesSection: {
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
    marginLeft: 4,
  },
});

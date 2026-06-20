import React from 'react';
import { View, ScrollView, Text } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { useTheme } from '@/theme';
import { ScanUploadCard } from '../components/scan-upload-card';
import { ImageGuidelinesCard } from '../instructions/components/image-guidelines-card';

export function UploadScreen() {
  const { theme, isDark } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background.base }}>
      <ScreenBackground />
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Upload Scan',
          headerStyle: {
            backgroundColor: isDark ? theme.colors.background.base : '#fff',
          },
          headerTintColor: isDark ? '#E8F1FF' : '#111827',
          headerShadowVisible: false,
          headerBackTitle: 'Back',
        }}
      />
      
      <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <ScanUploadCard />
          
          <View className="mt-4">
            <Text
              style={{ color: isDark ? '#E8F1FF' : '#111827' }}
              className="text-lg font-bold mb-4 ml-1"
            >
              Guidelines
            </Text>
            <ImageGuidelinesCard />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

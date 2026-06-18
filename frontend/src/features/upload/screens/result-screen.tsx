import React, { useEffect, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { useTheme } from '@/theme';
import { usePredictionStore } from '@/store/prediction-store';
import { useUploadWorkflowStore } from '../store/upload-workflow-store';
import { UserScanSummaryCard } from '@/features/chat/components/user-scan-summary-card';
import { ResultActions } from '../components/result-actions';
import { ThemeText } from '@/components/ui/theme/ThemeText';
import { ErrorNotice } from '@/components/ui/ErrorNotice';
import { Button } from '@/components/ui/Button';
import { getUploadValidationMessage } from '@/shared/uploads/upload-errors';

export function ResultScreen() {
  const { theme } = useTheme();
  const { colors, spacing, radii } = theme;
  const router = useRouter();
  const workflow = useUploadWorkflowStore(state => state);
  
  // Take a snapshot on mount so clearing the store doesn't break the UI or trigger redirects.
  const [localPrediction] = useState(() => usePredictionStore.getState().pending);
  const [lastErrorCode] = useState(() => useUploadWorkflowStore.getState().lastErrorCode);

  // If we somehow get here without a prediction or error originally, go back
  useEffect(() => {
    if (!localPrediction && !lastErrorCode) {
      router.replace('/scan-upload' as never);
    }
  }, [localPrediction, lastErrorCode, router]);

  if (!localPrediction && !lastErrorCode) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background.base }}>
        <ScreenBackground />
      </View>
    );
  }

  const handleRetakeScan = () => {
    workflow.setLastErrorCode(null);
    workflow.clearWorkflow();
    usePredictionStore.getState().clearPending();
    router.replace('/scan-upload' as never);
  };

  const handleGoHome = () => {
    workflow.setLastErrorCode(null);
    workflow.clearWorkflow();
    usePredictionStore.getState().clearPending();
    router.replace('/(tabs)' as never);
  };

  const getFriendlyErrorMessage = (code: string) => {
    switch (code) {
      case 'NO_INTERNET':
        return 'Internet connection is required for analysis.';
      case 'UPLOAD_FAILED':
        return 'Image upload failed. Please check your connection and try again.';
      case 'AI_TIMEOUT':
        return 'AI service is temporarily busy. Please try again shortly.';
      case 'ANALYSIS_FAILED':
        return 'Unable to complete analysis at this time. Please ensure the scan is clear and retake.';
      default:
        return getUploadValidationMessage(code as any);
    }
  };

  const errorMessage = lastErrorCode ? getFriendlyErrorMessage(lastErrorCode) : 'Unable to complete analysis at this time.';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background.base }}>
      <ScreenBackground />
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.background.base,
          },
          headerTitle: () => (
            <ThemeText style={{ color: colors.text.primary, fontSize: 20, fontWeight: '700', marginBottom: spacing.xs }} allowFontScaling>
              {lastErrorCode ? 'Analysis Failed' : 'Scan Result'}
            </ThemeText>
          ),
          headerTintColor: colors.text.primary,
          headerShadowVisible: false,
          headerLeft: () => null, // Prevent going back via header
          gestureEnabled: false,
        }}
      />
      
      <SafeAreaView style={{ flex: 1 }} edges={['bottom', 'left', 'right']}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.xxl }}
          showsVerticalScrollIndicator={false}
        >
          {lastErrorCode ? (
            <View style={{ gap: spacing.lg }}>
              <ErrorNotice
                title="Analysis Failed"
                message={errorMessage}
                compact={false}
              />
              
              <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
                <Button
                  label="Retake Scan"
                  variant="primary"
                  icon={<Ionicons name="camera-outline" size={18} color={colors.background.base} />}
                  onPress={handleRetakeScan}
                />

                <Button
                  label="Return Home"
                  variant="secondary"
                  icon={<Ionicons name="home-outline" size={18} color={colors.text.primary} />}
                  onPress={handleGoHome}
                />
              </View>
            </View>
          ) : localPrediction ? (
            <View>
              <View style={{ marginBottom: spacing.lg }}>
                <UserScanSummaryCard
                  prediction={localPrediction.prediction}
                  confidence={localPrediction.confidence}
                />
              </View>

              <ResultActions prediction={localPrediction} />

              <View style={{ marginTop: spacing.xxl, padding: spacing.lg, borderRadius: radii.xl, backgroundColor: colors.warningSurface, borderWidth: 1, borderColor: colors.text.warning }} accessibilityLabel="medical disclaimer">
                <ThemeText style={{ fontSize: 12, color: colors.text.warning, textAlign: 'center', lineHeight: 20 }} allowFontScaling>
                  This screening result is generated by an AI system and is not a medical diagnosis. Please consult a qualified ophthalmologist for professional evaluation and treatment decisions.
                </ThemeText>
              </View>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

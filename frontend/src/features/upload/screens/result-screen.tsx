import React, { useEffect, useState } from 'react';
import { View, ScrollView, BackHandler, StyleSheet } from 'react-native';
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
import { PressableScale } from '@/components/ui/PressableScale';
import { EyeAnalysisFailedIllustration } from '@/components/illustrations';
import {
  getUploadErrorDetails,
  type UploadPipelineErrorCode,
} from '@/shared/uploads/upload-errors';
import { EyeValidationStatus } from '@/shared/types/eye-validation';

export function ResultScreen() {
  const { theme, isDark } = useTheme();
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

  // Clean up store state and redirect on Android physical back button
  useEffect(() => {
    const onBackPress = () => {
      workflow.setLastErrorCode(null);
      workflow.clearWorkflow();
      usePredictionStore.getState().clearPending();
      router.replace('/(tabs)' as never);
      return true; // Consume the back button press event
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [workflow, router]);

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

  const handleViewInstructions = () => {
    router.push('/instructions');
  };

  const errorDetails = lastErrorCode
    ? getUploadErrorDetails(lastErrorCode as UploadPipelineErrorCode)
    : { title: 'Analysis Could Not Be Completed', message: 'The scan could not be analyzed. This usually happens because the image quality was insufficient or unclear.' };

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
            <ThemeText
              style={{
                color: colors.text.primary,
                fontSize: lastErrorCode ? 24 : 20,
                fontWeight: '800',
                letterSpacing: -0.4,
                marginBottom: spacing.xs,
              }}
              allowFontScaling
            >
              {lastErrorCode ? errorDetails.title : 'Scan Result'}
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
          contentContainerStyle={{ flexGrow: 1, padding: spacing.xl, paddingBottom: spacing.xxl }}
          showsVerticalScrollIndicator={false}
        >
          {lastErrorCode ? (
            <View style={{ flex: 1, justifyContent: 'space-between', marginTop: spacing.sm }}>
              {/* Centered Recovery Content Container */}
              <View style={{ flex: 1, justifyContent: 'center', gap: spacing.md, marginVertical: spacing.sm }}>
                {/* Premium Medical SVG Vector Illustration */}
                <View style={{ alignItems: 'center', marginBottom: spacing.xs }}>
                  <EyeAnalysisFailedIllustration width={200} height={170} />
                </View>

                <ErrorNotice
                  title={errorDetails.title}
                  message={errorDetails.message}
                  compact={false}
                />

                {/* Compact Capture Guidance Surface */}
                <View
                  style={{
                    padding: spacing.lg,
                    borderRadius: radii.xl,
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
                    borderWidth: 1,
                    borderColor: colors.border.subtle,
                    gap: spacing.md,
                  }}
                >
                  <ThemeText
                    variant="caption"
                    style={{
                      color: colors.text.tertiary,
                      fontWeight: '600',
                      letterSpacing: 0.5,
                      textTransform: 'uppercase',
                    }}
                  >
                    Quick Photo Tips
                  </ThemeText>

                  {/* 3 Tips Horizontal Summary */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: spacing.xs,
                      paddingBottom: spacing.xs,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                      <Ionicons name="eye-outline" size={16} color={colors.accent.primary} />
                      <ThemeText variant="caption" style={{ color: colors.text.primary, fontWeight: '500' }}>
                        Centered Eye
                      </ThemeText>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                      <Ionicons name="sunny-outline" size={16} color={colors.accent.primary} />
                      <ThemeText variant="caption" style={{ color: colors.text.primary, fontWeight: '500' }}>
                        Good Lighting
                      </ThemeText>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                      <Ionicons name="aperture-outline" size={16} color={colors.accent.primary} />
                      <ThemeText variant="caption" style={{ color: colors.text.primary, fontWeight: '500' }}>
                        Sharp Focus
                      </ThemeText>
                    </View>
                  </View>

                  {/* Quiet link to full guide */}
                  <PressableScale
                    onPress={handleViewInstructions}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      alignSelf: 'flex-start',
                      gap: spacing.xs,
                      marginTop: spacing.xs,
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="View full capture guide"
                  >
                    <ThemeText
                      style={{
                        fontSize: 13,
                        fontWeight: '600',
                        color: colors.accent.primary,
                      }}
                    >
                      View full guide
                    </ThemeText>
                    <Ionicons name="arrow-forward" size={14} color={colors.accent.primary} />
                  </PressableScale>
                </View>
              </View>

              {/* Bottom Action Section: Clear Action Header + Primary & Secondary CTAs */}
              <View style={{ gap: spacing.md, marginTop: spacing.lg, paddingBottom: spacing.xs }}>
                <ThemeText
                  variant="caption"
                  style={{
                    color: colors.text.secondary,
                    fontWeight: '700',
                    letterSpacing: 0.8,
                    textTransform: 'uppercase',
                    marginBottom: spacing.xs,
                  }}
                >
                  Recommended Action
                </ThemeText>

                <Button
                  label="Retake Scan"
                  variant="primary"
                  icon={
                    <View style={{ marginRight: 8 }}>
                      <Ionicons
                        name="camera-outline"
                        size={18}
                        color={colors.background.base}
                      />
                    </View>
                  }
                  onPress={handleRetakeScan}
                />
                
                <Button
                  label="Return Home"
                  variant="secondary"
                  icon={
                    <View style={{ marginRight: 8 }}>
                      <Ionicons
                        name="home-outline"
                        size={18}
                        color={colors.text.primary}
                      />
                    </View>
                  }
                  onPress={handleGoHome}
                />
              </View>
            </View>
          ) : localPrediction ? (
            <View>
              {localPrediction.eyeValidation?.status === EyeValidationStatus.SKIPPED && (
                <View
                  style={[
                    styles.warningBanner,
                    {
                      marginBottom: spacing.md,
                      padding: spacing.md,
                      borderRadius: radii.lg,
                      backgroundColor: colors.warningSurface,
                      borderColor: colors.text.warning,
                      gap: spacing.sm,
                    },
                  ]}
                  accessibilityLabel="eye validation skipped warning"
                >
                  <Ionicons name="warning-outline" size={20} color={colors.text.warning} />
                  <ThemeText style={[styles.warningText, { color: colors.text.warning }]} allowFontScaling>
                    {localPrediction.eyeValidation.message ||
                      'Eye pre-validation was skipped due to temporary service unavailability.'}
                  </ThemeText>
                </View>
              )}

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

const styles = StyleSheet.create({
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
  },
});

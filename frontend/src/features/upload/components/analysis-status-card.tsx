import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { GlassCard } from '@/components/ui/GlassCard';
import { ThemeText } from '@/components/ui/theme/ThemeText';
import { useTheme } from '@/theme';
import { useUploadWorkflowStore } from '../store/upload-workflow-store';
import type { UploadProgressStage } from '../types/image.types';

const PROGRESS_STAGE_MESSAGES: Record<UploadProgressStage, string> = {
  image_selected: 'Image selected',
  cropping_image: 'Cropping image...',
  optimizing_image: 'Optimizing image quality...',
  image_ready: 'Image ready for upload...',
  checking_internet: 'Checking connection...',
  validating_image: 'Validating image quality...',
  preparing_image: 'Preparing image for analysis...',
  uploading_image: 'Uploading to secure server...',
  image_uploaded: 'Upload complete',
  connecting_ai_engine: 'Initializing AI engine...',
  analyzing_eye: 'Analyzing eye structures...',
  generating_diagnosis: 'Generating preliminary findings...',
  preparing_report: 'Finalizing scan report...',
  analysis_complete: 'Analysis complete',
};

export function AnalysisStatusCard() {
  const { theme } = useTheme();
  const { colors, spacing } = theme;
  const currentProgressState = useUploadWorkflowStore(state => state.currentProgressState);

  return (
    <GlassCard style={{ padding: spacing.xxl, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl, height: 96 }}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </View>

      <ThemeText
        style={{ color: colors.text.primary, fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: spacing.xs }}
        allowFontScaling
      >
        Analyzing Scan
      </ThemeText>

      <ThemeText
        style={{ color: colors.text.secondary, textAlign: 'center' }}
        allowFontScaling
      >
        {PROGRESS_STAGE_MESSAGES[currentProgressState] || 'Processing...'}
      </ThemeText>
    </GlassCard>
  );
}

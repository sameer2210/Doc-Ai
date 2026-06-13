import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { GlassCard } from '@/components/ui/GlassCard';
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
  const { isDark } = useTheme();
  const currentProgressState = useUploadWorkflowStore(state => state.currentProgressState);

  return (
    <GlassCard className="p-8 items-center justify-center">
      <View className="items-center justify-center mb-6 h-24">
        <ActivityIndicator size="large" color={isDark ? '#6EA8FF' : '#244A85'} />
      </View>

      <Text
        style={{ color: isDark ? '#E8F1FF' : '#111827' }}
        className="text-lg font-semibold text-center mb-2"
      >
        Analyzing Scan
      </Text>

      <Text
        style={{ color: isDark ? '#8FA2C3' : '#6B7280' }}
        className="text-center"
      >
        {PROGRESS_STAGE_MESSAGES[currentProgressState] || 'Processing...'}
      </Text>
    </GlassCard>
  );
}

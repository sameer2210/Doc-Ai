import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, View, Animated } from 'react-native';

import { FOUR_STAGE_PIPELINE } from '@/features/upload/constants/image.constants';
import type {
  AnalysisStageId,
  StageStatus,
  UploadProgressStage,
  UploadWorkflowStatus,
} from '@/features/upload/types/image.types';
import { useTheme } from '@/theme';
import { ThemeText } from '@/components/ui/theme/ThemeText';
import { Ionicons } from '@expo/vector-icons';

type AnalysisProgressProps = {
  activeStage: UploadProgressStage;
  uploadPercent?: number | null;
  uploadStatus?: UploadWorkflowStatus;
  compact?: boolean;
};

function getStageStatus(
  stageId: AnalysisStageId,
  activeStage: UploadProgressStage,
  uploadStatus?: UploadWorkflowStatus,
): StageStatus {
  const isFailed = uploadStatus === 'failed' || activeStage === 'analysis_failed';
  const isComplete = uploadStatus === 'complete' || activeStage === 'analysis_complete';

  if (isComplete) {
    return 'completed';
  }

  // Handle Stage 1: Image Preparation (Completed prior to AnalysisScreen)
  if (stageId === 'image_preparation') {
    return 'completed';
  }

  // Handle Stage 2: Uploading Scan
  if (stageId === 'uploading_scan') {
    if (isFailed && (activeStage === 'uploading_image' || activeStage === 'image_uploaded')) {
      return 'failed';
    }
    if (activeStage === 'uploading_image' || activeStage === 'image_uploaded') {
      return 'active';
    }
    if (
      activeStage === 'connecting_ai_engine' ||
      activeStage === 'analyzing_eye' ||
      activeStage === 'generating_Analysis' ||
      activeStage === 'preparing_report'
    ) {
      return 'completed';
    }
    // Default initial active stage when entering scan-analysis
    return 'active';
  }

  // Handle Stage 3: Eye Alignment & AI Analysis
  if (stageId === 'eye_alignment_ai') {
    if (isFailed && (activeStage === 'connecting_ai_engine' || activeStage === 'analyzing_eye')) {
      return 'failed';
    }
    if (activeStage === 'connecting_ai_engine' || activeStage === 'analyzing_eye') {
      return 'active';
    }
    if (
      activeStage === 'generating_Analysis' ||
      activeStage === 'preparing_report'
    ) {
      return 'completed';
    }
    return 'pending';
  }

  // Handle Stage 4: Report Generation
  if (stageId === 'report_generation') {
    if (isFailed && (activeStage === 'generating_Analysis' || activeStage === 'preparing_report')) {
      return 'failed';
    }
    if (activeStage === 'generating_Analysis' || activeStage === 'preparing_report') {
      return 'active';
    }
    return 'pending';
  }

  return 'pending';
}

export function AnalysisProgress({
  activeStage,
  uploadPercent = null,
  uploadStatus,
  compact = false,
}: AnalysisProgressProps) {
  const { theme } = useTheme();

  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const targetValue = uploadPercent !== null ? Math.min(100, Math.max(0, uploadPercent)) : 0;

    Animated.timing(progressAnim, {
      toValue: targetValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [uploadPercent, progressAnim]);

  return (
    <View style={{ width: '100%' }}>
      <ThemeText
        style={{
          fontSize: 12,
          fontWeight: '700',
          color: theme.colors.text.tertiary,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          marginBottom: theme.spacing.lg,
        }}
      >
        Current processing stage
      </ThemeText>

      {FOUR_STAGE_PIPELINE.map((stage, index) => {
        const stageId = stage.id as AnalysisStageId;
        const status = getStageStatus(stageId, activeStage, uploadStatus);
        const isLast = index === FOUR_STAGE_PIPELINE.length - 1;

        const isCompleted = status === 'completed';
        const isActive = status === 'active';
        const isFailed = status === 'failed';
        const isPending = status === 'pending';

        return (
          <View key={stage.id} style={{ marginBottom: isLast ? 0 : theme.spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              {/* Left Badge & Connecting Line Container */}
              <View style={{ alignItems: 'center', marginRight: theme.spacing.md, width: 32 }}>
                {/* 32x32 Status Badge */}
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: isCompleted
                      ? theme.colors.successSurface
                      : isFailed
                      ? theme.colors.errorSurface
                      : isActive
                      ? theme.colors.accentSurface
                      : 'transparent',
                    borderWidth: isPending ? 1.5 : 1,
                    borderColor: isCompleted
                      ? theme.colors.text.success
                      : isFailed
                      ? theme.colors.text.danger
                      : isActive
                      ? theme.colors.accent.primary
                      : theme.colors.border.subtle,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  accessibilityLabel={`stage-${stage.label}-${status}`}
                >
                  {isCompleted ? (
                    <Ionicons name="checkmark" size={18} color={theme.colors.text.success} />
                  ) : isFailed ? (
                    <Ionicons name="close" size={18} color={theme.colors.text.danger} />
                  ) : isActive ? (
                    <ActivityIndicator size="small" color={theme.colors.accent.primary} />
                  ) : (
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: theme.colors.border.subtle,
                      }}
                    />
                  )}
                </View>

                {/* Vertical Connector Line */}
                {!isLast && (
                  <View
                    style={{
                      width: 2,
                      height: 24,
                      backgroundColor: isCompleted
                        ? theme.colors.text.success
                        : theme.colors.border.subtle,
                      marginTop: theme.spacing.xs,
                    }}
                  />
                )}
              </View>

              {/* Right Stage Header & Subtitle */}
              <View style={{ flex: 1, paddingTop: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <ThemeText
                    style={{
                      fontSize: 15,
                      fontWeight: isActive || isCompleted ? '700' : '500',
                      color: isFailed
                        ? theme.colors.text.danger
                        : isActive || isCompleted
                        ? theme.colors.text.primary
                        : theme.colors.text.tertiary,
                    }}
                    allowFontScaling
                  >
                    {stage.label}
                  </ThemeText>

                  {isActive && uploadPercent !== null && (
                    <ThemeText
                      style={{
                        fontSize: 13,
                        fontWeight: '700',
                        color: theme.colors.accent.primary,
                      }}
                      allowFontScaling
                    >
                      {Math.round(uploadPercent)}%
                    </ThemeText>
                  )}
                </View>

                <ThemeText
                  style={{
                    fontSize: 12,
                    color: isFailed
                      ? theme.colors.text.danger
                      : isActive
                      ? theme.colors.text.secondary
                      : isCompleted
                      ? theme.colors.text.secondary
                      : theme.colors.text.tertiary,
                    marginTop: 2,
                  }}
                  allowFontScaling
                >
                  {isFailed ? 'Processing failed at this stage' : stage.description}
                </ThemeText>

                {/* Animated Progress Bar for Active Stage */}
                {isActive && (
                  <View
                    style={{
                      height: 4,
                      backgroundColor: theme.colors.background.surfaceStrong,
                      borderRadius: 2,
                      overflow: 'hidden',
                      marginTop: theme.spacing.xs + 2,
                    }}
                  >
                    <Animated.View
                      style={{
                        height: '100%',
                        backgroundColor: theme.colors.accent.primary,
                        width: progressAnim.interpolate({
                          inputRange: [0, 100],
                          outputRange: ['0%', '100%'],
                        }),
                        borderRadius: 2,
                      }}
                    />
                  </View>
                )}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}


import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Text, View } from 'react-native';

import { UPLOAD_PROGRESS_STAGE_DEFINITIONS } from '@/features/upload/constants/image.constants';
import type { UploadProgressStage } from '@/features/upload/types/image.types';
import { appTheme } from '@/theme';

type AnalysisProgressProps = {
  activeStage: UploadProgressStage;
  uploadPercent?: number | null;
  compact?: boolean;
};

function getStageIndex(stage: UploadProgressStage): number {
  return UPLOAD_PROGRESS_STAGE_DEFINITIONS.findIndex(item => item.key === stage);
}

export function AnalysisProgress({
  activeStage,
  uploadPercent = null,
  compact = false,
}: AnalysisProgressProps) {
  const activeIndex = getStageIndex(activeStage);

  return (
    <View
      style={{
        borderRadius: appTheme.radii.xl,
        borderWidth: 1,
        borderColor: appTheme.colors.border.subtle,
        backgroundColor: appTheme.colors.background.surface,
        padding: compact ? appTheme.spacing.md : appTheme.spacing.lg,
        gap: compact ? 8 : 10,
      }}
    >
      {UPLOAD_PROGRESS_STAGE_DEFINITIONS.map((stage, index) => {
        const isComplete = index < activeIndex;
        const isActive = index === activeIndex;
        const iconName = stage.icon as keyof typeof Ionicons.glyphMap;

        return (
          <View key={stage.key} className="flex-row items-center gap-3">
            <View
              style={{
                width: compact ? 28 : 32,
                height: compact ? 28 : 32,
                borderRadius: 999,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isActive
                  ? 'rgba(110, 168, 255, 0.18)'
                  : isComplete
                    ? 'rgba(124, 229, 165, 0.16)'
                    : 'rgba(20, 27, 41, 0.9)',
                borderWidth: 1,
                borderColor: isActive
                  ? appTheme.colors.accent.primary
                  : isComplete
                    ? appTheme.colors.text.success
                    : appTheme.colors.border.soft,
              }}
            >
              {isComplete ? (
                <Ionicons name="checkmark" size={16} color={appTheme.colors.text.success} />
              ) : isActive ? (
                stage.key === 'uploading_image' && uploadPercent !== null ? (
                  <Text style={{ color: appTheme.colors.text.primary, fontSize: 10, fontWeight: '700' }}>
                    {uploadPercent}%
                  </Text>
                ) : (
                  <ActivityIndicator size="small" color={appTheme.colors.accent.primary} />
                )
              ) : (
                <Ionicons name={iconName} size={15} color={appTheme.colors.text.tertiary} />
              )}
            </View>

            <View className="flex-1">
              <Text
                style={{
                  color: isActive || isComplete ? appTheme.colors.text.primary : appTheme.colors.text.secondary,
                  fontSize: compact ? 12 : 13,
                  fontWeight: isActive ? '700' : '600',
                }}
              >
                {stage.label}
              </Text>
              {isActive && stage.key === 'uploading_image' && uploadPercent !== null ? (
                <Text style={{ color: appTheme.colors.text.secondary, fontSize: 11 }}>
                  Uploading Image {uploadPercent}%
                </Text>
              ) : null}
            </View>

            {isActive ? (
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  backgroundColor: appTheme.colors.accent.primary,
                }}
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

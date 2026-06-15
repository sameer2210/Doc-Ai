import React from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { useTheme } from '@/theme';
import { useUploadWorkflowStore } from '../store/upload-workflow-store';
import { AnalysisProgress } from './analysis-progress';

export function AnalysisStatusCard() {
  const { theme } = useTheme();
  const currentProgressState = useUploadWorkflowStore(state => state.currentProgressState);
  const uploadProgressPercent = useUploadWorkflowStore(state => state.uploadProgressPercent);

  return (
    <GlassCard style={{ padding: theme.spacing.xl, width: '100%' }}>
      <AnalysisProgress 
        activeStage={currentProgressState} 
        uploadPercent={uploadProgressPercent} 
      />
    </GlassCard>
  );
}

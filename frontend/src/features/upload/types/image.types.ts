import type { UploadPipelineErrorCode } from '@/shared/uploads/upload-errors';

export type UploadWorkflowOrigin = 'home' | 'chat';

export type UploadWorkflowStatus =
  | 'idle'
  | 'validating'
  | 'preparing'
  | 'cropping'
  | 'optimizing'
  | 'ready'
  | 'processing'
  | 'uploading'
  | 'complete'
  | 'failed';

export type UploadProgressStage =
  | 'image_selected'
  | 'validating_image'
  | 'checking_internet'
  | 'preparing_image'
  | 'cropping_image'
  | 'optimizing_image'
  | 'image_ready'
  | 'uploading_image'
  | 'image_uploaded'
  | 'connecting_ai_engine'
  | 'analyzing_eye'
  | 'generating_Analysis'
  | 'preparing_report'
  | 'analysis_complete'
  | 'analysis_failed';

export type UploadProgressStageDefinition = {
  key: UploadProgressStage;
  label: string;
  icon: string;
};

export type AnalysisStageId =
  | 'image_preparation'
  | 'uploading_scan'
  | 'eye_alignment_ai'
  | 'report_generation';

export type StageStatus = 'pending' | 'active' | 'completed' | 'failed';

export type NormalizedStageState = {
  id: AnalysisStageId;
  label: string;
  description: string;
  icon: string;
  internalStages: readonly UploadProgressStage[];
};

export type WorkflowImage = {
  uri: string;
  name: string;
  mimeType: string;
  fileSizeBytes: number;
  width: number;
  height: number;
};

export type CropViewportGeometry = {
  frameSize: number;
  imageWidth: number;
  imageHeight: number;
  scale: number;
  translateX: number;
  translateY: number;
};

export type CropRectangle = {
  originX: number;
  originY: number;
  width: number;
  height: number;
};

export type CroppedImageResult = {
  uri: string;
  width: number;
  height: number;
  fileSize?: number;
};

export type UploadImageValidationResult =
  | {
      valid: true;
      image: WorkflowImage;
    }
  | {
      valid: false;
      code: UploadPipelineErrorCode;
      message: string;
    };

export type UploadWorkflowState = {
  flowId: string | null;
  origin: UploadWorkflowOrigin | null;
  chatId: string | null;
  originalImage: WorkflowImage | null;
  workingImage: WorkflowImage | null;
  croppedImage: WorkflowImage | null;
  optimizedImage: WorkflowImage | null;
  currentProgressState: UploadProgressStage;
  uploadStatus: UploadWorkflowStatus;
  uploadProgressPercent: number | null;
  lastErrorCode: UploadPipelineErrorCode | null;
};

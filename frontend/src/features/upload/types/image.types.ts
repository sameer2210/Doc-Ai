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
  | 'generating_diagnosis'
  | 'preparing_report'
  | 'analysis_complete';

export type UploadProgressStageDefinition = {
  key: UploadProgressStage;
  label: string;
  icon: string;
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
  originalImage: WorkflowImage | null;
  workingImage: WorkflowImage | null;
  croppedImage: WorkflowImage | null;
  optimizedImage: WorkflowImage | null;
  currentProgressState: UploadProgressStage;
  uploadStatus: UploadWorkflowStatus;
  uploadProgressPercent: number | null;
  lastErrorCode: UploadPipelineErrorCode | null;
};

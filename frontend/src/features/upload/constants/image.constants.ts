import type {
  UploadProgressStage,
  UploadProgressStageDefinition,
} from '@/features/upload/types/image.types';

export const UPLOAD_IMAGE_FLOW_COPY = {
  cropInstruction: 'Position the eye inside the analysis area',
  cropSecondaryInstruction: 'Center the pupil inside the guide for best results',
  previewReady: 'Image ready for analysis',
  retake: 'Retake',
  useThisImage: 'Use This Image',
  analyze: 'Analyze Image',
  cameraPermissionTitle: 'Permission required',
  cameraPermissionMessage: 'Camera permission is needed to capture eye images.',
  libraryPermissionMessage: 'Photo library permission is needed to choose eye images.',
  invalidSelectionTitle: 'Image validation failed',
  cropTitle: 'Crop Eye Image',
  previewTitle: 'Preview Cropped Image',
  previewSubtitle: '320 x 320 px',
  retakeHint: 'Choose a different image',
  workingImageWarning: 'Large image optimized for crop preview',
  openingCrop: 'Preparing image for crop...',
  openingPreview: 'Preparing image preview...',
} as const;

export const UPLOAD_PROGRESS_STAGE_KEYS = [
  'image_selected',
  'validating_image',
  'checking_internet',
  'preparing_image',
  'cropping_image',
  'optimizing_image',
  'image_ready',
  'uploading_image',
  'image_uploaded',
  'connecting_ai_engine',
  'analyzing_eye',
  'generating_diagnosis',
  'preparing_report',
  'analysis_complete',
  'analysis_failed',
] as const satisfies readonly UploadProgressStage[];

export const UPLOAD_PROGRESS_STAGE_DEFINITIONS = [
  { key: 'image_selected', label: 'Image Selected', icon: 'image-outline' },
  { key: 'validating_image', label: 'Validating Image', icon: 'shield-checkmark-outline' },
  { key: 'checking_internet', label: 'Checking Internet', icon: 'wifi-outline' },
  { key: 'preparing_image', label: 'Preparing Image', icon: 'layers-outline' },
  { key: 'cropping_image', label: 'Cropping Image', icon: 'cut-outline' },
  { key: 'optimizing_image', label: 'Optimizing Image', icon: 'options-outline' },
  { key: 'image_ready', label: 'Image Ready', icon: 'checkmark-circle-outline' },
  { key: 'uploading_image', label: 'Uploading Image', icon: 'cloud-upload-outline' },
  { key: 'image_uploaded', label: 'Image Uploaded', icon: 'cloud-done-outline' },
  { key: 'connecting_ai_engine', label: 'Connecting AI Engine', icon: 'hardware-chip-outline' },
  { key: 'analyzing_eye', label: 'Analyzing Eye', icon: 'scan-outline' },
  { key: 'generating_diagnosis', label: 'AI Analysis Results', icon: 'document-text-outline' },
  { key: 'preparing_report', label: 'Preparing Report', icon: 'reader-outline' },
  { key: 'analysis_complete', label: 'Analysis Complete', icon: 'checkmark-done-circle-outline' },
  { key: 'analysis_failed', label: 'Analysis Failed', icon: 'close-circle-outline' },
] as const satisfies readonly UploadProgressStageDefinition[];

export const UPLOAD_IMAGE_INPUT_MAX_FILE_SIZE_LABEL = '50 MB';
export const UPLOAD_IMAGE_OUTPUT_MAX_FILE_SIZE_LABEL = '5 MB';
export const UPLOAD_IMAGE_TARGET_FILE_SIZE_LABEL = '500 KB';
export const UPLOAD_IMAGE_TARGET_FILE_SIZE_BYTES = 500 * 1024;
export const UPLOAD_IMAGE_CROP_BOX_SIZE_LABEL = '320 x 320';
export const UPLOAD_IMAGE_WORKING_IMAGE_EDGE_LABEL = '2048 px';
export const UPLOAD_IMAGE_MAX_DIMENSION_LABEL = '8000 px';

export type UserFacingProgressStage = {
  readonly id:
    | 'preparing_image'
    | 'uploading_image'
    | 'analyzing_eye'
    | 'generating_report'
    | 'analysis_complete'
    | 'analysis_failed';
  readonly label: string;
  readonly description: string;
  readonly internalStages: readonly UploadProgressStage[];
};

export const USER_FACING_PROGRESS_STAGES: readonly UserFacingProgressStage[] = [
  {
    id: 'preparing_image',
    label: 'Preparing Image',
    description: 'Preparing and optimizing image...',
    internalStages: [
      'image_selected',
      'validating_image',
      'checking_internet',
      'preparing_image',
      'cropping_image',
      'optimizing_image',
      'image_ready',
    ],
  },
  {
    id: 'uploading_image',
    label: 'Uploading Scan',
    description: 'Securely transmitting data...',
    internalStages: ['uploading_image', 'image_uploaded'],
  },
  {
    id: 'analyzing_eye',
    label: 'Analyzing Eye',
    description: 'AI is scanning eye structures...',
    internalStages: ['connecting_ai_engine', 'analyzing_eye'],
  },
  {
    id: 'generating_report',
    label: 'Generating Report',
    description: 'Compiling findings...',
    internalStages: ['generating_diagnosis', 'preparing_report'],
  },
  {
    id: 'analysis_complete',
    label: 'Complete',
    description: 'Analysis finished successfully!',
    internalStages: ['analysis_complete'],
  },
  {
    id: 'analysis_failed',
    label: 'Analysis Failed',
    description: 'Something went wrong during the analysis.',
    internalStages: ['analysis_failed'],
  },
];

import { create } from 'zustand';

import type {
  UploadProgressStage,
  UploadWorkflowOrigin,
  UploadWorkflowState,
  UploadWorkflowStatus,
  WorkflowImage,
} from '@/features/upload/types/image.types';
import type { UploadPipelineErrorCode } from '@/shared/uploads/upload-errors';

type StartWorkflowPayload = {
  flowId: string;
  origin: UploadWorkflowOrigin;
  originalImage: WorkflowImage;
};

type UploadWorkflowActions = {
  startWorkflow: (payload: StartWorkflowPayload) => void;
  setWorkingImage: (image: WorkflowImage | null) => void;
  setCroppedImage: (image: WorkflowImage | null) => void;
  setOptimizedImage: (image: WorkflowImage | null) => void;
  setCurrentProgressState: (stage: UploadProgressStage) => void;
  setUploadStatus: (status: UploadWorkflowStatus) => void;
  setUploadProgressPercent: (percent: number | null) => void;
  setLastErrorCode: (code: UploadPipelineErrorCode | null) => void;
  clearWorkflow: () => void;
};

const initialState: UploadWorkflowState = {
  flowId: null,
  origin: null,
  originalImage: null,
  workingImage: null,
  croppedImage: null,
  optimizedImage: null,
  currentProgressState: 'image_selected',
  uploadStatus: 'idle',
  uploadProgressPercent: null,
  lastErrorCode: null,
};

export const useUploadWorkflowStore = create<UploadWorkflowState & UploadWorkflowActions>()(
  set => ({
    ...initialState,
    startWorkflow: ({ flowId, origin, originalImage }) =>
      set({
        flowId,
        origin,
        originalImage,
        workingImage: null,
        croppedImage: null,
        optimizedImage: null,
        currentProgressState: 'image_selected',
        uploadStatus: 'idle',
        uploadProgressPercent: null,
        lastErrorCode: null,
      }),
    setWorkingImage: image => set({ workingImage: image }),
    setCroppedImage: image => set({ croppedImage: image }),
    setOptimizedImage: image => set({ optimizedImage: image }),
    setCurrentProgressState: stage => set({ currentProgressState: stage }),
    setUploadStatus: status => set({ uploadStatus: status }),
    setUploadProgressPercent: percent => set({ uploadProgressPercent: percent }),
    setLastErrorCode: code => set({ lastErrorCode: code }),
    clearWorkflow: () => set({ ...initialState }),
  }),
);

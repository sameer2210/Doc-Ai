import { useUploadWorkflowStore } from '../upload-workflow-store';
import type { WorkflowImage } from '@/features/upload/types/image.types';

function buildWorkflowImage(overrides: Partial<WorkflowImage> = {}): WorkflowImage {
  return {
    uri: 'file://image.jpg',
    name: 'image.jpg',
    mimeType: 'image/jpeg',
    fileSizeBytes: 1024,
    width: 1000,
    height: 1000,
    ...overrides,
  };
}

describe('Upload Workflow Store', () => {
  beforeEach(() => {
    useUploadWorkflowStore.getState().clearWorkflow();
  });

  it('should initialize with default idle state values', () => {
    const state = useUploadWorkflowStore.getState();
    expect(state.flowId).toBeNull();
    expect(state.origin).toBeNull();
    expect(state.originalImage).toBeNull();
    expect(state.workingImage).toBeNull();
    expect(state.croppedImage).toBeNull();
    expect(state.optimizedImage).toBeNull();
    expect(state.currentProgressState).toBe('image_selected');
    expect(state.uploadStatus).toBe('idle');
    expect(state.uploadProgressPercent).toBeNull();
    expect(state.lastErrorCode).toBeNull();
  });

  it('should start workflow and reset images and progress to defaults', () => {
    const originalImage = buildWorkflowImage({
      uri: 'file://original.jpg',
      name: 'original.jpg',
    });

    useUploadWorkflowStore.getState().startWorkflow({
      flowId: 'flow-123',
      origin: 'home',
      originalImage,
    });

    const state = useUploadWorkflowStore.getState();
    expect(state.flowId).toBe('flow-123');
    expect(state.origin).toBe('home');
    expect(state.originalImage).toEqual(originalImage);
    expect(state.currentProgressState).toBe('image_selected');
    expect(state.uploadStatus).toBe('idle');
  });

  it('should update working, cropped, and optimized images', () => {
    const mockImage = buildWorkflowImage({
      uri: 'file://image.jpg',
      name: 'image.jpg',
      width: 50,
      height: 50,
      fileSizeBytes: 256,
    });

    useUploadWorkflowStore.getState().setWorkingImage(mockImage);
    expect(useUploadWorkflowStore.getState().workingImage).toEqual(mockImage);

    const croppedImage = buildWorkflowImage({
      uri: 'file://cropped.jpg',
      name: 'cropped.jpg',
      width: 500,
      height: 500,
      fileSizeBytes: 512,
    });
    useUploadWorkflowStore.getState().setCroppedImage(croppedImage);
    expect(useUploadWorkflowStore.getState().croppedImage).toEqual(croppedImage);

    useUploadWorkflowStore.getState().setOptimizedImage(mockImage);
    expect(useUploadWorkflowStore.getState().optimizedImage).toEqual(mockImage);
  });

  it('should update progress states and statuses', () => {
    useUploadWorkflowStore.getState().setCurrentProgressState('analyzing_eye');
    expect(useUploadWorkflowStore.getState().currentProgressState).toBe('analyzing_eye');

    useUploadWorkflowStore.getState().setUploadStatus('processing');
    expect(useUploadWorkflowStore.getState().uploadStatus).toBe('processing');

    useUploadWorkflowStore.getState().setUploadProgressPercent(45);
    expect(useUploadWorkflowStore.getState().uploadProgressPercent).toBe(45);

    useUploadWorkflowStore.getState().setLastErrorCode('UPLOAD_FAILED');
    expect(useUploadWorkflowStore.getState().lastErrorCode).toBe('UPLOAD_FAILED');
  });

  it('should clear workflow and return to initial state', () => {
    useUploadWorkflowStore.getState().startWorkflow({
      flowId: 'flow-456',
      origin: 'chat',
      originalImage: buildWorkflowImage({
        uri: 'file://test.jpg',
        name: 'test.jpg',
        fileSizeBytes: 2048,
        width: 640,
        height: 480,
      }),
    });

    useUploadWorkflowStore.getState().clearWorkflow();

    const state = useUploadWorkflowStore.getState();
    expect(state.flowId).toBeNull();
    expect(state.origin).toBeNull();
    expect(state.originalImage).toBeNull();
  });
});

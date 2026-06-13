import { useUploadWorkflowStore } from '../upload-workflow-store';

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
    const originalImage = {
      uri: 'file://original.jpg',
      name: 'original.jpg',
      mimeType: 'image/jpeg',
      width: 1000,
      height: 1000,
      fileSizeBytes: 1024,
    } as any;

    useUploadWorkflowStore.getState().startWorkflow({
      flowId: 'flow-123',
      origin: 'scan',
      originalImage,
    });

    const state = useUploadWorkflowStore.getState();
    expect(state.flowId).toBe('flow-123');
    expect(state.origin).toBe('scan');
    expect(state.originalImage).toEqual(originalImage);
    expect(state.currentProgressState).toBe('image_selected');
    expect(state.uploadStatus).toBe('idle');
  });

  it('should update working, cropped, and optimized images', () => {
    const mockImage = {
      uri: 'file://image.jpg',
      name: 'image.jpg',
      mimeType: 'image/jpeg',
      width: 50,
      height: 50,
    };

    useUploadWorkflowStore.getState().setWorkingImage(mockImage);
    expect(useUploadWorkflowStore.getState().workingImage).toEqual(mockImage);

    const croppedImage = { uri: 'file://cropped.jpg', name: 'cropped.jpg', mimeType: 'image/jpeg', width: 500, height: 500, fileSizeBytes: 512 } as any;
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

    useUploadWorkflowStore.getState().setError('NETWORK_ERROR' as any, 'Failed');
    expect(useUploadWorkflowStore.getState().lastErrorCode).toBe('NETWORK_ERROR');
  });

  it('should clear workflow and return to initial state', () => {
    useUploadWorkflowStore.getState().startWorkflow({
      flowId: 'flow-456',
      origin: 'chat',
      originalImage: { uri: 'test' } as any,
    });

    useUploadWorkflowStore.getState().clearWorkflow();

    const state = useUploadWorkflowStore.getState();
    expect(state.flowId).toBeNull();
    expect(state.origin).toBeNull();
    expect(state.originalImage).toBeNull();
  });
});

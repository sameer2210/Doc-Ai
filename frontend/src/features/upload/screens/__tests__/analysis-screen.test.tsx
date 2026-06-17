import React from 'react';
import { render } from '@testing-library/react-native';
import { AnalysisScreen } from '../analysis-screen';
import { useUploadWorkflowStore } from '../../store/upload-workflow-store';
import { useImageAnalysis } from '../../hooks/use-image-analysis';
import type { WorkflowImage } from '@/features/upload/types/image.types';

const mockedUseImageAnalysis = jest.mocked(useImageAnalysis);

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

jest.mock('../../hooks/use-image-analysis');
jest.mock('@/theme', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        background: { base: '#fff' },
        border: { soft: '#ccc', subtle: '#ddd' },
        text: { primary: '#000', secondary: '#555' },
        accent: { primary: '#244A85' },
      },
    },
    isDark: false,
  }),
}));

describe('AnalysisScreen Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useUploadWorkflowStore.getState().clearWorkflow();
    mockedUseImageAnalysis.mockReturnValue({
      analyzeImage: jest.fn(),
      analysisError: null,
      isPredicting: false,
    });
  });

  it('triggers analyzeImage on mount when optimized image and flowId are present', async () => {
    const analyzeSpy = jest.fn();
    mockedUseImageAnalysis.mockReturnValue({
      analyzeImage: analyzeSpy,
      analysisError: null,
      isPredicting: false,
    });

    useUploadWorkflowStore.getState().startWorkflow({
      flowId: 'flow-999',
      origin: 'home',
      originalImage: buildWorkflowImage({
        uri: 'file://original.jpg',
        name: 'original.jpg',
      }),
    });
    useUploadWorkflowStore.getState().setOptimizedImage(
      buildWorkflowImage({
        uri: 'file://opt.jpg',
        name: 'opt.jpg',
      })
    );

    await render(<AnalysisScreen />);

    expect(analyzeSpy).toHaveBeenCalledWith({
      uri: 'file://opt.jpg',
      name: 'opt.jpg',
      mimeType: 'image/jpeg',
    });
  });

  it('renders progressing states based on upload workflow store', async () => {
    useUploadWorkflowStore.getState().setCurrentProgressState('uploading_image');

    const { getByText } = await render(<AnalysisScreen />);
    expect(getByText('Uploading to secure server...')).toBeTruthy();

    useUploadWorkflowStore.getState().setCurrentProgressState('analyzing_eye');
    const { getByText: getByText2 } = await render(<AnalysisScreen />);
    expect(getByText2('Analyzing eye structures...')).toBeTruthy();
  });

  it('renders ErrorNotice if analysis fails', async () => {
    mockedUseImageAnalysis.mockReturnValue({
      analyzeImage: jest.fn(),
      analysisError: {
        title: 'Network timeout',
        message: 'Could not connect to HuggingFace model server',
      },
      isPredicting: false,
    });

    const { getByText } = await render(<AnalysisScreen />);
    expect(getByText('Network timeout')).toBeTruthy();
    expect(getByText('Could not connect to HuggingFace model server')).toBeTruthy();
  });
});

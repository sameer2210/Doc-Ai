import React from 'react';
import { render } from '@testing-library/react-native';
import { AnalysisScreen } from '../analysis-screen';
import { useUploadWorkflowStore } from '../../store/upload-workflow-store';
import { useImageAnalysis } from '../../hooks/use-image-analysis';

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
    (useImageAnalysis as jest.Mock).mockReturnValue({
      analyzeImage: jest.fn(),
      analysisError: null,
      isPredicting: false,
    });
  });

  it('triggers analyzeImage on mount when optimized image and flowId are present', () => {
    const analyzeSpy = jest.fn();
    (useImageAnalysis as jest.Mock).mockReturnValue({
      analyzeImage: analyzeSpy,
      analysisError: null,
      isPredicting: false,
    });

    useUploadWorkflowStore.getState().startWorkflow({
      flowId: 'flow-999',
      origin: 'home',
      originalImage: { uri: 'file://original.jpg' } as any,
    });
    useUploadWorkflowStore.getState().setOptimizedImage({ uri: 'file://opt.jpg' } as any);

    render(<AnalysisScreen />);

    expect(analyzeSpy).toHaveBeenCalledWith({
      uri: 'file://opt.jpg',
      name: undefined,
      mimeType: undefined,
    });
  });

  it('renders progressing states based on upload workflow store', () => {
    useUploadWorkflowStore.getState().setCurrentProgressState('uploading_image');

    const { getByText } = render(<AnalysisScreen />);
    expect(getByText('Uploading to secure server...')).toBeTruthy();

    useUploadWorkflowStore.getState().setCurrentProgressState('analyzing_eye');
    const { getByText: getByText2 } = render(<AnalysisScreen />);
    expect(getByText2('Analyzing eye structures...')).toBeTruthy();
  });

  it('renders ErrorNotice if analysis fails', () => {
    (useImageAnalysis as jest.Mock).mockReturnValue({
      analyzeImage: jest.fn(),
      analysisError: {
        title: 'Network timeout',
        message: 'Could not connect to HuggingFace model server',
      },
      isPredicting: false,
    });

    const { getByText } = render(<AnalysisScreen />);
    expect(getByText('Network timeout')).toBeTruthy();
    expect(getByText('Could not connect to HuggingFace model server')).toBeTruthy();
  });
});

import React from 'react';
import { render } from '@testing-library/react-native';
import { AnalysisScreen } from '../analysis-screen';
import { useUploadWorkflowStore } from '../../store/upload-workflow-store';
import { useImageAnalysis } from '../../hooks/use-image-analysis';
import type { WorkflowImage } from '@/features/upload/types/image.types';

const mockedUseImageAnalysis = jest.mocked(useImageAnalysis);

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: jest.fn(),
  }),
  Stack: {
    Screen: () => null,
  },
}));

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
        background: { base: '#fff', surface: '#fff', elevated: '#fff', surfaceStrong: '#fff' },
        border: { soft: '#ccc', subtle: '#ddd' },
        text: { primary: '#000', secondary: '#555', success: '#22c55e', warning: '#eab308', danger: '#ef4444' },
        accent: { primary: '#244A85' },
        successSurface: '#f0fdf4',
        errorSurface: '#fef2f2',
        accentSurface: '#eff6ff',
        floatingOrbOpacityScale: { primary: 1, secondary: 1 },
        floatingOrbPrimary: '#000',
        floatingOrbSecondary: '#000',
      },
      spacing: {
        xs: 4,
        sm: 8,
        md: 12,
        lg: 16,
        xl: 20,
        xxl: 24,
      },
      radii: {
        md: 8,
        lg: 12,
        xl: 16,
        full: 9999,
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

  it('renders all four stages simultaneously with active and completed states', async () => {
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
    useUploadWorkflowStore.getState().setCurrentProgressState('uploading_image');

    const { getByText } = await render(<AnalysisScreen />);

    // All four user-facing stage titles must be visible simultaneously
    expect(getByText('Image Preparation')).toBeTruthy();
    expect(getByText('Uploading Scan')).toBeTruthy();
    expect(getByText('Eye Alignment & AI Analysis')).toBeTruthy();
    expect(getByText('Report Generation')).toBeTruthy();

    // Descriptions
    expect(getByText('Image validated and optimized for analysis')).toBeTruthy();
    expect(getByText('Transmitting scan data...')).toBeTruthy();
    expect(getByText('Verifying pupil alignment and running AI inference')).toBeTruthy();
    expect(getByText('Compiling diagnostic assessment')).toBeTruthy();
  });

  it('redirects to upload if optimized image or flowId is missing', async () => {
    useUploadWorkflowStore.getState().clearWorkflow();

    await render(<AnalysisScreen />);

    expect(mockReplace).toHaveBeenCalledWith('/scan-upload');
  });
});

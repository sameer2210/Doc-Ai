import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { EyeCropScreen } from '../eye-crop-screen';
import { useUploadWorkflowStore } from '../../store/upload-workflow-store';
import { cropWorkingImageToSquare, optimizeCroppedImage } from '../../utils/image-cropper';
import { router } from 'expo-router';

const mockedCropWorkingImageToSquare = jest.mocked(cropWorkingImageToSquare);
const mockedOptimizeCroppedImage = jest.mocked(optimizeCroppedImage);

jest.mock('../../utils/image-cropper');
jest.mock('@/theme', () => ({
  appTheme: {
    colors: {
      background: { base: '#fff' },
      border: { soft: '#ccc', subtle: '#ddd' },
      text: { primary: '#000', secondary: '#555' },
      accent: { primary: '#244A85' },
    },
  },
}));

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
    dismissAll: jest.fn(),
  },
}));

describe('EyeCropScreen Component', () => {
  const mockImage = {
    uri: 'file://original.jpg',
    name: 'original.jpg',
    mimeType: 'image/jpeg',
    width: 300,
    height: 400,
    fileSizeBytes: 1024,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useUploadWorkflowStore.getState().clearWorkflow();
  });

  it('renders image missing error if no active image in store', async () => {
    const { getByText } = await render(<EyeCropScreen />);
    expect(getByText('Image missing')).toBeTruthy();
  });

  it('renders crop screen with instructions and confirm button when image exists', async () => {
    useUploadWorkflowStore.getState().startWorkflow({
      flowId: 'flow-1',
      origin: 'home',
      originalImage: mockImage,
    });

    const { getByText } = await render(<EyeCropScreen />);
    expect(getByText('Crop Image')).toBeTruthy();
    expect(getByText('Confirm Crop')).toBeTruthy();
  });

  it('navigates to /scan-analysis on confirm crop success if origin is home', async () => {
    useUploadWorkflowStore.getState().startWorkflow({
      flowId: 'flow-1',
      origin: 'home',
      originalImage: mockImage,
    });

    mockedCropWorkingImageToSquare.mockResolvedValue({
      uri: 'file://cropped.jpg',
      fileSize: 500,
      width: 200,
      height: 200,
    });
    mockedOptimizeCroppedImage.mockResolvedValue({
      uri: 'file://optimized.jpg',
      fileSize: 400,
      width: 200,
      height: 200,
    });

    const { getByText } = await render(<EyeCropScreen />);
    const confirmButton = getByText('Confirm Crop');

    fireEvent.press(confirmButton);

    await waitFor(() => {
      expect(cropWorkingImageToSquare).toHaveBeenCalled();
      expect(optimizeCroppedImage).toHaveBeenCalled();
      expect(router.push).toHaveBeenCalledWith('/scan-analysis');
    });
  });

  it('navigates back on confirm crop success if origin is chat', async () => {
    useUploadWorkflowStore.getState().startWorkflow({
      flowId: 'flow-2',
      origin: 'chat',
      originalImage: mockImage,
    });

    mockedCropWorkingImageToSquare.mockResolvedValue({
      uri: 'file://cropped.jpg',
      fileSize: 500,
      width: 200,
      height: 200,
    });
    mockedOptimizeCroppedImage.mockResolvedValue({
      uri: 'file://optimized.jpg',
      fileSize: 400,
      width: 200,
      height: 200,
    });

    const { getByText } = await render(<EyeCropScreen />);
    const confirmButton = getByText('Confirm Crop');

    fireEvent.press(confirmButton);

    await waitFor(() => {
      expect(router.back).toHaveBeenCalled();
    });
  });
});

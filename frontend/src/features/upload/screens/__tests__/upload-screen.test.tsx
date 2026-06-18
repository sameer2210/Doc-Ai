import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { UploadScreen } from '../upload-screen';

jest.mock('@/theme', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        background: { base: '#fff', surface: '#fff', elevated: '#fff', surfaceStrong: '#fff' },
        border: { soft: '#ccc', subtle: '#ddd' },
        text: { primary: '#000', secondary: '#555', success: '#22c55e', warning: '#eab308', danger: '#ef4444' },
        accent: { primary: '#244A85' },
        chatUserBubbleText: '#000',
        successSurface: '#f0fdf4',
        errorSurface: '#fef2f2',
        accentSurface: '#eff6ff',
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

const mockHandlePickImage = jest.fn();
jest.mock('../../hooks/use-scan-upload', () => ({
  useScanUpload: () => ({
    isPicking: false,
    handlePickImage: mockHandlePickImage,
  }),
}));

describe('UploadScreen Component', () => {
  it('renders correctly with camera and gallery buttons and guidelines', async () => {
    const { getByText } = await render(<UploadScreen />);

    expect(getByText('New Scan')).toBeTruthy();
    expect(getByText('Upload an image of an eye for instant cataract screening.')).toBeTruthy();

    const cameraButton = getByText('Camera');
    const galleryButton = getByText('Gallery');
    expect(cameraButton).toBeTruthy();
    expect(galleryButton).toBeTruthy();

    expect(getByText('Guidelines')).toBeTruthy();
  });

  it('triggers image picking handle when buttons are pressed', async () => {
    const { getByText } = await render(<UploadScreen />);

    const cameraButton = getByText('Camera');
    const galleryButton = getByText('Gallery');

    fireEvent.press(cameraButton);
    expect(mockHandlePickImage).toHaveBeenCalledWith(true);

    fireEvent.press(galleryButton);
    expect(mockHandlePickImage).toHaveBeenCalledWith(false);
  });
});

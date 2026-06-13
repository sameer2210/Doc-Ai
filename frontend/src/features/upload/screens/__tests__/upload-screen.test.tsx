import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { UploadScreen } from '../upload-screen';

jest.mock('@/theme', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        background: { base: '#fff' },
        border: { soft: '#ccc', subtle: '#ddd' },
        text: { primary: '#000', secondary: '#555' },
        accent: { primary: '#244A85' },
        chatUserBubbleText: '#000',
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
  it('renders correctly with camera and gallery buttons and guidelines', () => {
    const { getByText } = render(<UploadScreen />);

    expect(getByText('New Scan')).toBeTruthy();
    expect(getByText('Upload an image of an eye for instant cataract screening.')).toBeTruthy();

    const cameraButton = getByText('Camera');
    const galleryButton = getByText('Gallery');
    expect(cameraButton).toBeTruthy();
    expect(galleryButton).toBeTruthy();

    expect(getByText('Guidelines')).toBeTruthy();
  });

  it('triggers image picking handle when buttons are pressed', () => {
    const { getByText } = render(<UploadScreen />);

    const cameraButton = getByText('Camera');
    const galleryButton = getByText('Gallery');

    fireEvent.press(cameraButton);
    expect(mockHandlePickImage).toHaveBeenCalledWith(true);

    fireEvent.press(galleryButton);
    expect(mockHandlePickImage).toHaveBeenCalledWith(false);
  });
});

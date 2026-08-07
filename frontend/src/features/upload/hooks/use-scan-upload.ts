import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';

import { useUploadWorkflowStore } from '../store/upload-workflow-store';
import { createWorkingImageForCrop } from '../utils/image-cropper';
import { IMAGE_NOT_FOUND_MESSAGE } from '@/shared/uploads/upload-errors';
import {
  resolveUploadImageMetadata,
  validateUploadImageSelection,
} from '@/shared/uploads/upload-validation';
import { usePredictionStore } from '@/store/prediction-store';

export function useScanUpload() {
  const [isPicking, setIsPicking] = useState(false);
  const router = useRouter();
  const workflow = useUploadWorkflowStore(state => state);
  const clearPending = usePredictionStore(state => state.clearPending);

  async function getValidatedWorkflowImage(asset: ImagePicker.ImagePickerAsset) {
    const metadata = await resolveUploadImageMetadata(asset.uri, asset.fileSize);
    if (!metadata.exists) {
      throw new Error(IMAGE_NOT_FOUND_MESSAGE);
    }

    const validation = validateUploadImageSelection({
      uri: asset.uri,
      mimeType: asset.mimeType,
      fileSizeBytes: metadata.fileSizeBytes,
      width: metadata.width,
      height: metadata.height,
    });

    if (!validation.valid) {
      throw new Error(validation.message);
    }

    return {
      uri: asset.uri,
      name: asset.fileName ?? `image-${Date.now()}.jpg`,
      mimeType: validation.mimeType,
      fileSizeBytes: validation.fileSizeBytes,
      width: validation.width,
      height: validation.height,
    };
  }

  const handlePickImage = async (useCamera: boolean = false) => {
    if (isPicking) return;

    try {
      setIsPicking(true);
      workflow.clearWorkflow();
      clearPending();

      const permissionResult = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        alert(
          useCamera
            ? 'Camera permission is required to take a photo.'
            : 'Media library permission is required to upload an image.'
        );
        return;
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      };

      const result = useCamera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const originalImage = await getValidatedWorkflowImage(asset);

        const flowId = `scan_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

        workflow.startWorkflow({
          flowId,
          origin: 'home',
          originalImage,
        });

        const workingImage = await createWorkingImageForCrop(originalImage);
        workflow.setWorkingImage(workingImage);

        // Navigate to crop screen
        router.push('/eye-crop');
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to pick image. Please try again.');
    } finally {
      setIsPicking(false);
    }
  };

  return {
    isPicking,
    handlePickImage,
  };
}

import * as ImagePicker from 'expo-image-picker';
import * as Network from 'expo-network';
import { router } from 'expo-router';

import { useUploadWorkflowStore } from '@/features/upload/store/upload-workflow-store';
import { createWorkingImageForCrop } from '@/features/upload/utils/image-cropper';
import { IMAGE_NOT_FOUND_MESSAGE, NO_INTERNET_MESSAGE } from '@/shared/uploads/upload-errors';
import {
  resolveUploadImageMetadata,
  validateUploadImageSelection,
} from '@/shared/uploads/upload-validation';


interface UseChatImageWorkflowParams {
  setChatError: (error: unknown) => void;
}

export function useChatImageWorkflow({
  setChatError,
}: UseChatImageWorkflowParams) {
  const workflow = useUploadWorkflowStore(state => state);

  async function getValidatedWorkflowImage(asset: ImagePicker.ImagePickerAsset) {

    const networkState = await Network.getNetworkStateAsync();

    if (!networkState.isConnected) {
      throw new Error(NO_INTERNET_MESSAGE);
    }

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

  async function openWorkflowCropScreen(asset: ImagePicker.ImagePickerAsset) {
    setChatError(null);

    try {

      const originalImage = await getValidatedWorkflowImage(asset);
      const flowId = `chat_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

      workflow.startWorkflow({
        flowId,
        origin: 'chat',
        originalImage,
      });
      workflow.setCurrentProgressState('validating_image');
      workflow.setCurrentProgressState('checking_internet');
      workflow.setCurrentProgressState('preparing_image');
      workflow.setUploadStatus('preparing');


      const workingImage = await createWorkingImageForCrop(originalImage);

      workflow.setWorkingImage(workingImage);


      router.push('/eye-crop' as never);

    } catch (error) {
      workflow.clearWorkflow();
      setChatError(error instanceof Error ? error : new Error('Invalid image file'));
    }
  }

  async function attachImage() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setChatError(new Error('Media library permission is needed to select images.'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        selectionLimit: 1,
      });

      if (result.canceled || !result.assets.length) return;

      await openWorkflowCropScreen(result.assets[0]);
    } catch (error) {
      setChatError(error instanceof Error ? error : new Error('Invalid image file'));
    }
  }

  return {
    attachImage,
  };
}

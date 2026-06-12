import { useEffect, useRef } from 'react';
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
import type { ChatAttachment } from '@/features/chat/types/chat-types';

const IMAGE_CROP_FLOW_LOG_PREFIX = '[EyeCropFlow]';

interface UseChatImageWorkflowParams {
  startUpload: (file: { localUri: string; name: string; mimeType: string; size: number }) => void;
  pendingAttachments: ChatAttachment[];
  setChatError: (error: unknown) => void;
}

export function useChatImageWorkflow({
  startUpload,
  pendingAttachments,
  setChatError,
}: UseChatImageWorkflowParams) {
  const workflow = useUploadWorkflowStore(state => state);
  const handledWorkflowIdRef = useRef<string | null>(null);
  const lastUploadPercentRef = useRef<number | null>(null);

  useEffect(() => {
    if (
      workflow.origin !== 'chat' ||
      workflow.uploadStatus !== 'ready' ||
      !workflow.optimizedImage ||
      !workflow.flowId ||
      handledWorkflowIdRef.current === workflow.flowId
    ) {
      return;
    }

    handledWorkflowIdRef.current = workflow.flowId;
    workflow.setUploadStatus('uploading');
    workflow.setCurrentProgressState('uploading_image');
    workflow.setUploadProgressPercent(0);
    setChatError(null);
    console.log(IMAGE_CROP_FLOW_LOG_PREFIX, 'upload-start', {
      flowId: workflow.flowId,
      origin: workflow.origin,
    });

    startUpload({
      localUri: workflow.optimizedImage.uri,
      name: workflow.optimizedImage.name,
      mimeType: workflow.optimizedImage.mimeType,
      size: workflow.optimizedImage.fileSizeBytes,
    });
  }, [
    startUpload,
    workflow.flowId,
    workflow.optimizedImage,
    workflow.origin,
    workflow.uploadStatus,
    workflow,
    setChatError,
  ]);

  useEffect(() => {
    if (
      workflow.origin !== 'chat' ||
      workflow.uploadStatus !== 'uploading' ||
      !workflow.optimizedImage
    ) {
      return;
    }

    const optimizedImage = workflow.optimizedImage;
    const activeAttachment = pendingAttachments.find(
      attachment =>
        attachment.localUri === optimizedImage.uri && attachment.name === optimizedImage.name
    );

    if (!activeAttachment) {
      return;
    }

    if (typeof activeAttachment.progress === 'number') {
      if (lastUploadPercentRef.current !== activeAttachment.progress) {
        lastUploadPercentRef.current = activeAttachment.progress;
        workflow.setUploadProgressPercent(activeAttachment.progress);
      }
    }

    if (activeAttachment.uploadStatus === 'success') {
      lastUploadPercentRef.current = 100;
      workflow.setUploadProgressPercent(100);
      workflow.setCurrentProgressState('image_uploaded');
      workflow.setUploadStatus('complete');
      console.log(IMAGE_CROP_FLOW_LOG_PREFIX, 'upload-complete', {
        flowId: workflow.flowId,
        origin: workflow.origin,
      });
      workflow.clearWorkflow();
      handledWorkflowIdRef.current = null;
      lastUploadPercentRef.current = null;
      return;
    }

    if (activeAttachment.uploadStatus === 'failed') {
      workflow.setLastErrorCode('UPLOAD_FAILED');
      workflow.setUploadStatus('failed');
      workflow.setCurrentProgressState('image_uploaded');
      setChatError(new Error('Image upload failed. Please try again.'));
      workflow.clearWorkflow();
      handledWorkflowIdRef.current = null;
      lastUploadPercentRef.current = null;
    }
  }, [
    pendingAttachments,
    workflow.optimizedImage,
    workflow.origin,
    workflow.uploadStatus,
    workflow,
    setChatError,
  ]);

  async function getValidatedWorkflowImage(asset: ImagePicker.ImagePickerAsset) {
    console.log(IMAGE_CROP_FLOW_LOG_PREFIX, 'chat:getValidatedWorkflowImage:start', {
      uri: asset.uri,
      mimeType: asset.mimeType,
      fileSize: asset.fileSize,
    });
    console.log(IMAGE_CROP_FLOW_LOG_PREFIX, 'chat:getValidatedWorkflowImage:network:start');
    const networkState = await Network.getNetworkStateAsync();
    console.log(IMAGE_CROP_FLOW_LOG_PREFIX, 'chat:getValidatedWorkflowImage:network:done', {
      isConnected: networkState.isConnected,
      isInternetReachable: networkState.isInternetReachable,
    });
    if (!networkState.isConnected) {
      throw new Error(NO_INTERNET_MESSAGE);
    }

    console.log(IMAGE_CROP_FLOW_LOG_PREFIX, 'chat:getValidatedWorkflowImage:metadata:start');
    const metadata = await resolveUploadImageMetadata(asset.uri, asset.fileSize);
    console.log(
      IMAGE_CROP_FLOW_LOG_PREFIX,
      'chat:getValidatedWorkflowImage:metadata:done',
      metadata
    );
    if (!metadata.exists) {
      throw new Error(IMAGE_NOT_FOUND_MESSAGE);
    }

    console.log(IMAGE_CROP_FLOW_LOG_PREFIX, 'chat:getValidatedWorkflowImage:validation:start');
    const validation = validateUploadImageSelection({
      uri: asset.uri,
      mimeType: asset.mimeType,
      fileSizeBytes: metadata.fileSizeBytes,
      width: metadata.width,
      height: metadata.height,
    });
    console.log(
      IMAGE_CROP_FLOW_LOG_PREFIX,
      'chat:getValidatedWorkflowImage:validation:done',
      validation
    );

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
      console.log(IMAGE_CROP_FLOW_LOG_PREFIX, 'chat:openWorkflowCropScreen:start', {
        uri: asset.uri,
        name: asset.fileName,
      });
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

      console.log(
        IMAGE_CROP_FLOW_LOG_PREFIX,
        'chat:openWorkflowCropScreen:createWorkingImage:start',
        {
          flowId,
        }
      );
      const workingImage = await createWorkingImageForCrop(originalImage);
      console.log(
        IMAGE_CROP_FLOW_LOG_PREFIX,
        'chat:openWorkflowCropScreen:createWorkingImage:done',
        {
          flowId,
          uri: workingImage.uri,
        }
      );
      workflow.setWorkingImage(workingImage);

      console.log(IMAGE_CROP_FLOW_LOG_PREFIX, 'chat:openWorkflowCropScreen:navigate:start', {
        flowId,
      });
      router.push('/eye-crop' as never);
      console.log(IMAGE_CROP_FLOW_LOG_PREFIX, 'chat:openWorkflowCropScreen:navigate:done', {
        flowId,
      });
    } catch (error) {
      console.log(IMAGE_CROP_FLOW_LOG_PREFIX, 'chat:openWorkflowCropScreen:error', error);
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

import { httpClient } from '@/shared/api/http-client';

export type UploadAssetPayload = {
  uri: string;
  name: string;
  type?: string;
};

export async function uploadAsset(chatId: string, asset: UploadAssetPayload) {
  const formData = new FormData();
  formData.append('file', {
    uri: asset.uri,
    name: asset.name,
    type: asset.type ?? 'application/octet-stream',
  } as never);

  const response = await httpClient.post(`/chats/${chatId}/attachments`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data as { id: string; url: string };
}

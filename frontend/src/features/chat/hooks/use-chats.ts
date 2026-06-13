import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listChats, createChat, deleteChat } from '../api/chat-api';

export function useChatsList() {
  return useQuery({
    queryKey: ['chats', 'list'],
    queryFn: listChats,
  });
}

export function useCreateChatMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createChat,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['chats', 'list'] });
    },
  });
}

export function useDeleteChatMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteChat,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['chats', 'list'] });
    },
  });
}

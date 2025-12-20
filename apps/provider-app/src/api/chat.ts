import {apiClient} from './client';

export interface Message {
  id: string;
  bookingId: string;
  senderId: string;
  content: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  isOwn: boolean;
}

export const chatApi = {
  getMessages: (bookingId: string) =>
    apiClient.get<{data: Message[]}>(`/chat/${bookingId}/messages`),

  sendMessage: (bookingId: string, content: string) =>
    apiClient.post<{data: Message}>(`/chat/${bookingId}/messages`, {content}),

  markAsRead: (bookingId: string) =>
    apiClient.post(`/chat/${bookingId}/read`),

  getUnreadCount: (bookingId: string) =>
    apiClient.get<{data: {count: number}}>(`/chat/${bookingId}/unread`),
};

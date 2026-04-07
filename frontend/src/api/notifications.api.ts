import { apiClient } from './client';

export const notificationsApi = {
  send: async (data: any) => apiClient.post('/v1/send', data).then(r => r.data),
  sendBatch: async (data: any) => apiClient.post('/v1/send/batch', data).then(r => r.data),
};

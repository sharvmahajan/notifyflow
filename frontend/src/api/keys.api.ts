import { apiClient } from './client';

export const keysApi = {
  list: async () => apiClient.get('/keys').then(r => r.data.keys),
  create: async (data: any) => apiClient.post('/keys', data).then(r => r.data),
  pause: async (id: string) => apiClient.post(`/keys/${id}/pause`).then(r => r.data),
  resume: async (id: string) => apiClient.post(`/keys/${id}/resume`).then(r => r.data),
  delete: async (id: string) => apiClient.delete(`/keys/${id}`).then(r => r.data),
  // Legacy alias
  revoke: async (id: string) => apiClient.delete(`/keys/${id}`).then(r => r.data),
};

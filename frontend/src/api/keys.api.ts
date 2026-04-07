import { apiClient } from './client';

export const keysApi = {
  list: async () => apiClient.get('/keys').then(r => r.data.keys),
  create: async (data: any) => apiClient.post('/keys', data).then(r => r.data),
  revoke: async (id: string) => apiClient.delete(`/keys/${id}`).then(r => r.data),
};

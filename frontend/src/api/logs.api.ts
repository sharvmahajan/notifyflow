import { apiClient } from './client';

export const logsApi = {
  getLogs: async (params: any) => apiClient.get('/logs', { params }).then(r => r.data),
};

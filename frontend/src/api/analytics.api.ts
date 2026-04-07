import { apiClient } from './client';

export const analyticsApi = {
  getSummary: async () => apiClient.get('/analytics/summary').then(r => r.data),
};

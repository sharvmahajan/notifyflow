import { apiClient } from './client';

export const analyticsApi = {
  getSummary: async () => apiClient.get('/analytics/summary').then(r => r.data),
  getApiAnalytics: async (apiId: string, filters: any = {}) => {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('start_date', filters.startDate);
    if (filters.endDate) params.append('end_date', filters.endDate);
    if (filters.channel) params.append('channel', filters.channel);
    if (filters.status) params.append('status', filters.status);
    
    return apiClient.get(`/keys/${apiId}/analytics?${params.toString()}`).then(r => r.data.data);
  }
};

import { apiClient } from './client';

export const authApi = {
  signup: async (data: any) => apiClient.post('/auth/signup', data).then(r => r.data),
  login: async (data: any) => apiClient.post('/auth/login', data).then(r => r.data),
  logout: async () => apiClient.post('/auth/logout').then(r => r.data),
  me: async () => apiClient.get('/auth/me').then(r => r.data),
};

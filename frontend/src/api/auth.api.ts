import { apiClient, ensureSocHintIpFresh } from './client';

export const authApi = {
  signup: async (data: any) => apiClient.post('/auth/signup', data).then(r => r.data),
  login: async (data: any, headers?: any) => {
    const ipHint = await ensureSocHintIpFresh(true);
    return apiClient
      .post('/auth/login', data, { headers: { ...(headers || {}), ...(ipHint ? { 'x-client-ip': ipHint } : {}) } })
      .then(r => r.data);
  },
  logout: async () => apiClient.post('/auth/logout').then(r => r.data),
  me: async () => apiClient.get('/auth/me').then(r => r.data),
};

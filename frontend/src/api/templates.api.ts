import { apiClient } from './client';

export const templatesApi = {
  list: async () => apiClient.get('/templates').then(r => r.data.templates),
  create: async (data: any) => apiClient.post('/templates', data).then(r => r.data.template),
  update: async (id: string, data: any) => apiClient.put(`/templates/${id}`, data).then(r => r.data.template),
  delete: async (id: string) => apiClient.delete(`/templates/${id}`).then(r => r.data),
};

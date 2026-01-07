import api from './api';

export const authService = {
  async login(email: string, password: string) {
    const response = await api.post('/auth/admin/login', { email, password });
    return response.data;
  },

  async logout() {
    // Clear token on backend if needed
    // For now, just clear local storage
  },
};

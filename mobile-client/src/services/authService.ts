import api from './api';

export const authService = {
  async requestOtp(phoneNumber: string) {
    const response = await api.post('/auth/request-otp', { phoneNumber });
    return response.data;
  },

  async verifyOtp(phoneNumber: string, otp: string) {
    const response = await api.post('/auth/verify-otp', { phoneNumber, otp });
    return response.data;
  },
};

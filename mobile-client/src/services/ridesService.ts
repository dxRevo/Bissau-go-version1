import api from './api';

export const ridesService = {
  async createRide(data: {
    pickupLocation: { latitude: number; longitude: number; address: string };
    dropoffLocation: { latitude: number; longitude: number; address: string };
    vehicleType?: string;
  }) {
    const response = await api.post('/rides', data);
    return response.data;
  },

  async getRides() {
    const response = await api.get('/rides');
    return response.data;
  },

  async getRideById(id: string) {
    const response = await api.get(`/rides/${id}`);
    return response.data;
  },

  async cancelRide(id: string) {
    const response = await api.post(`/rides/${id}/cancel`);
    return response.data;
  },

  async rateRide(id: string, rating: number, comment?: string) {
    const response = await api.post(`/rides/${id}/rate`, { rating, comment });
    return response.data;
  },

  async getActiveRide() {
    const response = await api.get('/rides/active');
    return response.data;
  },
};

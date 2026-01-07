import api from './api';

export const ridesService = {
  async getAvailableRides() {
    const response = await api.get('/rides/available');
    return response.data;
  },

  async acceptRide(rideId: string) {
    const response = await api.post(`/rides/${rideId}/accept`);
    return response.data;
  },

  async getActiveRide() {
    const response = await api.get('/rides/active');
    return response.data;
  },

  async updateRideStatus(rideId: string, status: string) {
    const response = await api.post(`/rides/${rideId}/status`, { status });
    return response.data;
  },

  async getRides() {
    const response = await api.get('/rides');
    return response.data;
  },

  async rateRide(rideId: string, rating: number, comment?: string) {
    const response = await api.post(`/rides/${rideId}/rate`, { rating, comment });
    return response.data;
  },
};








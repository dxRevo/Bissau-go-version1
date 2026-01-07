import api from './api';

export const deliveriesService = {
  async getAvailableDeliveries() {
    const response = await api.get('/deliveries/available');
    return response.data;
  },

  async acceptDelivery(deliveryId: string) {
    const response = await api.post(`/deliveries/${deliveryId}/accept`);
    return response.data;
  },

  async getActiveDelivery() {
    const response = await api.get('/deliveries/active');
    return response.data;
  },

  async updateDeliveryStatus(deliveryId: string, status: string) {
    const response = await api.post(`/deliveries/${deliveryId}/status`, { status });
    return response.data;
  },

  async getDeliveries() {
    const response = await api.get('/deliveries');
    return response.data;
  },
};









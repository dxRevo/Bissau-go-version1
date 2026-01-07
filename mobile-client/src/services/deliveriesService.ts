import api from './api';

export const deliveriesService = {
  async createDelivery(data: {
    pickupLocation: { latitude: number; longitude: number; address: string };
    dropoffLocation: { latitude: number; longitude: number; address: string };
    itemDescription?: string;
    itemWeight?: number;
  }) {
    const response = await api.post('/deliveries', data);
    return response.data;
  },

  async getDeliveries() {
    const response = await api.get('/deliveries');
    return response.data;
  },

  async getDeliveryById(id: string) {
    const response = await api.get(`/deliveries/${id}`);
    return response.data;
  },

  async cancelDelivery(id: string) {
    const response = await api.post(`/deliveries/${id}/cancel`);
    return response.data;
  },
};

import api from './api';

export const driversService = {
  async updateOnlineStatus(isOnline: boolean, location?: { latitude: number; longitude: number }) {
    try {
      console.log(`🔄 Updating online status: isOnline=${isOnline}, location=${location ? 'provided' : 'none'}`);
      // L'URL de base contient déjà /api, donc on utilise juste /drivers/online-status
      const response = await api.post('/drivers/online-status', { isOnline, location });
      console.log(`✅ Online status updated successfully`);
      return response.data;
    } catch (error: any) {
      const status = error.response?.status;
      const message = error.response?.data?.message || error.message;
      console.error(`❌ Failed to update online status:`, status, message);
      
      // Si 404, c'est que l'endpoint n'existe pas - peut-être que le backend n'a pas été redémarré
      if (status === 404) {
        console.error('⚠️ Endpoint not found. Make sure:');
        console.error('  1. The backend is running');
        console.error('  2. DriversModule is registered in app.module.ts');
        console.error('  3. The backend has been restarted after adding DriversModule');
      }
      
      throw error;
    }
  },

  async getProfile() {
    const response = await api.get('/drivers/profile');
    return response.data;
  },
};

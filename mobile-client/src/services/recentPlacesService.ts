import AsyncStorage from '@react-native-async-storage/async-storage';

const RECENT_PLACES_KEY = 'recentPlaces';

export const recentPlacesService = {
  async getRecentPlaces(): Promise<Array<{ address: string; latitude: number; longitude: number }>> {
    try {
      const data = await AsyncStorage.getItem(RECENT_PLACES_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting recent places:', error);
      return [];
    }
  },

  async addRecentPlace(place: { address: string; latitude: number; longitude: number }) {
    try {
      const places = await this.getRecentPlaces();
      // Remove duplicate if exists
      const filtered = places.filter(p => p.address !== place.address);
      // Add to beginning
      const updated = [place, ...filtered].slice(0, 10); // Keep only last 10
      await AsyncStorage.setItem(RECENT_PLACES_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error adding recent place:', error);
    }
  },

  async clearRecentPlaces() {
    try {
      await AsyncStorage.removeItem(RECENT_PLACES_KEY);
    } catch (error) {
      console.error('Error clearing recent places:', error);
    }
  },
};

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configurer le comportement des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const notificationsService = {
  /**
   * Demander les permissions et enregistrer le token FCM
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Failed to get push token for push notification!');
        return null;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'your-project-id', // À remplacer par votre project ID Expo
      });

      const token = tokenData.data;
      console.log('📱 Expo Push Token:', token);

      try {
        await api.post('/notifications/register-token', { fcmToken: token });
        await AsyncStorage.setItem('fcmToken', token);
        console.log('✅ FCM token registered on backend');
      } catch (error: any) {
        console.error('❌ Failed to register FCM token on backend:', error);
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      return token;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  },

  /**
   * Configurer les listeners de notifications
   */
  setupNotificationListeners(
    onNotificationReceived: (notification: Notifications.Notification) => void,
    onNotificationTapped: (response: Notifications.NotificationResponse) => void,
  ) {
    const receivedListener = Notifications.addNotificationReceivedListener(onNotificationReceived);
    const responseListener = Notifications.addNotificationResponseReceivedListener(onNotificationTapped);

    return () => {
      Notifications.removeNotificationSubscription(receivedListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  },

  /**
   * Supprimer le token FCM
   */
  async unregisterToken() {
    try {
      await api.post('/notifications/remove-token');
      await AsyncStorage.removeItem('fcmToken');
      console.log('✅ FCM token removed');
    } catch (error) {
      console.error('❌ Failed to remove FCM token:', error);
    }
  },
};







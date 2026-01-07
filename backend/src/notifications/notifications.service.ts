import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { PrismaService } from '../prisma/prisma.service';
import { VehicleCategory } from '@prisma/client';
import { calculateDistance } from '../utils/distance.util';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private firebaseApp: admin.app.App | null = null;

  constructor(private prisma: PrismaService) {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      // Vérifier si Firebase est déjà initialisé
      if (admin.apps.length > 0) {
        this.firebaseApp = admin.app();
        this.logger.log('Firebase Admin already initialized');
        return;
      }

      // Initialiser Firebase avec les credentials depuis les variables d'environnement
      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
      
      if (serviceAccount) {
        try {
          const serviceAccountJson = JSON.parse(serviceAccount);
          this.firebaseApp = admin.initializeApp({
            credential: admin.credential.cert(serviceAccountJson),
          });
          this.logger.log('Firebase Admin initialized with service account');
        } catch (error) {
          this.logger.warn('Failed to parse FIREBASE_SERVICE_ACCOUNT, trying default credentials');
          this.firebaseApp = admin.initializeApp();
        }
      } else {
        // Essayer d'initialiser avec les credentials par défaut (si disponibles)
        this.firebaseApp = admin.initializeApp();
        this.logger.log('Firebase Admin initialized with default credentials');
      }
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin:', error);
      this.logger.warn('Push notifications will not work until Firebase is properly configured');
    }
  }

  /**
   * Enregistrer ou mettre à jour le token FCM d'un utilisateur
   */
  async registerFcmToken(userId: string, fcmToken: string, userType: 'USER' | 'DRIVER') {
    try {
      if (userType === 'USER') {
        await this.prisma.user.update({
          where: { id: userId },
          data: { fcmToken },
        });
      } else {
        await this.prisma.driver.update({
          where: { id: userId },
          data: { fcmToken },
        });
      }
      this.logger.log(`FCM token registered for ${userType} ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to register FCM token for ${userType} ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Envoyer une notification push à un utilisateur
   */
  async sendNotification(
    userId: string,
    userType: 'USER' | 'DRIVER',
    title: string,
    body: string,
    data?: Record<string, any>,
  ) {
    if (!this.firebaseApp) {
      this.logger.warn('Firebase not initialized, skipping notification');
      return;
    }

    try {
      let fcmToken: string | null = null;

      if (userType === 'USER') {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { fcmToken: true },
        });
        fcmToken = user?.fcmToken || null;
      } else {
        const driver = await this.prisma.driver.findUnique({
          where: { id: userId },
          select: { fcmToken: true },
        });
        fcmToken = driver?.fcmToken || null;
      }

      if (!fcmToken) {
        this.logger.warn(`No FCM token found for ${userType} ${userId}`);
        return;
      }

      const message: admin.messaging.Message = {
        notification: {
          title,
          body,
        },
        data: data ? this.stringifyData(data) : undefined,
        token: fcmToken,
        android: {
          priority: 'high',
        },
        apns: {
          headers: {
            'apns-priority': '10',
          },
        },
      };

      const response = await admin.messaging().send(message);
      this.logger.log(`Notification sent successfully to ${userType} ${userId}: ${response}`);
      return response;
    } catch (error: any) {
      this.logger.error(`Failed to send notification to ${userType} ${userId}:`, error);
      
      // Si le token est invalide, le supprimer
      if (error.code === 'messaging/invalid-registration-token' || 
          error.code === 'messaging/registration-token-not-registered') {
        await this.removeFcmToken(userId, userType);
      }
      
      throw error;
    }
  }

  /**
   * Envoyer une notification à plusieurs utilisateurs
   */
  async sendMulticast(
    userIds: string[],
    userType: 'USER' | 'DRIVER',
    title: string,
    body: string,
    data?: Record<string, any>,
  ) {
    if (!this.firebaseApp || userIds.length === 0) {
      return;
    }

    try {
      const tokens: string[] = [];

      if (userType === 'USER') {
        const users = await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, fcmToken: true },
        });
        tokens.push(...users.filter(u => u.fcmToken).map(u => u.fcmToken!));
      } else {
        const drivers = await this.prisma.driver.findMany({
          where: { id: { in: userIds } },
          select: { id: true, fcmToken: true },
        });
        tokens.push(...drivers.filter(d => d.fcmToken).map(d => d.fcmToken!));
      }

      if (tokens.length === 0) {
        this.logger.warn(`No FCM tokens found for ${userType}s`);
        return;
      }

      const message: admin.messaging.MulticastMessage = {
        notification: {
          title,
          body,
        },
        data: data ? this.stringifyData(data) : undefined,
        tokens,
        android: {
          priority: 'high',
        },
        apns: {
          headers: {
            'apns-priority': '10',
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      this.logger.log(`Multicast notification sent: ${response.successCount} successful, ${response.failureCount} failed`);
      return response;
    } catch (error) {
      this.logger.error(`Failed to send multicast notification:`, error);
      throw error;
    }
  }

  /**
   * Notifier les drivers les plus proches et conformes au type de commande
   */
  async notifyDriversNewRide(
    rideId: string,
    pickupLatitude: number,
    pickupLongitude: number,
    pickupAddress: string,
    dropoffAddress: string,
    price: number,
    category: VehicleCategory,
    maxDistanceKm: number = 10, // Rayon de recherche par défaut: 10 km
  ) {
    try {
      // Récupérer tous les drivers en ligne avec leur véhicule et position
      const onlineDrivers = await this.prisma.driver.findMany({
        where: {
          isOnline: true,
          role: 'DRIVER',
          fcmToken: { not: null },
          currentLatitude: { not: null },
          currentLongitude: { not: null },
          vehicle: {
            category: category, // Filtrer par catégorie de véhicule
          },
        },
        include: {
          vehicle: {
            select: {
              category: true,
            },
          },
        },
      });

      if (onlineDrivers.length === 0) {
        this.logger.log(`No online drivers with category ${category} and FCM tokens found`);
        return;
      }

      // Calculer la distance pour chaque driver et filtrer ceux dans le rayon
      const eligibleDrivers = onlineDrivers
        .map((driver) => {
          if (!driver.currentLatitude || !driver.currentLongitude) {
            return null;
          }

          const distance = calculateDistance(
            pickupLatitude,
            pickupLongitude,
            driver.currentLatitude,
            driver.currentLongitude,
          );

          return {
            driverId: driver.id,
            distance,
          };
        })
        .filter((d): d is { driverId: string; distance: number } => d !== null && d.distance <= maxDistanceKm)
        .sort((a, b) => a.distance - b.distance); // Trier par distance croissante

      if (eligibleDrivers.length === 0) {
        this.logger.log(`No drivers found within ${maxDistanceKm}km for category ${category}`);
        return;
      }

      // Limiter aux 10 drivers les plus proches pour éviter de spammer
      const closestDrivers = eligibleDrivers.slice(0, 10);
      const driverIds = closestDrivers.map((d) => d.driverId);

      this.logger.log(
        `Notifying ${driverIds.length} closest drivers (category: ${category}, max distance: ${maxDistanceKm}km)`,
      );

      await this.sendMulticast(
        driverIds,
        'DRIVER',
        'Nouvelle course disponible',
        `De ${pickupAddress} à ${dropoffAddress} - ${price} FCFA`,
        {
          type: 'NEW_RIDE',
          rideId,
          action: 'VIEW_RIDE',
        },
      );
    } catch (error) {
      this.logger.error('Failed to notify drivers of new ride:', error);
    }
  }

  /**
   * Notifier les livreurs les plus proches d'une nouvelle livraison
   */
  async notifyDeliveryPersonsNewDelivery(
    deliveryId: string,
    pickupLatitude: number,
    pickupLongitude: number,
    pickupAddress: string,
    dropoffAddress: string,
    price: number,
    maxDistanceKm: number = 10, // Rayon de recherche par défaut: 10 km
  ) {
    try {
      // Récupérer tous les livreurs en ligne avec leur position
      const onlineDeliveryPersons = await this.prisma.driver.findMany({
        where: {
          isOnline: true,
          role: 'DELIVERY',
          fcmToken: { not: null },
          currentLatitude: { not: null },
          currentLongitude: { not: null },
        },
      });

      if (onlineDeliveryPersons.length === 0) {
        this.logger.log('No online delivery persons with FCM tokens and location found');
        return;
      }

      // Calculer la distance pour chaque livreur et filtrer ceux dans le rayon
      const eligibleDeliveryPersons = onlineDeliveryPersons
        .map((deliveryPerson) => {
          if (!deliveryPerson.currentLatitude || !deliveryPerson.currentLongitude) {
            return null;
          }

          const distance = calculateDistance(
            pickupLatitude,
            pickupLongitude,
            deliveryPerson.currentLatitude,
            deliveryPerson.currentLongitude,
          );

          return {
            deliveryPersonId: deliveryPerson.id,
            distance,
          };
        })
        .filter(
          (d): d is { deliveryPersonId: string; distance: number } =>
            d !== null && d.distance <= maxDistanceKm,
        )
        .sort((a, b) => a.distance - b.distance); // Trier par distance croissante

      if (eligibleDeliveryPersons.length === 0) {
        this.logger.log(`No delivery persons found within ${maxDistanceKm}km`);
        return;
      }

      // Limiter aux 10 livreurs les plus proches
      const closestDeliveryPersons = eligibleDeliveryPersons.slice(0, 10);
      const deliveryPersonIds = closestDeliveryPersons.map((d) => d.deliveryPersonId);

      this.logger.log(
        `Notifying ${deliveryPersonIds.length} closest delivery persons (max distance: ${maxDistanceKm}km)`,
      );

      await this.sendMulticast(
        deliveryPersonIds,
        'DRIVER',
        'Nouvelle livraison disponible',
        `De ${pickupAddress} à ${dropoffAddress} - ${price} FCFA`,
        {
          type: 'NEW_DELIVERY',
          deliveryId,
          action: 'VIEW_DELIVERY',
        },
      );
    } catch (error) {
      this.logger.error('Failed to notify delivery persons of new delivery:', error);
    }
  }

  /**
   * Notifier un client qu'un conducteur a accepté sa course
   */
  async notifyClientRideAccepted(clientId: string, driverName: string, rideId: string) {
    await this.sendNotification(
      clientId,
      'USER',
      'Course acceptée',
      `${driverName} a accepté votre course`,
      {
        type: 'RIDE_ACCEPTED',
        rideId,
        action: 'VIEW_RIDE',
      },
    );
  }

  /**
   * Notifier un client qu'un livreur a accepté sa livraison
   */
  async notifyClientDeliveryAccepted(clientId: string, deliveryPersonName: string, deliveryId: string) {
    await this.sendNotification(
      clientId,
      'USER',
      'Livraison acceptée',
      `${deliveryPersonName} a accepté votre livraison`,
      {
        type: 'DELIVERY_ACCEPTED',
        deliveryId,
        action: 'VIEW_DELIVERY',
      },
    );
  }

  /**
   * Supprimer le token FCM d'un utilisateur
   */
  async removeFcmToken(userId: string, userType: 'USER' | 'DRIVER') {
    try {
      if (userType === 'USER') {
        await this.prisma.user.update({
          where: { id: userId },
          data: { fcmToken: null },
        });
      } else {
        await this.prisma.driver.update({
          where: { id: userId },
          data: { fcmToken: null },
        });
      }
      this.logger.log(`FCM token removed for ${userType} ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to remove FCM token for ${userType} ${userId}:`, error);
    }
  }

  /**
   * Convertir les données en format string pour FCM
   */
  private stringifyData(data: Record<string, any>): Record<string, string> {
    const stringData: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      stringData[key] = typeof value === 'string' ? value : JSON.stringify(value);
    }
    return stringData;
  }
}

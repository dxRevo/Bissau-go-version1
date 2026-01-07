import {
  WebSocketGateway as WSGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { VehicleCategory } from '@prisma/client';
import { calculateDistance } from '../utils/distance.util';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userType?: 'USER' | 'DRIVER';
  role?: string;
  currentLatitude?: number;
  currentLongitude?: number;
  vehicleCategory?: VehicleCategory;
}

@WSGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/realtime',
})
export class WebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebSocketGateway.name);
  private connectedClients = new Map<string, AuthenticatedSocket>();
  private driverRooms = new Map<string, Set<string>>(); // driverId -> Set of socketIds

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Authentifier le client via le token JWT
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');
      
      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.disconnect();
        return;
      }

      try {
        const payload = this.jwtService.verify(token);
        client.userId = payload.userId || payload.sub;
        client.userType = payload.userType || (payload.role === 'CLIENT' ? 'USER' : 'DRIVER');
        client.role = payload.role;
      } catch (error: any) {
        // Gérer l'expiration du token et autres erreurs JWT
        if (error.name === 'TokenExpiredError') {
          this.logger.warn(`Client ${client.id} connected with expired token`);
          // Envoyer un message d'erreur avant de déconnecter
          client.emit('error', { 
            type: 'TOKEN_EXPIRED', 
            message: 'Token expired. Please reconnect with a new token.' 
          });
        } else if (error.name === 'JsonWebTokenError') {
          this.logger.warn(`Client ${client.id} connected with invalid token: ${error.message}`);
          client.emit('error', { 
            type: 'INVALID_TOKEN', 
            message: 'Invalid token. Please reconnect with a valid token.' 
          });
        } else {
          this.logger.error(`JWT verification error for client ${client.id}:`, error.message);
          client.emit('error', { 
            type: 'AUTH_ERROR', 
            message: 'Authentication failed.' 
          });
        }
        // Attendre un peu pour que le message d'erreur soit envoyé
        setTimeout(() => {
          client.disconnect();
        }, 100);
        return;
      }

      this.connectedClients.set(client.id, client);

      // Si c'est un driver, récupérer sa position et catégorie de véhicule
      if (client.userType === 'DRIVER' && client.userId) {
        const roomName = `driver:${client.userId}`;
        client.join(roomName);
        
        if (!this.driverRooms.has(client.userId)) {
          this.driverRooms.set(client.userId, new Set());
        }
        this.driverRooms.get(client.userId)!.add(client.id);

        // Récupérer la position et la catégorie de véhicule du driver
        try {
          const driver = await this.prisma.driver.findUnique({
            where: { id: client.userId },
            include: {
              vehicle: {
                select: {
                  category: true,
                },
              },
            },
          });

          if (driver) {
            client.currentLatitude = driver.currentLatitude || undefined;
            client.currentLongitude = driver.currentLongitude || undefined;
            client.vehicleCategory = driver.vehicle?.category || undefined;
          }
        } catch (error) {
          this.logger.error(`Failed to load driver data for ${client.userId}:`, error);
        }

        this.logger.log(`Driver ${client.userId} connected (socket: ${client.id})`);
      } else if (client.userType === 'USER' && client.userId) {
        const roomName = `user:${client.userId}`;
        client.join(roomName);
        this.logger.log(`User ${client.userId} connected (socket: ${client.id})`);
      }

      // Envoyer un message de confirmation
      client.emit('connected', { message: 'Connected to real-time updates' });
    } catch (error) {
      this.logger.error(`Authentication failed for client ${client.id}:`, error);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId && client.userType === 'DRIVER') {
      const driverSockets = this.driverRooms.get(client.userId);
      if (driverSockets) {
        driverSockets.delete(client.id);
        if (driverSockets.size === 0) {
          this.driverRooms.delete(client.userId);
        }
      }
    }
    
    this.connectedClients.delete(client.id);
    this.logger.log(`Client ${client.id} disconnected`);
  }

  /**
   * Notifier les drivers les plus proches et conformes au type de commande
   */
  async notifyNewRide(ride: any, maxDistanceKm: number = 10) {
    const rideData = {
      type: 'NEW_RIDE',
      ride: {
        id: ride.id,
        pickupLocation: {
          latitude: ride.pickupLatitude,
          longitude: ride.pickupLongitude,
          address: ride.pickupAddress,
        },
        dropoffLocation: {
          latitude: ride.dropoffLatitude,
          longitude: ride.dropoffLongitude,
          address: ride.dropoffAddress,
        },
        totalPrice: ride.totalPrice,
        category: ride.category,
        createdAt: ride.createdAt,
      },
    };

    // Récupérer tous les sockets connectés dans la room des drivers
    const driverRoom = this.server.sockets.adapter.rooms.get('drivers:online');
    if (!driverRoom || driverRoom.size === 0) {
      this.logger.log(`No drivers in online room for ride ${ride.id}`);
      return;
    }

    const eligibleSockets: { socket: AuthenticatedSocket; distance: number }[] = [];

    // Vérifier chaque driver connecté
    for (const socketId of driverRoom) {
      const socket = this.server.sockets.sockets.get(socketId) as AuthenticatedSocket | undefined;
      if (!socket || socket.userType !== 'DRIVER' || socket.role !== 'DRIVER') {
        continue;
      }

      // Vérifier la catégorie de véhicule
      if (socket.vehicleCategory !== ride.category) {
        continue;
      }

      // Vérifier la distance
      if (!socket.currentLatitude || !socket.currentLongitude) {
        continue;
      }

      const distance = calculateDistance(
        ride.pickupLatitude,
        ride.pickupLongitude,
        socket.currentLatitude,
        socket.currentLongitude,
      );

      if (distance <= maxDistanceKm) {
        eligibleSockets.push({ socket, distance });
      }
    }

    // Trier par distance et prendre les 10 plus proches
    eligibleSockets.sort((a, b) => a.distance - b.distance);
    const closestSockets = eligibleSockets.slice(0, 10);

    // Envoyer à chaque driver éligible
    closestSockets.forEach(({ socket }) => {
      socket.emit('new_ride', rideData);
    });

    this.logger.log(
      `Notified ${closestSockets.length} closest drivers (category: ${ride.category}, max distance: ${maxDistanceKm}km) of ride ${ride.id}`,
    );
  }

  /**
   * Notifier les livreurs les plus proches d'une nouvelle livraison
   */
  async notifyNewDelivery(delivery: any, maxDistanceKm: number = 10) {
    const deliveryData = {
      type: 'NEW_DELIVERY',
      delivery: {
        id: delivery.id,
        pickupLocation: {
          latitude: delivery.pickupLatitude,
          longitude: delivery.pickupLongitude,
          address: delivery.pickupAddress,
        },
        dropoffLocation: {
          latitude: delivery.dropoffLatitude,
          longitude: delivery.dropoffLongitude,
          address: delivery.dropoffAddress,
        },
        totalPrice: delivery.totalPrice,
        createdAt: delivery.createdAt,
      },
    };

    // Récupérer tous les sockets connectés dans la room des livreurs
    const deliveryRoom = this.server.sockets.adapter.rooms.get('delivery:online');
    if (!deliveryRoom || deliveryRoom.size === 0) {
      this.logger.log(`No delivery persons in online room for delivery ${delivery.id}`);
      return;
    }

    const eligibleSockets: { socket: AuthenticatedSocket; distance: number }[] = [];

    // Vérifier chaque livreur connecté
    for (const socketId of deliveryRoom) {
      const socket = this.server.sockets.sockets.get(socketId) as AuthenticatedSocket | undefined;
      if (!socket || socket.userType !== 'DRIVER' || socket.role !== 'DELIVERY') {
        continue;
      }

      // Vérifier la distance
      if (!socket.currentLatitude || !socket.currentLongitude) {
        continue;
      }

      const distance = calculateDistance(
        delivery.pickupLatitude,
        delivery.pickupLongitude,
        socket.currentLatitude,
        socket.currentLongitude,
      );

      if (distance <= maxDistanceKm) {
        eligibleSockets.push({ socket, distance });
      }
    }

    // Trier par distance et prendre les 10 plus proches
    eligibleSockets.sort((a, b) => a.distance - b.distance);
    const closestSockets = eligibleSockets.slice(0, 10);

    // Envoyer à chaque livreur éligible
    closestSockets.forEach(({ socket }) => {
      socket.emit('new_delivery', deliveryData);
    });

    this.logger.log(
      `Notified ${closestSockets.length} closest delivery persons (max distance: ${maxDistanceKm}km) of delivery ${delivery.id}`,
    );
  }

  /**
   * Notifier un client qu'un conducteur a accepté sa course
   */
  notifyRideAccepted(userId: string, ride: any, driver: any) {
    this.server.to(`user:${userId}`).emit('ride_accepted', {
      type: 'RIDE_ACCEPTED',
      ride: {
        id: ride.id,
        driver: {
          id: driver.id,
          firstName: driver.firstName,
          lastName: driver.lastName,
          phoneNumber: driver.phoneNumber,
        },
      },
    });
    this.logger.log(`Notified user ${userId} that ride ${ride.id} was accepted`);
  }

  /**
   * Notifier un client qu'un livreur a accepté sa livraison
   */
  notifyDeliveryAccepted(userId: string, delivery: any, deliveryPerson: any) {
    this.server.to(`user:${userId}`).emit('delivery_accepted', {
      type: 'DELIVERY_ACCEPTED',
      delivery: {
        id: delivery.id,
        deliveryPerson: {
          id: deliveryPerson.id,
          firstName: deliveryPerson.firstName,
          lastName: deliveryPerson.lastName,
          phoneNumber: deliveryPerson.phoneNumber,
        },
      },
    });
    this.logger.log(`Notified user ${userId} that delivery ${delivery.id} was accepted`);
  }

  /**
   * Notifier un client d'un changement de statut de course
   */
  notifyRideStatusChange(userId: string, rideId: string, status: string) {
    this.server.to(`user:${userId}`).emit('ride_status_changed', {
      type: 'RIDE_STATUS_CHANGED',
      rideId,
      status,
    });
  }

  /**
   * Notifier un driver d'un changement de statut de course
   */
  notifyDriverRideStatusChange(driverId: string, rideId: string, status: string) {
    this.server.to(`driver:${driverId}`).emit('ride_status_changed', {
      type: 'RIDE_STATUS_CHANGED',
      rideId,
      status,
    });
  }

  @SubscribeMessage('join_drivers_room')
  handleJoinDriversRoom(@ConnectedSocket() client: AuthenticatedSocket) {
    if (client.userType === 'DRIVER' && client.role === 'DRIVER') {
      client.join('drivers:online');
      this.logger.log(`Driver ${client.userId} joined drivers room`);
    }
  }

  @SubscribeMessage('join_delivery_room')
  handleJoinDeliveryRoom(@ConnectedSocket() client: AuthenticatedSocket) {
    if (client.userType === 'DRIVER' && client.role === 'DELIVERY') {
      client.join('delivery:online');
      this.logger.log(`Delivery person ${client.userId} joined delivery room`);
    }
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: AuthenticatedSocket) {
    client.emit('pong', { timestamp: Date.now() });
  }

  /**
   * Diffuser la position GPS du driver au client
   */
  broadcastDriverLocation(userId: string, rideId: string, latitude: number, longitude: number) {
    this.server.to(`user:${userId}`).emit('driver_location_update', {
      type: 'DRIVER_LOCATION_UPDATE',
      rideId,
      location: {
        latitude,
        longitude,
      },
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Broadcasted driver location for ride ${rideId} to user ${userId}`);
  }
}


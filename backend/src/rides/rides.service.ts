import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VehicleCategory, RideStatus } from '@prisma/client';
import { PricingService } from './pricing.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WebSocketGateway } from '../websocket/websocket.gateway';

@Injectable()
export class RidesService {
  constructor(
    private prisma: PrismaService,
    private pricingService: PricingService,
    private notificationsService: NotificationsService,
    @Inject(forwardRef(() => WebSocketGateway))
    private websocketGateway: WebSocketGateway,
  ) {}

  async createRide(data: any, userId: string) {
    // Vérifier que l'utilisateur existe dans la table User
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Vérifier si le client a déjà une course active
    const activeRide = await this.prisma.ride.findFirst({
      where: {
        clientId: userId,
        status: {
          in: [
            RideStatus.PENDING,
            RideStatus.ACCEPTED,
            RideStatus.DRIVER_ARRIVED,
            RideStatus.IN_PROGRESS,
          ],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (activeRide) {
      throw new BadRequestException(
        'Vous avez déjà une course en cours. Veuillez annuler la course actuelle avant d\'en créer une nouvelle.',
      );
    }

    // Calculer la distance et la durée (avec trafic réel)
    const { distance, duration, durationInTraffic } = await this.pricingService.calculateDistanceAndDuration(
      data.pickupLocation.latitude,
      data.pickupLocation.longitude,
      data.dropoffLocation.latitude,
      data.dropoffLocation.longitude,
    );

    // Déterminer la catégorie du véhicule
    const category = data.vehicleType === 'CONFORT' ? VehicleCategory.CONFORT : VehicleCategory.ECO;

    // Calculer le prix avec tous les facteurs (trafic, heure, demande)
    const pricing = this.pricingService.calculatePrice(distance, duration, category, durationInTraffic);

    const ride = await this.prisma.ride.create({
      data: {
        clientId: userId,
        pickupLatitude: data.pickupLocation.latitude,
        pickupLongitude: data.pickupLocation.longitude,
        pickupAddress: data.pickupLocation.address,
        dropoffLatitude: data.dropoffLocation.latitude,
        dropoffLongitude: data.dropoffLocation.longitude,
        dropoffAddress: data.dropoffLocation.address,
        category,
        status: RideStatus.PENDING,
        distance: pricing.distance,
        duration: pricing.duration,
        basePrice: pricing.basePrice,
        distancePrice: pricing.distancePrice,
        durationPrice: pricing.durationPrice,
        totalPrice: pricing.totalPrice,
        commission: pricing.commission,
        driverEarnings: pricing.driverEarnings,
      },
      include: {
        client: true,
      },
    });
    
    console.log(`✅ Ride created: ${ride.id}, status: ${ride.status}, driverId: ${ride.driverId || 'null'}, clientId: ${ride.clientId}`);
    
    // Notifier les drivers via WebSocket et FCM (seulement les plus proches et conformes)
    try {
      await this.websocketGateway.notifyNewRide(ride, 10);
      this.notificationsService.notifyDriversNewRide(
        ride.id,
        ride.pickupLatitude,
        ride.pickupLongitude,
        ride.pickupAddress,
        ride.dropoffAddress,
        ride.totalPrice,
        category,
        10, // Rayon de recherche: 10 km
      );
    } catch (error) {
      console.error('Error sending notifications for new ride:', error);
      // Ne pas faire échouer la création de course si les notifications échouent
    }
    
    return ride;
  }

  async getRides(userId: string) {
    const rides = await this.prisma.ride.findMany({
      where: {
        clientId: userId,
      },
      include: {
        driver: {
          include: {
            vehicle: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return rides;
  }

  async getActiveRideForClient(clientId: string) {
    const ride = await this.prisma.ride.findFirst({
      where: {
        clientId,
        status: {
          in: [
            RideStatus.PENDING,
            RideStatus.ACCEPTED,
            RideStatus.DRIVER_ARRIVED,
            RideStatus.IN_PROGRESS,
          ],
        },
      },
      include: {
        driver: {
          include: {
            vehicle: true,
          },
        },
        client: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!ride) {
      return null;
    }

    return {
      ...ride,
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
      driver: ride.driver ? {
        ...ride.driver,
        location: ride.driver.currentLatitude && ride.driver.currentLongitude ? {
          latitude: ride.driver.currentLatitude,
          longitude: ride.driver.currentLongitude,
        } : null,
      } : null,
    };
  }

  async getRideById(id: string, userId: string) {
    const ride = await this.prisma.ride.findFirst({
      where: {
        id,
        OR: [
          { clientId: userId },
          { driverId: userId },
        ],
      },
      include: {
        client: true,
        driver: {
          include: {
            vehicle: true,
          },
        },
      },
    });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    return {
      ...ride,
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
      driver: ride.driver ? {
        ...ride.driver,
        location: ride.driver.currentLatitude && ride.driver.currentLongitude ? {
          latitude: ride.driver.currentLatitude,
          longitude: ride.driver.currentLongitude,
        } : null,
      } : null,
    };
  }

  async cancelRide(id: string, userId: string) {
    const ride = await this.getRideById(id, userId);
    
    // Vérifier que c'est bien le client qui annule sa propre course
    if (ride.clientId !== userId) {
      throw new BadRequestException('Vous ne pouvez annuler que vos propres courses');
    }

    // Permettre l'annulation si la course est PENDING, ACCEPTED ou DRIVER_ARRIVED
    // Pas d'annulation si la course est déjà IN_PROGRESS, COMPLETED ou CANCELLED
    const cancellableStatuses: RideStatus[] = [
      RideStatus.PENDING,
      RideStatus.ACCEPTED,
      RideStatus.DRIVER_ARRIVED,
    ];

    if (!cancellableStatuses.includes(ride.status)) {
      throw new BadRequestException(
        `Impossible d'annuler une course avec le statut ${ride.status}. Seules les courses en attente, acceptées ou avec conducteur arrivé peuvent être annulées.`
      );
    }

    const updatedRide = await this.prisma.ride.update({
      where: { id },
      data: {
        status: RideStatus.CANCELLED,
        cancelledAt: new Date(),
      },
      include: {
        client: true,
        driver: true,
      },
    });

    // Notifier le driver via WebSocket et FCM si la course était acceptée
    if (ride.driverId && (ride.status === RideStatus.ACCEPTED || ride.status === RideStatus.DRIVER_ARRIVED)) {
      try {
        this.websocketGateway.notifyDriverRideStatusChange(ride.driverId, ride.id, RideStatus.CANCELLED);
        if (updatedRide.driver?.fcmToken) {
          this.notificationsService.sendNotification(
            ride.driverId,
            'DRIVER',
            'Course annulée',
            `La course a été annulée par le client.`,
            {
              type: 'RIDE_CANCELLED',
              rideId: ride.id,
            },
          );
        }
      } catch (error) {
        console.error('Error sending cancellation notifications to driver:', error);
        // Ne pas faire échouer l'annulation si les notifications échouent
      }
    }

    // Notifier le client via WebSocket
    try {
      this.websocketGateway.notifyRideStatusChange(ride.clientId, ride.id, RideStatus.CANCELLED);
    } catch (error) {
      console.error('Error sending cancellation notification to client:', error);
      // Ne pas faire échouer l'annulation si les notifications échouent
    }

    return updatedRide;
  }

  async rateRide(id: string, rating: number, comment: string | undefined, userId: string) {
    const ride = await this.getRideById(id, userId);
    
    if (ride.status !== RideStatus.COMPLETED) {
      throw new BadRequestException('Can only rate completed rides');
    }

    return this.prisma.ride.update({
      where: { id },
      data: {
        clientRating: rating,
        clientComment: comment,
      },
    });
  }

  async getAvailableRides(driverId?: string) {
    // Vérifier que le driver existe et a le rôle DRIVER
    if (driverId) {
      const driver = await this.prisma.driver.findUnique({
        where: { id: driverId },
      });
      
      if (!driver) {
        throw new NotFoundException('Driver not found');
      }
      
      if (driver.role !== 'DRIVER') {
        throw new BadRequestException('Only drivers can view rides');
      }
      
      // Vérifier que le driver est en ligne
      if (!driver.isOnline) {
        console.log(`⚠️ Driver ${driverId} is not online (isOnline: ${driver.isOnline})`);
        throw new BadRequestException('Driver must be online to view available rides');
      }
    }

    const rides = await this.prisma.ride.findMany({
      where: {
        status: RideStatus.PENDING,
        driverId: null,
      },
      include: {
        client: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });
    
    console.log(`🔍 Found ${rides.length} available rides for driver ${driverId || 'anonymous'}`);
    if (rides.length > 0) {
      console.log(`📋 Available rides: ${rides.map(r => r.id).join(', ')}`);
    }
    
    return rides.map(ride => ({
      ...ride,
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
    }));
  }

  async acceptRide(id: string, driverId: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id },
      include: {
        client: true,
      },
    });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    if (ride.status !== RideStatus.PENDING) {
      throw new BadRequestException('Ride is not available');
    }

    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    const updatedRide = await this.prisma.ride.update({
      where: { id },
      data: {
        driverId,
        status: RideStatus.ACCEPTED,
        acceptedAt: new Date(),
      },
      include: {
        client: true,
        driver: true,
      },
    });

    // Notifier le client via WebSocket et FCM
    try {
      this.websocketGateway.notifyRideAccepted(
        ride.clientId,
        updatedRide,
        driver,
      );
      this.notificationsService.notifyClientRideAccepted(
        ride.clientId,
        `${driver.firstName} ${driver.lastName}`,
        ride.id,
      );
    } catch (error) {
      console.error('Error sending notifications for ride acceptance:', error);
    }

    return updatedRide;
  }

  async getActiveRide(driverId: string) {
    const ride = await this.prisma.ride.findFirst({
      where: {
        driverId,
        status: {
          in: [RideStatus.ACCEPTED, RideStatus.DRIVER_ARRIVED, RideStatus.IN_PROGRESS],
        },
      },
      include: {
        client: true,
        driver: {
          include: {
            vehicle: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!ride) {
      throw new NotFoundException('No active ride');
    }

    return {
      ...ride,
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
    };
  }

  async updateRideStatus(id: string, status: string, driverId: string) {
    const ride = await this.prisma.ride.findFirst({
      where: {
        id,
        driverId,
      },
      include: {
        client: true,
        driver: true,
      },
    });

    if (!ride) {
      throw new NotFoundException('Ride not found');
    }

    // Convert string to RideStatus enum
    const normalizedStatus = status.toUpperCase().replace(/[\s-]/g, '_');
    let rideStatus: RideStatus;
    
    // Map common status strings to enum values
    switch (normalizedStatus) {
      case 'DRIVER_ARRIVED':
      case 'ARRIVED':
        rideStatus = RideStatus.DRIVER_ARRIVED;
        break;
      case 'IN_PROGRESS':
      case 'INPROGRESS':
        rideStatus = RideStatus.IN_PROGRESS;
        break;
      case 'ACCEPTED':
        rideStatus = RideStatus.ACCEPTED;
        break;
      case 'COMPLETED':
        rideStatus = RideStatus.COMPLETED;
        break;
      case 'CANCELLED':
      case 'CANCELED':
        rideStatus = RideStatus.CANCELLED;
        break;
      case 'PENDING':
        rideStatus = RideStatus.PENDING;
        break;
      default:
        // Try to match directly
        rideStatus = normalizedStatus as RideStatus;
    }

    // Valider les transitions de statut
    const validTransitions: Record<RideStatus, RideStatus[]> = {
      [RideStatus.PENDING]: [RideStatus.ACCEPTED, RideStatus.CANCELLED],
      [RideStatus.ACCEPTED]: [RideStatus.DRIVER_ARRIVED, RideStatus.CANCELLED],
      [RideStatus.DRIVER_ARRIVED]: [RideStatus.IN_PROGRESS, RideStatus.CANCELLED],
      [RideStatus.IN_PROGRESS]: [RideStatus.COMPLETED],
      [RideStatus.COMPLETED]: [],
      [RideStatus.CANCELLED]: [],
    };

    const allowedStatuses = validTransitions[ride.status];
    if (!allowedStatuses.includes(rideStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${ride.status} to ${rideStatus}. Allowed transitions: ${allowedStatuses.join(', ')}`
      );
    }

    // Préparer les données de mise à jour
    const updateData: any = { status: rideStatus };
    
    // Ajouter les timestamps selon le statut
    if (rideStatus === RideStatus.DRIVER_ARRIVED) {
      updateData.arrivedAt = new Date();
    } else if (rideStatus === RideStatus.IN_PROGRESS) {
      updateData.startedAt = new Date();
    } else if (rideStatus === RideStatus.COMPLETED) {
      updateData.completedAt = new Date();
    }

    // Mettre à jour le statut
    const updatedRide = await this.prisma.ride.update({
      where: { id },
      data: updateData,
      include: {
        client: true,
        driver: true,
      },
    });

    // Notifier le client via WebSocket
    try {
      this.websocketGateway.notifyRideStatusChange(ride.clientId, id, rideStatus);
      this.websocketGateway.notifyDriverRideStatusChange(driverId, id, rideStatus);

      // Messages spécifiques selon le statut
      if (rideStatus === RideStatus.DRIVER_ARRIVED) {
        this.notificationsService.notifyClient(
          ride.clientId,
          'Votre conducteur est arrivé',
          `${ride.driver?.firstName || 'Le conducteur'} est arrivé au point de départ`,
          { rideId: id, type: 'DRIVER_ARRIVED' }
        );
      } else if (rideStatus === RideStatus.IN_PROGRESS) {
        this.notificationsService.notifyClient(
          ride.clientId,
          'Trajet démarré',
          'Votre trajet a commencé',
          { rideId: id, type: 'RIDE_STARTED' }
        );
      } else if (rideStatus === RideStatus.COMPLETED) {
        this.notificationsService.notifyClient(
          ride.clientId,
          'Trajet terminé',
          'Votre trajet est terminé. N\'oubliez pas de noter votre conducteur !',
          { rideId: id, type: 'RIDE_COMPLETED' }
        );
      }
    } catch (error) {
      console.error('Error sending notifications for ride status update:', error);
    }
    
    return {
      ...updatedRide,
      pickupLocation: {
        latitude: updatedRide.pickupLatitude,
        longitude: updatedRide.pickupLongitude,
        address: updatedRide.pickupAddress,
      },
      dropoffLocation: {
        latitude: updatedRide.dropoffLatitude,
        longitude: updatedRide.dropoffLongitude,
        address: updatedRide.dropoffAddress,
      },
    };
  }
}

import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DeliveryStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { WebSocketGateway } from '../websocket/websocket.gateway';

@Injectable()
export class DeliveriesService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    @Inject(forwardRef(() => WebSocketGateway))
    private websocketGateway: WebSocketGateway,
  ) {}

  async createDelivery(data: any, userId: string) {
    const delivery = await this.prisma.delivery.create({
      data: {
        clientId: userId,
        pickupLatitude: data.pickupLocation.latitude,
        pickupLongitude: data.pickupLocation.longitude,
        pickupAddress: data.pickupLocation.address,
        pickupContactName: data.pickupLocation.contactName,
        pickupContactPhone: data.pickupLocation.contactPhone,
        dropoffLatitude: data.dropoffLocation.latitude,
        dropoffLongitude: data.dropoffLocation.longitude,
        dropoffAddress: data.dropoffLocation.address,
        dropoffContactName: data.dropoffLocation.contactName,
        dropoffContactPhone: data.dropoffLocation.contactPhone,
        packageDescription: data.packageDescription,
        packageWeight: data.packageWeight,
        estimatedValue: data.estimatedValue,
        status: DeliveryStatus.PENDING,
        distance: 0,
        duration: 0,
        basePrice: 0,
        distancePrice: 0,
        totalPrice: 0,
        commission: 0,
        deliveryEarnings: 0,
      },
      include: {
        client: true,
      },
    });

    // Notifier les livreurs via WebSocket et FCM (seulement les plus proches)
    try {
      await this.websocketGateway.notifyNewDelivery(delivery, 10);
      this.notificationsService.notifyDeliveryPersonsNewDelivery(
        delivery.id,
        delivery.pickupLatitude,
        delivery.pickupLongitude,
        delivery.pickupAddress,
        delivery.dropoffAddress,
        delivery.totalPrice,
        10, // Rayon de recherche: 10 km
      );
    } catch (error) {
      console.error('Error sending notifications for new delivery:', error);
      // Ne pas faire échouer la création de livraison si les notifications échouent
    }

    return delivery;
  }

  async getDeliveries(userId: string) {
    const deliveries = await this.prisma.delivery.findMany({
      where: {
        clientId: userId,
      },
      include: {
        deliveryPerson: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return deliveries;
  }

  async getDeliveryById(id: string, userId: string) {
    const delivery = await this.prisma.delivery.findFirst({
      where: {
        id,
        OR: [
          { clientId: userId },
          { deliveryPersonId: userId },
        ],
      },
      include: {
        client: true,
        deliveryPerson: true,
      },
    });

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    return {
      ...delivery,
      pickupLocation: {
        latitude: delivery.pickupLatitude,
        longitude: delivery.pickupLongitude,
        address: delivery.pickupAddress,
        contactName: delivery.pickupContactName,
        contactPhone: delivery.pickupContactPhone,
      },
      dropoffLocation: {
        latitude: delivery.dropoffLatitude,
        longitude: delivery.dropoffLongitude,
        address: delivery.dropoffAddress,
        contactName: delivery.dropoffContactName,
        contactPhone: delivery.dropoffContactPhone,
      },
    };
  }

  async getAvailableDeliveries(deliveryPersonId?: string) {
    // Vérifier que le delivery person existe et a le rôle DELIVERY
    if (deliveryPersonId) {
      const deliveryPerson = await this.prisma.driver.findUnique({
        where: { id: deliveryPersonId },
      });
      
      if (!deliveryPerson) {
        throw new NotFoundException('Delivery person not found');
      }
      
      if (deliveryPerson.role !== 'DELIVERY') {
        throw new BadRequestException('Only delivery persons can view deliveries');
      }
      
      // Vérifier que le delivery person est en ligne
      if (!deliveryPerson.isOnline) {
        throw new BadRequestException('Delivery person must be online to view available deliveries');
      }
    }

    const deliveries = await this.prisma.delivery.findMany({
      where: {
        status: DeliveryStatus.PENDING,
        deliveryPersonId: null,
      },
      include: {
        client: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });
    return deliveries.map(delivery => ({
      ...delivery,
      pickupLocation: {
        latitude: delivery.pickupLatitude,
        longitude: delivery.pickupLongitude,
        address: delivery.pickupAddress,
        contactName: delivery.pickupContactName,
        contactPhone: delivery.pickupContactPhone,
      },
      dropoffLocation: {
        latitude: delivery.dropoffLatitude,
        longitude: delivery.dropoffLongitude,
        address: delivery.dropoffAddress,
        contactName: delivery.dropoffContactName,
        contactPhone: delivery.dropoffContactPhone,
      },
    }));
  }

  async acceptDelivery(id: string, deliveryPersonId: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
      include: {
        client: true,
      },
    });

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    if (delivery.status !== DeliveryStatus.PENDING) {
      throw new BadRequestException('Delivery is not available');
    }

    const deliveryPerson = await this.prisma.driver.findUnique({
      where: { id: deliveryPersonId },
    });

    if (!deliveryPerson) {
      throw new NotFoundException('Delivery person not found');
    }

    const updatedDelivery = await this.prisma.delivery.update({
      where: { id },
      data: {
        deliveryPersonId,
        status: DeliveryStatus.ACCEPTED,
        acceptedAt: new Date(),
      },
      include: {
        client: true,
        deliveryPerson: true,
      },
    });

    // Notifier le client via WebSocket et FCM
    try {
      this.websocketGateway.notifyDeliveryAccepted(
        delivery.clientId,
        updatedDelivery,
        deliveryPerson,
      );
      this.notificationsService.notifyClientDeliveryAccepted(
        delivery.clientId,
        `${deliveryPerson.firstName} ${deliveryPerson.lastName}`,
        delivery.id,
      );
    } catch (error) {
      console.error('Error sending notifications for delivery acceptance:', error);
    }

    return updatedDelivery;
  }

  async getActiveDelivery(deliveryPersonId: string) {
    const delivery = await this.prisma.delivery.findFirst({
      where: {
        deliveryPersonId,
        status: {
          in: [DeliveryStatus.ACCEPTED, DeliveryStatus.PICKED_UP, DeliveryStatus.IN_TRANSIT],
        },
      },
      include: {
        client: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!delivery) {
      throw new NotFoundException('No active delivery');
    }

    return {
      ...delivery,
      pickupLocation: {
        latitude: delivery.pickupLatitude,
        longitude: delivery.pickupLongitude,
        address: delivery.pickupAddress,
        contactName: delivery.pickupContactName,
        contactPhone: delivery.pickupContactPhone,
      },
      dropoffLocation: {
        latitude: delivery.dropoffLatitude,
        longitude: delivery.dropoffLongitude,
        address: delivery.dropoffAddress,
        contactName: delivery.dropoffContactName,
        contactPhone: delivery.dropoffContactPhone,
      },
    };
  }

  async updateDeliveryStatus(id: string, status: string, deliveryPersonId: string) {
    const delivery = await this.prisma.delivery.findFirst({
      where: {
        id,
        deliveryPersonId,
      },
    });

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    // Convert string to DeliveryStatus enum
    const normalizedStatus = status.toUpperCase().replace(/[\s-]/g, '_');
    let deliveryStatus: DeliveryStatus;
    
    switch (normalizedStatus) {
      case 'PICKED_UP':
      case 'PICKEDUP':
        deliveryStatus = DeliveryStatus.PICKED_UP;
        break;
      case 'IN_TRANSIT':
      case 'INTRANSIT':
        deliveryStatus = DeliveryStatus.IN_TRANSIT;
        break;
      case 'DELIVERED':
        deliveryStatus = DeliveryStatus.DELIVERED;
        break;
      case 'CANCELLED':
      case 'CANCELED':
        deliveryStatus = DeliveryStatus.CANCELLED;
        break;
      case 'ACCEPTED':
        deliveryStatus = DeliveryStatus.ACCEPTED;
        break;
      case 'PENDING':
        deliveryStatus = DeliveryStatus.PENDING;
        break;
      default:
        deliveryStatus = normalizedStatus as DeliveryStatus;
    }
    
    return this.prisma.delivery.update({
      where: { id },
      data: { status: deliveryStatus },
    });
  }

  async cancelDelivery(id: string, userId: string) {
    const delivery = await this.getDeliveryById(id, userId);
    
    if (delivery.status !== DeliveryStatus.PENDING) {
      throw new BadRequestException('Cannot cancel delivery in this status');
    }

    return this.prisma.delivery.update({
      where: { id },
      data: { 
        status: DeliveryStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    });
  }
}

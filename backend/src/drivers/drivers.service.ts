import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WebSocketGateway } from '../websocket/websocket.gateway';

@Injectable()
export class DriversService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => WebSocketGateway))
    private websocketGateway: WebSocketGateway,
  ) {}

  async updateOnlineStatus(driverId: string, isOnline: boolean, location?: { latitude: number; longitude: number }) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    return this.prisma.driver.update({
      where: { id: driverId },
      data: {
        isOnline,
        ...(location && {
          currentLatitude: location.latitude,
          currentLongitude: location.longitude,
        }),
      },
    });
  }

  async getDriverProfile(driverId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      include: {
        vehicle: true,
      },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    return driver;
  }

  async updateLocation(driverId: string, latitude: number, longitude: number) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      include: {
        rides: {
          where: {
            status: {
              in: ['ACCEPTED', 'DRIVER_ARRIVED', 'IN_PROGRESS'],
            },
          },
          include: {
            client: true,
          },
        },
      },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    // Mettre à jour la position GPS
    const updatedDriver = await this.prisma.driver.update({
      where: { id: driverId },
      data: {
        currentLatitude: latitude,
        currentLongitude: longitude,
      },
    });

    // Diffuser la position aux clients qui ont une course active avec ce driver
    if (driver.rides && driver.rides.length > 0) {
      driver.rides.forEach((ride) => {
        try {
          this.websocketGateway.broadcastDriverLocation(
            ride.clientId,
            ride.id,
            latitude,
            longitude,
          );
        } catch (error) {
          console.error(`Error broadcasting location for ride ${ride.id}:`, error);
        }
      });
    }

    return updatedDriver;
  }
}

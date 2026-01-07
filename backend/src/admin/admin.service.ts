import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, UserStatus, VehicleCategory } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getAllRides() {
    return this.prisma.ride.findMany({
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getAllDeliveries() {
    return this.prisma.delivery.findMany({
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
        deliveryPerson: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getAllDrivers() {
    return this.prisma.driver.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        email: true,
        role: true,
        status: true,
        isOnline: true,
        vehicle: {
          select: {
            brand: true,
            model: true,
            plateNumber: true,
            category: true,
          },
        },
        _count: {
          select: {
            rides: true,
            deliveries: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getDriverById(id: string) {
    return this.prisma.driver.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        email: true,
        isOnline: true,
        vehicle: true,
        rides: {
          select: {
            id: true,
            status: true,
            totalPrice: true,
            createdAt: true,
            client: {
              select: {
                firstName: true,
                lastName: true,
                phoneNumber: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
        deliveries: {
          select: {
            id: true,
            status: true,
            totalPrice: true,
            createdAt: true,
            client: {
              select: {
                firstName: true,
                lastName: true,
                phoneNumber: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
      },
    });
  }

  async createDriver(data: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    email?: string;
    password: string;
    role: UserRole;
    status?: UserStatus;
  }) {
    // Vérifier si le numéro de téléphone existe déjà
    const existingDriver = await this.prisma.driver.findUnique({
      where: { phoneNumber: data.phoneNumber },
    });

    if (existingDriver) {
      throw new BadRequestException('Un conducteur avec ce numéro de téléphone existe déjà');
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Créer le driver
    const driver = await this.prisma.driver.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumber: data.phoneNumber,
        email: data.email,
        password: hashedPassword,
        role: data.role,
        status: data.status || UserStatus.PENDING_VALIDATION,
        isOnline: false,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        email: true,
        role: true,
        status: true,
        isOnline: true,
        createdAt: true,
      },
    });

    return driver;
  }

  async updateDriver(id: string, data: {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    email?: string;
    password?: string;
    role?: UserRole;
  }) {
    const driver = await this.prisma.driver.findUnique({
      where: { id },
    });

    if (!driver) {
      throw new NotFoundException('Conducteur non trouvé');
    }

    // Vérifier si le numéro de téléphone est déjà utilisé par un autre driver
    if (data.phoneNumber && data.phoneNumber !== driver.phoneNumber) {
      const existingDriver = await this.prisma.driver.findUnique({
        where: { phoneNumber: data.phoneNumber },
      });

      if (existingDriver) {
        throw new BadRequestException('Un conducteur avec ce numéro de téléphone existe déjà');
      }
    }

    // Préparer les données de mise à jour
    const updateData: any = {};
    if (data.firstName) updateData.firstName = data.firstName;
    if (data.lastName) updateData.lastName = data.lastName;
    if (data.phoneNumber) updateData.phoneNumber = data.phoneNumber;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.role) updateData.role = data.role;
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    const updatedDriver = await this.prisma.driver.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        email: true,
        role: true,
        status: true,
        isOnline: true,
        updatedAt: true,
      },
    });

    return updatedDriver;
  }

  async updateDriverStatus(id: string, status: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id },
    });

    if (!driver) {
      throw new NotFoundException('Conducteur non trouvé');
    }

    // Valider le statut
    const validStatuses = Object.values(UserStatus);
    if (!validStatuses.includes(status as UserStatus)) {
      throw new BadRequestException(`Statut invalide. Statuts valides: ${validStatuses.join(', ')}`);
    }

    const updateData: any = { status: status as UserStatus };

    // Si on active le driver, enregistrer qui l'a validé et quand
    if (status === UserStatus.ACTIVE && driver.status !== UserStatus.ACTIVE) {
      updateData.validatedAt = new Date();
    }

    const updatedDriver = await this.prisma.driver.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        email: true,
        role: true,
        status: true,
        isOnline: true,
        validatedAt: true,
        updatedAt: true,
      },
    });

    return updatedDriver;
  }

  async getStatistics() {
    const [
      totalRides,
      activeRides,
      completedRides,
      cancelledRides,
      totalDeliveries,
      activeDeliveries,
      completedDeliveries,
      totalDrivers,
      onlineDrivers,
      totalUsers,
      totalRevenue,
    ] = await Promise.all([
      this.prisma.ride.count(),
      this.prisma.ride.count({ where: { status: { in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS'] } } }),
      this.prisma.ride.count({ where: { status: 'COMPLETED' } }),
      this.prisma.ride.count({ where: { status: 'CANCELLED' } }),
      this.prisma.delivery.count(),
      this.prisma.delivery.count({ where: { status: { in: ['PENDING', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'] } } }),
      this.prisma.delivery.count({ where: { status: 'DELIVERED' } }),
      this.prisma.driver.count(),
      this.prisma.driver.count({ where: { isOnline: true } }),
      this.prisma.user.count(),
      this.prisma.ride.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { totalPrice: true },
      }),
    ]);

    return {
      rides: {
        total: totalRides,
        active: activeRides,
        completed: completedRides,
        cancelled: cancelledRides,
      },
      deliveries: {
        total: totalDeliveries,
        active: activeDeliveries,
        completed: completedDeliveries,
      },
      drivers: {
        total: totalDrivers,
        online: onlineDrivers,
        offline: totalDrivers - onlineDrivers,
      },
      users: {
        total: totalUsers,
      },
      revenue: {
        total: totalRevenue._sum.totalPrice || 0,
      },
    };
  }
}

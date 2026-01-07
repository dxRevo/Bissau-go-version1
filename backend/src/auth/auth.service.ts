import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async requestOtp(phoneNumber: string) {
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // In production, send OTP via SMS
    // For development, return OTP in response
    return { otp, message: 'OTP sent successfully' };
  }

  async verifyOtp(phoneNumber: string, otp: string) {
    // In production, verify OTP from database/cache
    // For now, accept any 6-digit code for development
    
    // Vérifier d'abord si c'est un driver
    const driver = await this.prisma.driver.findUnique({
      where: { phoneNumber },
    });

    if (driver) {
      // C'est un driver, générer un token avec l'ID du driver
      // Si le rôle n'est pas défini, utiliser 'DRIVER' par défaut
      const driverRole = driver.role || 'DRIVER';
      
      const accessToken = this.jwtService.sign({
        sub: driver.id,
        phoneNumber: driver.phoneNumber,
        role: driverRole,
        userType: 'DRIVER',
      });

      return {
        accessToken,
        driver: {
          id: driver.id,
          phoneNumber: driver.phoneNumber,
          firstName: driver.firstName,
          lastName: driver.lastName,
          role: driverRole,
          isOnline: driver.isOnline,
        },
      };
    }

    // Sinon, c'est un client (User)
    let user = await this.prisma.user.findUnique({
      where: { phoneNumber },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          phoneNumber,
          firstName: phoneNumber,
          lastName: '',
          email: '',
          role: 'CLIENT',
          status: 'ACTIVE',
          avatar: '',
        },
      });
    }

    // Generate tokens
    const accessToken = this.jwtService.sign({
      sub: user.id,
      phoneNumber: user.phoneNumber,
      role: user.role,
      userType: 'USER',
    });

    return {
      accessToken,
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  async driverLogin(phoneNumber: string, password: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { phoneNumber },
    });

    if (!driver) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // In production, use bcrypt to compare passwords
    // For now, simple comparison (password should be hashed in database)
    if (driver.password !== password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (driver.status !== 'ACTIVE') {
      throw new UnauthorizedException('Driver account is not active');
    }

    // Generate tokens
    // Si le rôle n'est pas défini, utiliser 'DRIVER' par défaut
    const driverRole = driver.role || 'DRIVER';
    
    const accessToken = this.jwtService.sign({
      sub: driver.id,
      phoneNumber: driver.phoneNumber,
      role: driverRole,
      userType: 'DRIVER',
    });

    return {
      accessToken,
      driver: {
        id: driver.id,
        phoneNumber: driver.phoneNumber,
        firstName: driver.firstName,
        lastName: driver.lastName,
        role: driverRole,
        isOnline: driver.isOnline,
      },
    };
  }

  async adminLogin(email: string, password: string) {
    console.log(`🔐 Tentative de connexion admin: ${email}`);
    
    const admin = await this.prisma.adminUser.findUnique({
      where: { email },
    });

    if (!admin) {
      console.log(`❌ Admin non trouvé pour l'email: ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    console.log(`✅ Admin trouvé: ${admin.email}, isActive: ${admin.isActive}`);
    console.log(`🔑 Comparaison mot de passe: DB="${admin.password}", Input="${password}"`);

    // In production, use bcrypt to compare passwords
    // For now, simple comparison (password should be hashed in database)
    if (admin.password !== password) {
      console.log(`❌ Mot de passe incorrect`);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!admin.isActive) {
      console.log(`❌ Compte admin non actif`);
      throw new UnauthorizedException('Admin account is not active');
    }

    console.log(`✅ Authentification réussie pour: ${admin.email}`);

    // Generate tokens
    const accessToken = this.jwtService.sign({
      sub: admin.id,
      email: admin.email,
      role: admin.role,
      userType: 'ADMIN',
    });

    return {
      accessToken,
      user: {
        id: admin.id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: admin.role,
      },
    };
  }
}

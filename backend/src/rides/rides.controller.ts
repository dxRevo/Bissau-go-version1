import { Controller, Get, Post, Body, Param, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { RidesService } from './rides.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('rides')
export class RidesController {
  constructor(private readonly ridesService: RidesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createRide(@Body() body: any, @Request() req: any) {
    // Vérifier que l'utilisateur est un client
    // Accepte userType === 'USER' OU role === 'CLIENT' (pour compatibilité avec anciens tokens)
    const isClient = req.user.userType === 'USER' || req.user.role === 'CLIENT';
    if (!isClient) {
      throw new BadRequestException('Only clients can create rides');
    }
    return this.ridesService.createRide(body, req.user.userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getRides(@Request() req: any) {
    return this.ridesService.getRides(req.user.userId);
  }

  @Get('available')
  @UseGuards(JwtAuthGuard)
  async getAvailableRides(@Request() req: any) {
    console.log(`🔍 getAvailableRides called - userId: ${req.user.userId}, userType: ${req.user.userType}, role: ${req.user.role}`);
    // Vérifier que l'utilisateur est un driver
    if (req.user.userType !== 'DRIVER' && req.user.role !== 'DRIVER') {
      console.log(`❌ Access denied - userType: ${req.user.userType}, role: ${req.user.role}`);
      throw new BadRequestException('Only drivers can view available rides');
    }
    console.log(`✅ Driver authenticated, calling getAvailableRides service...`);
    return this.ridesService.getAvailableRides(req.user.userId);
  }

  @Get('active')
  @UseGuards(JwtAuthGuard)
  async getActiveRide(@Request() req: any) {
    // Si c'est un client, utiliser getActiveRideForClient
    if (req.user.userType === 'USER' || req.user.role === 'CLIENT') {
      return this.ridesService.getActiveRideForClient(req.user.userId);
    }
    // Sinon, c'est un driver
    return this.ridesService.getActiveRide(req.user.userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getRideById(@Param('id') id: string, @Request() req: any) {
    return this.ridesService.getRideById(id, req.user.userId);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelRide(@Param('id') id: string, @Request() req: any) {
    return this.ridesService.cancelRide(id, req.user.userId);
  }

  @Post(':id/accept')
  @UseGuards(JwtAuthGuard)
  async acceptRide(@Param('id') id: string, @Request() req: any) {
    return this.ridesService.acceptRide(id, req.user.userId);
  }

  @Post(':id/status')
  @UseGuards(JwtAuthGuard)
  async updateRideStatus(@Param('id') id: string, @Body() body: { status: string }, @Request() req: any) {
    return this.ridesService.updateRideStatus(id, body.status, req.user.userId);
  }

  @Post(':id/rate')
  @UseGuards(JwtAuthGuard)
  async rateRide(@Param('id') id: string, @Body() body: { rating: number; comment?: string }, @Request() req: any) {
    return this.ridesService.rateRide(id, body.rating, body.comment, req.user.userId);
  }
}

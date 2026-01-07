import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { DriversService } from './drivers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('drivers')
@UseGuards(JwtAuthGuard)
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Post('online-status')
  async updateOnlineStatus(@Body() body: { isOnline: boolean; location?: { latitude: number; longitude: number } }, @Request() req: any) {
    return this.driversService.updateOnlineStatus(req.user.userId, body.isOnline, body.location);
  }

  @Get('profile')
  async getProfile(@Request() req: any) {
    return this.driversService.getDriverProfile(req.user.userId);
  }

  @Post('location')
  async updateLocation(@Body() body: { latitude: number; longitude: number }, @Request() req: any) {
    return this.driversService.updateLocation(req.user.userId, body.latitude, body.longitude);
  }
}

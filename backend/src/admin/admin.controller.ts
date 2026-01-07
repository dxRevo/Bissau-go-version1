import { Controller, Get, Post, Put, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('rides')
  async getAllRides() {
    return this.adminService.getAllRides();
  }

  @Get('deliveries')
  async getAllDeliveries() {
    return this.adminService.getAllDeliveries();
  }

  @Get('drivers')
  async getAllDrivers() {
    return this.adminService.getAllDrivers();
  }

  @Get('drivers/:id')
  async getDriverById(@Param('id') id: string) {
    return this.adminService.getDriverById(id);
  }

  @Post('drivers')
  async createDriver(@Body() data: any) {
    return this.adminService.createDriver(data);
  }

  @Put('drivers/:id')
  async updateDriver(@Param('id') id: string, @Body() data: any) {
    return this.adminService.updateDriver(id, data);
  }

  @Patch('drivers/:id/status')
  async updateDriverStatus(@Param('id') id: string, @Body() data: { status: string }) {
    return this.adminService.updateDriverStatus(id, data.status);
  }

  @Get('statistics')
  async getStatistics() {
    return this.adminService.getStatistics();
  }
}

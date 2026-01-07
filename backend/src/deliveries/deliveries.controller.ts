import { Controller, Get, Post, Body, Param, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { DeliveriesService } from './deliveries.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('deliveries')
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createDelivery(@Body() body: any, @Request() req: any) {
    return this.deliveriesService.createDelivery(body, req.user.userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getDeliveries(@Request() req: any) {
    return this.deliveriesService.getDeliveries(req.user.userId);
  }

  @Get('available')
  @UseGuards(JwtAuthGuard)
  async getAvailableDeliveries(@Request() req: any) {
    // Vérifier que l'utilisateur est un delivery person
    if (req.user.userType !== 'DRIVER' || req.user.role !== 'DELIVERY') {
      throw new BadRequestException('Only delivery persons can view available deliveries');
    }
    return this.deliveriesService.getAvailableDeliveries(req.user.userId);
  }

  @Get('active')
  @UseGuards(JwtAuthGuard)
  async getActiveDelivery(@Request() req: any) {
    return this.deliveriesService.getActiveDelivery(req.user.userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getDeliveryById(@Param('id') id: string, @Request() req: any) {
    return this.deliveriesService.getDeliveryById(id, req.user.userId);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelDelivery(@Param('id') id: string, @Request() req: any) {
    return this.deliveriesService.cancelDelivery(id, req.user.userId);
  }

  @Post(':id/accept')
  @UseGuards(JwtAuthGuard)
  async acceptDelivery(@Param('id') id: string, @Request() req: any) {
    return this.deliveriesService.acceptDelivery(id, req.user.userId);
  }

  @Post(':id/status')
  @UseGuards(JwtAuthGuard)
  async updateDeliveryStatus(@Param('id') id: string, @Body() body: { status: string }, @Request() req: any) {
    return this.deliveriesService.updateDeliveryStatus(id, body.status, req.user.userId);
  }
}

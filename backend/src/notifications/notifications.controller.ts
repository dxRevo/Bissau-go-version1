import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('register-token')
  async registerToken(@Body() body: { fcmToken: string }, @Request() req: any) {
    const userType = req.user.userType || (req.user.role === 'CLIENT' ? 'USER' : 'DRIVER');
    return this.notificationsService.registerFcmToken(req.user.userId, body.fcmToken, userType);
  }

  @Post('remove-token')
  async removeToken(@Request() req: any) {
    const userType = req.user.userType || (req.user.role === 'CLIENT' ? 'USER' : 'DRIVER');
    return this.notificationsService.removeFcmToken(req.user.userId, userType);
  }
}








import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('request-otp')
  async requestOtp(@Body() body: { phoneNumber: string }) {
    return this.authService.requestOtp(body.phoneNumber);
  }

  @Post('verify-otp')
  async verifyOtp(@Body() body: { phoneNumber: string; otp: string }) {
    return this.authService.verifyOtp(body.phoneNumber, body.otp);
  }

  @Post('driver/login')
  async driverLogin(@Body() body: { phoneNumber: string; password: string }) {
    return this.authService.driverLogin(body.phoneNumber, body.password);
  }

  @Post('admin/login')
  async adminLogin(@Body() body: { email: string; password: string }) {
    return this.authService.adminLogin(body.email, body.password);
  }
}

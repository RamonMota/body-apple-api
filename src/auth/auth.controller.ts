import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { AuthenticatedUser } from './authenticated-user.type';
import { CurrentUser } from './current-user.decorator';

@Controller('auth')
export class AuthController {
  @Get('test')
  @UseGuards(AuthGuard)
  testAuthentication(@CurrentUser() user: AuthenticatedUser) {
    return {
      authenticated: true,
      user,
    } as const;
  }
}

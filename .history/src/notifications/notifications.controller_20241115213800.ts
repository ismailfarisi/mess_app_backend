import {
  Controller,
  Get,
  Post,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  getUserNotifications(@GetUser() user: User) {
    return this.notificationsService.getUserNotifications(user.id);
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  markAsRead(@GetUser() user: User, @Param('id') id: string) {
    return this.notificationsService.markAsRead(user.id, id);
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllAsRead(@GetUser() user: User) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete notification' })
  deleteNotification(@GetUser() user: User, @Param('id') id: string) {
    return this.notificationsService.deleteNotification(user.id, id);
  }
}

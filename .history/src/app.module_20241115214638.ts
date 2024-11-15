import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { VendorsModule } from './vendors/vendors.module';
import { PaymentsModule } from './payments/payments.module';
import { VendorMenuModule } from './vendor-menu/vendor-menu.module';
import { MealSubscriptionModule } from './meal-subscription/meal-subscription.module';
import { TasksModule } from './tasks/tasks.module';
import { RatingsModule } from './ratings/ratings.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ...configService.get('database'),
        autoLoadEntities: true,
      }),
    }),
    EventEmitterModule.forRoot(),
    AuthModule,
    UsersModule,
    VendorsModule,
    PaymentsModule,
    VendorMenuModule,
    MealSubscriptionModule,
    TasksModule,
    RatingsModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

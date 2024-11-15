import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { VendorsModule } from './vendors/vendors.module';
import { NotificationModule } from './notification/notification.module';
import { PaymentsModule } from './payments/payments.module';
import { VendorMenuModule } from './vendor-menu/vendor-menu.module';
import { MealSubscriptionModule } from './meal-subscription/meal-subscription.module';
import { TasksModule } from './tasks/tasks.module';

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
    AuthModule,
    UsersModule,
    VendorsModule,
    NotificationModule,
    PaymentsModule,
    VendorMenuModule,
    MealSubscriptionModule,
    TasksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

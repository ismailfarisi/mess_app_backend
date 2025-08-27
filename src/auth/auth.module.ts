import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { User } from 'src/users/entities/user.entity';
import { Vendor } from 'src/vendors/entities/vendor.entity';
import { Token } from './entities/token.entity';
import { Auth } from './entities/auth.entity';
import { UsersModule } from '../users/users.module';
import { VendorsModule } from '../vendors/vendors.module';
import { LoggerModule } from 'src/logger/logger.module';

@Module({
  imports: [
    PassportModule,
    TypeOrmModule.forFeature([User, Vendor, Token, Auth]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('jwt.secret');
        const expiresIn = configService.get<string>('jwt.expiresIn');
        console.log('JWT Module - Secret:', secret);
        console.log('JWT Module - ExpiresIn:', expiresIn);
        return {
          secret,
          signOptions: { expiresIn },
        };
      },
    }),
    UsersModule,
    forwardRef(() => VendorsModule),
    LoggerModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}

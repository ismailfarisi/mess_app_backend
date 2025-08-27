import {
  Injectable,
  UnauthorizedException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { VendorsService } from '../../vendors/vendors.service';
import { LoggerService } from 'src/logger/logger.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => VendorsService))
    private readonly vendorsService: VendorsService,
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
  ) {
    const secret = configService.get<string>('jwt.secret');
    console.log('JWT Strategy - Secret:', secret);
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret,
    });
  }

  async validate(payload: {
    userId?: string;
    authId: string;
    entityId: string;
    entityType: string;
    email: string;
    role: string;
  }) {
    try {
      const { entityType, entityId } = payload;
      this.logger.debug('JWTStrategy validate called with payload:');
      this.logger.debug(JSON.stringify(payload));

      if (!entityType || !entityId) {
        throw new UnauthorizedException('Invalid token payload');
      }

      if (entityType === 'user') {
        // For JWT validation, we don't need relations loaded
        const user = await this.usersService.findOne(entityId);
        if (!user) {
          throw new UnauthorizedException('User not found');
        }
        return { ...user, entityType: 'user', authId: payload.authId };
      } else if (entityType === 'vendor') {
        const vendor = await this.vendorsService.findOne(entityId);
        if (!vendor) {
          throw new UnauthorizedException('Vendor not found');
        }
        return { ...vendor, entityType: 'vendor', authId: payload.authId };
      } else {
        throw new UnauthorizedException('Invalid entity type');
      }
    } catch (error) {
      this.logger.error('JWT validation error:', error.message);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Token validation failed');
    }
  }
}

import {
  Injectable,
  UnauthorizedException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../../users/users.service';
import { VendorsService } from '../../vendors/vendors.service';
import { LoggerService } from 'src/logger/logger.service';
import { Token } from '../entities/token.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => VendorsService))
    private readonly vendorsService: VendorsService,
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
    @InjectRepository(Token)
    private readonly tokenRepository: Repository<Token>,
  ) {
    const secret = configService.get<string>('jwt.secret');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret,
      passReqToCallback: true,
    });
  }

  async validate(
    req: any,
    payload: {
      userId?: string;
      authId: string;
      entityId: string;
      entityType: string;
      email: string;
      role: string;
    },
  ) {
    try {
      const { entityType, entityId } = payload;
      this.logger.debug('JWTStrategy validate called with payload:');
      this.logger.debug(JSON.stringify(payload));

      if (!entityType || !entityId) {
        throw new UnauthorizedException('Invalid token payload');
      }

      // Check if the token has been revoked (logout)
      const rawToken = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
      if (rawToken) {
        const storedToken = await this.tokenRepository.findOne({
          where: { token: rawToken },
        });
        if (!storedToken) {
          throw new UnauthorizedException('Token has been revoked');
        }
        // Check if token has expired in DB
        if (storedToken.expiresAt && new Date() > storedToken.expiresAt) {
          throw new UnauthorizedException('Token has expired');
        }
      }

      if (entityType === 'user') {
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

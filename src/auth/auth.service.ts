import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Token } from './entities/token.entity';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectRepository(Token)
    private readonly tokenRepository: Repository<Token>,
  ) {}

  async register(registerDto: RegisterDto) {
    // Check for existing email
    const existingUserByEmail = await this.usersService.findByEmail(registerDto.email);
    if (existingUserByEmail) {
      throw new ConflictException('Email is already registered. Please use a different email or try logging in.');
    }

    // Check for existing phone number
    const existingUserByPhone = await this.usersService.findByPhone(registerDto.phone);
    if (existingUserByPhone) {
      throw new ConflictException('Phone number is already registered. Please use a different phone number or try logging in.');
    }

    try {
      const hashedPassword = await bcrypt.hash(registerDto.password, 10);
      const user = await this.usersService.create({
        ...registerDto,
        password: hashedPassword,
      });

      const token = this.generateToken(user);
      await this.saveToken(token, user.id);

      return { user, token };
    } catch (error) {
      // Handle database constraint violations
      if (error instanceof QueryFailedError) {
        const pgError = error as any;
        if (pgError.code === '23505') { // PostgreSQL unique violation
          if (pgError.constraint?.includes('email')) {
            throw new ConflictException('Email is already registered. Please use a different email or try logging in.');
          }
          if (pgError.constraint?.includes('phone')) {
            throw new ConflictException('Phone number is already registered. Please use a different phone number or try logging in.');
          }
          // Generic unique constraint violation
          throw new ConflictException('This information is already registered. Please check your email and phone number.');
        }
      }
      // Re-throw other errors
      throw error;
    }
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.generateToken(user);
    await this.saveToken(token, user.id);

    return { user, token };
  }

  async logout(userId: string) {
    await this.tokenRepository.delete({ user: { id: userId } });
    return { message: 'Logged out successfully' };
  }

  async getLoggedInUser(userId: string): Promise<User> {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  async validateToken(token: string): Promise<User> {
    try {
      const payload = this.jwtService.verify(token);
      return await this.getLoggedInUser(payload.sub);
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private generateToken(user: any) {
    const payload = { email: user.email, sub: user.id };
    return this.jwtService.sign(payload);
  }

  private async saveToken(token: string, userId: string) {
    const tokenEntity = this.tokenRepository.create({
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      user: { id: userId },
    });
    await this.tokenRepository.save(tokenEntity);
  }
}

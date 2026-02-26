import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Token } from './entities/token.entity';
import { Auth } from './entities/auth.entity';
import { User } from 'src/users/entities/user.entity';
import { Vendor } from 'src/vendors/entities/vendor.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(Auth)
    private readonly authRepository: Repository<Auth>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
    @InjectRepository(Token)
    private readonly tokenRepository: Repository<Token>,
    private readonly dataSource: DataSource,
  ) { }

  async register(registerDto: RegisterDto) {
    const { email, phone, password, ...userData } = registerDto;

    // Check if auth record already exists
    const existingAuth = await this.findByEmailOrPhone(email, phone);
    if (existingAuth) {
      throw new ConflictException(
        'User with this email or phone already exists',
      );
    }

    // Use a transaction to prevent orphaned records on partial failure
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create the user entity first (always create a User for authentication)
      const user = queryRunner.manager.create(User, {
        name: userData.name,
        ...userData,
      });
      const savedUser = await queryRunner.manager.save(user);

      // Determine entity type and create vendor if needed
      let entityType: string;
      let entityRecord: User | Vendor;
      const role = (userData as any).role;

      if (role === 'vendor') {
        entityType = 'vendor';
        // Create vendor entity that references the user
        const vendor = queryRunner.manager.create(Vendor, {
          userId: savedUser.id,
          businessName: (userData as any).businessName || '',
          address: (userData as any).address || '',
          location: (userData as any).location,
          serviceRadius: (userData as any).serviceRadius || 5,
          ...userData,
        });
        entityRecord = await queryRunner.manager.save(vendor);
      } else {
        entityType = 'user';
        entityRecord = savedUser;
      }

      // Create auth record with polymorphic relationship
      const auth = queryRunner.manager.create(Auth, {
        email,
        phone,
        password: hashedPassword,
        entityType,
        entityId: entityRecord.id,
        isVerified: false,
        isLocked: false,
        failedLoginAttempts: 0,
      });

      const savedAuth = await queryRunner.manager.save(auth);

      // Set and save the auth relationship for users and vendors
      if (role === 'vendor') {
        const savedVendor = entityRecord as Vendor;
        savedVendor.auth = savedAuth;
        await queryRunner.manager.save(savedVendor);
      }

      // Always set auth relationship for the user entity
      savedUser.auth = savedAuth;
      await queryRunner.manager.save(savedUser);

      // Generate JWT token
      const payload = {
        authId: savedAuth.id,
        userId: savedUser.id, // For backward compatibility
        entityId: entityRecord.id,
        entityType,
        email: savedAuth.email,
        role: role || 'user',
      };
      const token = this.jwtService.sign(payload);

      // Save token to database
      const tokenEntity = queryRunner.manager.create(Token, {
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        auth: { id: savedAuth.id },
      });
      await queryRunner.manager.save(tokenEntity);

      await queryRunner.commitTransaction();

      // Return in the expected format for backward compatibility
      const userResponse = {
        id: savedUser.id,
        name: savedUser.name,
        email: savedAuth.email,
        phone: savedAuth.phone,
        ...userData,
      };

      return { user: userResponse, token };
    } catch (error) {
      await queryRunner.rollbackTransaction();

      // Handle database constraint violations
      if (error instanceof QueryFailedError) {
        const pgError = error as any;
        if (pgError.code === '23505') {
          // PostgreSQL unique violation
          if (pgError.constraint?.includes('email')) {
            throw new ConflictException(
              'Email is already registered. Please use a different email or try logging in.',
            );
          }
          if (pgError.constraint?.includes('phone')) {
            throw new ConflictException(
              'Phone number is already registered. Please use a different phone number or try logging in.',
            );
          }
          // Generic unique constraint violation
          throw new ConflictException(
            'This information is already registered. Please check your email and phone number.',
          );
        }
      }
      // Re-throw other errors
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    // For phone login, email field can contain phone number
    const loginIdentifier = email;

    if (!loginIdentifier) {
      throw new BadRequestException('Email or phone is required');
    }

    // Determine if loginIdentifier is email or phone based on format
    const isEmail = loginIdentifier.includes('@');
    const auth = isEmail
      ? await this.findByEmailOrPhone(loginIdentifier, null)
      : await this.findByEmailOrPhone(null, loginIdentifier);
    if (!auth) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is locked
    if (auth.isAccountLocked()) {
      throw new UnauthorizedException(
        'Account is temporarily locked due to multiple failed login attempts',
      );
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, auth.password);
    if (!isPasswordValid) {
      // Increment failed login attempts
      auth.incrementFailedAttempts();
      await this.authRepository.save(auth);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Record successful login
    auth.recordSuccessfulLogin();
    await this.authRepository.save(auth);

    // Load the associated entity (User or Vendor)
    let entityRecord: User | Vendor;
    let userRecord: User;
    let role: string;

    if (auth.entityType === 'vendor') {
      entityRecord = await this.vendorRepository.findOne({
        where: { id: auth.entityId },
        relations: ['user'],
      });
      userRecord = (entityRecord as Vendor).user;
      role = 'vendor';
    } else {
      entityRecord = await this.userRepository.findOne({
        where: { id: auth.entityId },
      });
      userRecord = entityRecord as User;
      role = 'user';
    }

    if (!entityRecord || !userRecord) {
      throw new UnauthorizedException('Associated account not found');
    }

    // Generate JWT token
    const payload = {
      authId: auth.id,
      userId: userRecord.id, // For backward compatibility
      entityId: entityRecord.id,
      entityType: auth.entityType,
      email: auth.email,
      role,
    };
    const token = this.jwtService.sign(payload);

    // Save token to database
    await this.saveToken(token, auth.id);

    // Return in the expected format for backward compatibility
    const userResponse = {
      id: userRecord.id,
      name: userRecord.name,
      email: auth.email,
      phone: auth.phone,
    };

    return { user: userResponse, token };
  }

  async logout(authId: string) {
    await this.tokenRepository.delete({ auth: { id: authId } });
    return { message: 'Logged out successfully' };
  }

  async getLoggedInUser(authId: string): Promise<any> {
    const auth = await this.authRepository.findOne({ where: { id: authId } });
    if (!auth) {
      throw new UnauthorizedException('Auth record not found');
    }

    let entityRecord: User | Vendor;
    let userRecord: User;

    if (auth.entityType === 'vendor') {
      entityRecord = await this.vendorRepository.findOne({
        where: { id: auth.entityId },
        relations: ['user'],
      });
      userRecord = (entityRecord as Vendor).user;
    } else {
      entityRecord = await this.userRepository.findOne({
        where: { id: auth.entityId },
      });
      userRecord = entityRecord as User;
    }

    if (!entityRecord || !userRecord) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: userRecord.id,
      authId: auth.id,
      name: userRecord.name,
      email: auth.email,
      phone: auth.phone,
      entityType: auth.entityType,
    };
  }

  async validateToken(token: string): Promise<any> {
    try {
      const payload = this.jwtService.verify(token);
      // Handle both old and new payload formats for backward compatibility
      const authId = payload.authId || payload.sub;
      return await this.getLoggedInUser(authId);
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  // Auth repository methods
  async findByEmailOrPhone(
    email?: string,
    phone?: string,
  ): Promise<Auth | null> {
    if (!email && !phone) {
      return null;
    }

    const query = this.authRepository.createQueryBuilder('auth');

    if (email && phone) {
      query.where('auth.email = :email OR auth.phone = :phone', {
        email,
        phone,
      });
    } else if (email) {
      query.where('auth.email = :email', { email });
    } else if (phone) {
      query.where('auth.phone = :phone', { phone });
    }

    return query.getOne();
  }

  async createAuthWithEntity(
    authData: Partial<Auth>,
    entityType: string,
    entityData: any,
  ): Promise<{ auth: Auth; entity: User | Vendor }> {
    // Create the user entity first
    const user = this.userRepository.create({
      name: entityData.name,
      ...entityData.userData,
    });
    const savedUser = await this.userRepository.save(user);

    let entityRecord: User | Vendor;

    if (entityType === 'vendor') {
      const userEntity = Array.isArray(savedUser) ? savedUser[0] : savedUser;
      const vendor = this.vendorRepository.create({
        userId: userEntity.id,
        businessName: entityData.businessName || '',
        address: entityData.address || '',
        ...entityData.vendorData,
      });
      const savedVendor = await this.vendorRepository.save(vendor);
      entityRecord = Array.isArray(savedVendor) ? savedVendor[0] : savedVendor;
    } else {
      entityRecord = Array.isArray(savedUser) ? savedUser[0] : savedUser;
    }

    // Create auth record with polymorphic relationship
    const auth = this.authRepository.create({
      ...authData,
      entityType,
      entityId: entityRecord.id,
    });

    const savedAuth = await this.authRepository.save(auth);

    return { auth: savedAuth, entity: entityRecord };
  }

  async lockAccount(authId: string, lockDurationMinutes = 30): Promise<void> {
    const auth = await this.authRepository.findOne({ where: { id: authId } });
    if (auth) {
      auth.isLocked = true;
      auth.lockedUntil = new Date(Date.now() + lockDurationMinutes * 60 * 1000);
      await this.authRepository.save(auth);
    }
  }

  async unlockAccount(authId: string): Promise<void> {
    const auth = await this.authRepository.findOne({ where: { id: authId } });
    if (auth) {
      auth.resetFailedAttempts();
      await this.authRepository.save(auth);
    }
  }

  async verifyEmail(authId: string): Promise<void> {
    const auth = await this.authRepository.findOne({ where: { id: authId } });
    if (auth) {
      auth.markEmailVerified();
      await this.authRepository.save(auth);
    }
  }

  async verifyPhone(authId: string): Promise<void> {
    const auth = await this.authRepository.findOne({ where: { id: authId } });
    if (auth) {
      auth.markPhoneVerified();
      await this.authRepository.save(auth);
    }
  }

  private async saveToken(token: string, authId: string) {
    const tokenEntity = this.tokenRepository.create({
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      auth: { id: authId },
    });
    await this.tokenRepository.save(tokenEntity);
  }
}

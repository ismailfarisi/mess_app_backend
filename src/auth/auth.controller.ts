// auth.controller.ts
import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GetUser } from './decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiHeader,
  ApiUnauthorizedResponse,
  ApiCreatedResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { LoggerService } from 'src/logger/logger.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly logger: LoggerService,
  ) {}

  @Post('register')
  @ApiOperation({
    summary: 'Register a new user or vendor',
    description: `
      Create a new user account and return a JWT token for immediate authentication.
      
      **Token Usage Instructions:**
      1. Copy the \`token\` value from the response (without quotes)
      2. Click the **🔒 Authorize** button at the top of this page
      3. Paste the token in the "Value" field
      4. Click "Authorize" to access protected endpoints
      
      **Account Types:**
      - Set \`role: "user"\` for regular users
      - Set \`role: "vendor"\` for restaurant/food vendors
    `,
  })
  @ApiBody({
    type: RegisterDto,
    examples: {
      userRegistration: {
        summary: 'User Registration',
        description: 'Register as a regular user',
        value: {
          email: 'user@example.com',
          password: 'securePassword123',
          name: 'John Doe',
          phone: '+1234567890',
          role: 'user',
        },
      },
      vendorRegistration: {
        summary: 'Vendor Registration',
        description: 'Register as a food vendor/restaurant',
        value: {
          email: 'vendor@restaurant.com',
          password: 'securePassword123',
          name: 'Restaurant Owner',
          phone: '+1234567890',
          role: 'vendor',
          businessName: 'Delicious Meals Co.',
          address: '123 Food Street, Culinary City',
          serviceRadius: 10,
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'User/Vendor successfully registered',
    example: {
      user: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'John Doe',
        email: 'user@example.com',
        phone: '+1234567890',
      },
      token:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdXRoSWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJ1c2VySWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJlbnRpdHlJZCI6IjU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMCIsImVudGl0eVR5cGUiOiJ1c2VyIiwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3MDkxMDAwMDAsImV4cCI6MTcwOTE4NjQwMH0.example-signature-here',
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed',
    example: {
      statusCode: 400,
      message: [
        'email must be a valid email address',
        'password must be longer than 6 characters',
      ],
      error: 'Bad Request',
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Email or phone already exists',
    example: {
      statusCode: 409,
      message: 'User with this email or phone already exists',
      error: 'Conflict',
    },
  })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({
    summary: 'Login user or vendor',
    description: `
      Authenticate with email/phone and password to receive a JWT token.
      
      **Token Usage Instructions:**
      1. Copy the \`token\` value from the response (without quotes)
      2. Click the **🔒 Authorize** button at the top of this page
      3. Paste the token in the "Value" field
      4. Click "Authorize" to access protected endpoints
      
      **Login Options:**
      - Use email address or phone number in the \`email\` field
      - Both users and vendors use the same login endpoint
      
      **Token Expiration:** 24 hours
    `,
  })
  @ApiBody({
    type: LoginDto,
    examples: {
      emailLogin: {
        summary: 'Email Login',
        description: 'Login using email address',
        value: {
          email: 'testuser2@example.com',
          password: 'testpassword123',
        },
      },
      phoneLogin: {
        summary: 'Phone Login',
        description: 'Login using phone number',
        value: {
          email: '+1234567890', // phone number in email field
          password: 'securePassword123',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'User successfully logged in',
    example: {
      user: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'John Doe',
        email: 'user@example.com',
        phone: '+1234567890',
      },
      token:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdXRoSWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJ1c2VySWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJlbnRpdHlJZCI6IjU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMCIsImVudGl0eVR5cGUiOiJ1c2VyIiwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3MDkxMDAwMDAsImV4cCI6MTcwOTE4NjQwMH0.example-signature-here',
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials or account locked',
    example: {
      statusCode: 401,
      message: 'Invalid credentials',
      error: 'Unauthorized',
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed',
    example: {
      statusCode: 400,
      message: ['email is required', 'password is required'],
      error: 'Bad Request',
    },
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get authenticated user details',
    description: `
      Returns detailed information about the currently authenticated user.
      
      **Authentication Required:** This endpoint requires a valid JWT token.
      Make sure you've used the 🔒 Authorize button above.
      
      **Returns:** Complete user profile with authentication details
    `,
  })
  @ApiOkResponse({
    description: 'User profile retrieved successfully',
    example: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      authId: '123e4567-e89b-12d3-a456-426614174000',
      name: 'John Doe',
      email: 'user@example.com',
      phone: '+1234567890',
      entityType: 'user',
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required - Invalid or missing token',
    example: {
      statusCode: 401,
      message: 'Auth ID not found in token',
      error: 'Unauthorized',
    },
  })
  async getLoggedInUser(@Request() req) {
    // Extract authId from the user object attached by JWT strategy
    const authId = req.user?.authId;
    if (!authId) {
      throw new UnauthorizedException('Auth ID not found in token');
    }
    return this.authService.getLoggedInUser(authId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get user profile (legacy)',
    description: `
      Returns the user profile information (legacy endpoint).
      
      **⚠️ Deprecated:** Use \`GET /auth/me\` instead for complete user details.
      
      **Authentication Required:** Valid JWT token required.
    `,
  })
  @ApiOkResponse({
    description: 'User profile retrieved successfully',
    type: User,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    example: {
      statusCode: 401,
      message: 'Unauthorized',
      error: 'Unauthorized',
    },
  })
  getProfile(@GetUser() user: User) {
    return user;
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Logout and invalidate token',
    description: `
      Invalidate the current user session by removing the JWT token from the database.
      
      **Effect:** The current token will no longer be valid for authentication.
      
      **Authentication Required:** Valid JWT token required.
    `,
  })
  @ApiOkResponse({
    description: 'User successfully logged out',
    example: {
      message: 'Logged out successfully',
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    example: {
      statusCode: 401,
      message: 'Unauthorized',
      error: 'Unauthorized',
    },
  })
  async logout(@Request() req) {
    const authId = req.user?.authId;
    if (!authId) {
      throw new UnauthorizedException('Auth ID not found in token');
    }
    return this.authService.logout(authId);
  }

  @Get('validate')
  @ApiOperation({
    summary: 'Validate JWT token manually',
    description: `
      Validates a JWT token manually and returns user information if valid.
      
      **Usage:** This endpoint is for manual token validation.
      For normal authentication, use the 🔒 Authorize button instead.
      
      **Header Format:** \`Authorization: Bearer <your-jwt-token>\`
    `,
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'JWT token with Bearer prefix',
    required: true,
    schema: {
      type: 'string',
      example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    },
  })
  @ApiOkResponse({
    description: 'Token is valid',
    example: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      authId: '123e4567-e89b-12d3-a456-426614174000',
      name: 'John Doe',
      email: 'user@example.com',
      phone: '+1234567890',
      entityType: 'user',
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid token or token format',
    examples: {
      invalidFormat: {
        summary: 'Invalid token format',
        value: {
          statusCode: 401,
          message: 'Invalid token format',
          error: 'Unauthorized',
        },
      },
      invalidToken: {
        summary: 'Invalid or expired token',
        value: {
          statusCode: 401,
          message: 'Invalid token',
          error: 'Unauthorized',
        },
      },
    },
  })
  async validateToken(@Request() req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token format');
    }
    const token = authHeader.split(' ')[1];
    return this.authService.validateToken(token);
  }
}

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

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Register a new user',
    description: 'Create a new user account and return JWT token',
  })
  @ApiBody({ type: RegisterDto })
  @ApiCreatedResponse({
    description: 'User successfully registered',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
          },
        },
        token: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({
    summary: 'User login',
    description: 'Authenticate user and return JWT token',
  })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({
    description: 'User successfully logged in',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
          },
        },
        token: { type: 'string' },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Returns the profile of the currently authenticated user',
  })
  @ApiOkResponse({
    description: 'User profile retrieved successfully',
    type: User,
  })
  @ApiUnauthorizedResponse({ description: 'User not authenticated' })
  async getLoggedInUser(@GetUser() user: User) {
    return this.authService.getLoggedInUser(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get user profile',
    description: 'Returns the user profile information',
  })
  @ApiOkResponse({
    description: 'User profile retrieved successfully',
    type: User,
  })
  @ApiUnauthorizedResponse({ description: 'User not authenticated' })
  getProfile(@GetUser() user: User) {
    return user;
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Logout user',
    description: 'Invalidate the current user session',
  })
  @ApiOkResponse({
    description: 'User successfully logged out',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Logged out successfully' },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'User not authenticated' })
  async logout(@GetUser() user: User) {
    return this.authService.logout(user.id);
  }

  @Get('validate')
  @ApiOperation({
    summary: 'Validate JWT token',
    description:
      'Validates the provided JWT token and returns user information if valid',
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
    type: User,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid token or token format',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Invalid token format' },
        error: { type: 'string', example: 'Unauthorized' },
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

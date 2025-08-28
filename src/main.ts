import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { LoggerService } from './logger/logger.service';
import { LoggerInterceptor } from './logger/logger.interceptor';
import { corsConfig } from './app.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const environment = process.env.NODE_ENV || 'development';
  app.enableCors(corsConfig[environment]);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that don't have decorators
      transform: true, // Transform payloads to DTO instances
      forbidNonWhitelisted: true, // Throw errors if non-whitelisted values are provided
      transformOptions: {
        enableImplicitConversion: true, // Automatically transform payload types
      },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Mess App Backend API')
    .setDescription(
      `
      Comprehensive backend API for a mess management application providing services for user authentication, vendor management, meal subscriptions, payments, ratings, notifications, and more.
      
      ## 🔐 Authentication Guide
      
      This API uses JWT (JSON Web Tokens) for secure authentication. Follow these steps to access protected endpoints:
      
      ### 1. Get Your JWT Token
      - **Register**: Use \`POST /auth/register\` to create a new account
      - **Login**: Use \`POST /auth/login\` with your credentials
      
      ### 2. Copy the Token
      After successful registration/login, copy the \`token\` value from the response:
      \`\`\`json
      {
        "user": { ... },
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
      }
      \`\`\`
      
      ### 3. Authorize in Swagger
      - Click the **🔒 Authorize** button at the top of this page
      - Paste your token in the "Value" field (without "Bearer " prefix)
      - Click "Authorize" to enable access to protected endpoints
      
      ### 4. Test Protected Endpoints
      Once authorized, you can access any endpoint marked with 🔒
      
      ## 🔑 Token Information
      - **Expiration**: Tokens expire after 24 hours for security
      - **Format**: JWT with user/vendor information and permissions
      - **Usage**: Include in Authorization header as "Bearer <token>"
      
      ## 🛡️ Security Best Practices
      - Never share your JWT token with others
      - Use HTTPS in production environments
      - Tokens are automatically invalidated on logout
      - Account lockout protection after failed login attempts
    `,
    )
    .setVersion('1.0')
    .setContact(
      'API Support',
      'https://github.com/your-org/mess-app-backend',
      'support@messapp.com',
    )
    .addTag(
      'Authentication',
      '🔐 User authentication, registration, and token management',
    )
    .addTag('users', '👥 User profile management and addresses')
    .addTag(
      'vendors',
      '🏪 Vendor registration, profiles, and business management',
    )
    .addTag(
      'vendor-menu',
      '📋 Menu management, daily specials, and availability',
    )
    .addTag('meal-subscription', '🍽️ Meal subscription plans and management')
    .addTag('notifications', '🔔 Push notifications and communication')
    .addTag('payments', '💳 Payment processing, history, and billing')
    .addTag('ratings', '⭐ Vendor ratings, reviews, and feedback')
    .addTag('roles', '👤 User roles, permissions, and access control')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token (without Bearer prefix)',
        in: 'header',
      },
      'JWT-auth', // This is the security scheme name
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Add custom examples for better documentation
  document.components.examples = {
    LoginRequest: {
      summary: 'User login request',
      description: 'Example credentials for user authentication',
      value: {
        email: 'user@example.com',
        password: 'securePassword123',
      },
    },
    RegisterRequest: {
      summary: 'User registration request',
      description: 'Example user registration data',
      value: {
        email: 'newuser@example.com',
        password: 'securePassword123',
        name: 'John Doe',
        phone: '+1234567890',
        role: 'user',
      },
    },
    VendorRegisterRequest: {
      summary: 'Vendor registration request',
      description: 'Example vendor registration data',
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
    AuthSuccessResponse: {
      summary: 'Successful authentication',
      description:
        'Response after successful login/registration with JWT token',
      value: {
        user: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'John Doe',
          email: 'user@example.com',
          phone: '+1234567890',
        },
        token:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdXRoSWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJ1c2VySWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJlbnRpdHlJZCI6IjU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMCIsImVudGl0eVR5cGUiOiJ1c2VyIiwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3MDkxMDAwMDAsImV4cCI6MTcwOTE4NjQwMH0.example-signature-here',
      },
    },
    AuthErrorResponse: {
      summary: 'Authentication failed',
      description: 'Response when credentials are invalid',
      value: {
        statusCode: 401,
        message: 'Invalid credentials',
        error: 'Unauthorized',
      },
    },
    ValidationErrorResponse: {
      summary: 'Validation error',
      description: 'Response when request data is invalid',
      value: {
        statusCode: 400,
        message: [
          'email must be a valid email address',
          'password must be longer than 6 characters',
        ],
        error: 'Bad Request',
      },
    },
    ConflictErrorResponse: {
      summary: 'Resource conflict',
      description: 'Response when email/phone already exists',
      value: {
        statusCode: 409,
        message: 'User with this email or phone already exists',
        error: 'Conflict',
      },
    },
  };

  // Setup Swagger UI with enhanced configuration
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // Keep authorization after page refresh
      displayRequestDuration: true, // Show request duration
      filter: true, // Enable search filter
      showExtensions: true,
      showCommonExtensions: true,
      docExpansion: 'list', // Default expansion level
      defaultModelsExpandDepth: 2,
      defaultModelExpandDepth: 2,
      tagsSorter: 'alpha', // Sort tags alphabetically
      operationsSorter: 'alpha', // Sort operations alphabetically
    },
    customSiteTitle: 'Mess App API Documentation',
    customfavIcon: '/favicon.ico',
  });

  const logger = app.get(LoggerService);
  app.useGlobalInterceptors(new LoggerInterceptor(logger));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Query,
  Param,
  Patch,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { VendorsService } from './vendors.service';
import { VendorRegisterDto } from './dto/vendor-register.dto';
import { VendorLoginDto } from './dto/vendor-login.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QueryVendorDto } from './dto/query-vendor.dto';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { VendorDashboardStatsDto } from './dto/vendor-dashboard-stats.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import {
  QueryVendorSubscriptionsDto,
  VendorSubscriptionListResponseDto,
  VendorCapacityDto,
} from './dto/vendor-subscription-list.dto';
import {
  VendorAnalyticsQueryDto,
  VendorRevenueAnalyticsDto,
  VendorOrderAnalyticsDto,
  CustomerAnalyticsDto,
  PerformanceMetricsDto,
} from './dto/vendor-analytics.dto';
import { PhotoType, PhotoUploadResponseDto } from './dto/upload-photo.dto';
import { GetUser } from '../auth/decorators/get-user.decorator';

@ApiTags('vendors')
@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) { }

  @Post('register')
  register(@Body() vendorRegisterDto: VendorRegisterDto) {
    return this.vendorsService.register(vendorRegisterDto);
  }

  @Post('login')
  login(@Body() loginDto: VendorLoginDto) {
    return this.vendorsService.login(loginDto);
  }

  @Get('recommended')
  @ApiOperation({
    summary: 'Get recommended vendors',
    description:
      'Returns a list of recommended vendors based on location and filters',
  })
  @ApiQuery({
    name: 'latitude',
    type: Number,
    required: true,
    description: 'Customer latitude coordinate',
  })
  @ApiQuery({
    name: 'longitude',
    type: Number,
    required: true,
    description: 'Customer longitude coordinate',
  })
  getRecommendedVendors(@Query() query: QueryVendorDto) {
    return this.vendorsService.findRecommendedVendors(
      query.latitude,
      query.longitude,
      query,
    );
  }

  @Get('search')
  @ApiOperation({
    summary: 'Find vendors by location and optional meal type',
    description:
      'Returns vendors within the specified radius. Optionally filter by meal type.',
  })
  @ApiQuery({
    name: 'latitude',
    type: Number,
    required: true,
    description: 'Customer latitude coordinate',
  })
  @ApiQuery({
    name: 'longitude',
    type: Number,
    required: true,
    description: 'Customer longitude coordinate',
  })
  @ApiQuery({
    name: 'mealType',
    type: String,
    required: false,
    description: 'Type of meal (breakfast, lunch, dinner) - optional',
  })
  @ApiQuery({
    name: 'radius',
    type: Number,
    required: false,
    description: 'Search radius in kilometers (default: 10)',
  })
  async findVendorsByLocationAndMealType(
    @Query('latitude') latitude: number,
    @Query('longitude') longitude: number,
    @Query('mealType') mealType: string,
    @Query() query: QueryVendorDto,
  ) {
    return this.vendorsService.findVendorsByLocationAndMealType(
      latitude,
      longitude,
      mealType,
      query,
    );
  }

  @Get(':vendorId/dashboard/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get vendor dashboard statistics',
    description: 'Returns comprehensive stats for vendor dashboard including orders, revenue, ratings, etc.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard statistics retrieved successfully',
    type: VendorDashboardStatsDto,
  })
  async getDashboardStats(
    @Param('vendorId') vendorId: string,
    @GetUser() user: any,
  ) {
    this.verifyVendorOwnership(vendorId, user);
    return this.vendorsService.getDashboardStats(vendorId);
  }

  @Get(':vendorId/profile')
  @ApiOperation({
    summary: 'Get vendor profile',
    description: 'Returns full vendor profile details',
  })
  async getProfile(@Param('vendorId') vendorId: string) {
    return this.vendorsService.findOne(vendorId);
  }

  @Patch(':vendorId/profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update vendor profile',
    description: 'Update vendor business information, location, hours, etc.',
  })
  async updateProfile(
    @Param('vendorId') vendorId: string,
    @Body() updateVendorDto: UpdateVendorDto,
  ) {
    return this.vendorsService.update(vendorId, updateVendorDto);
  }

  @Patch(':vendorId/availability')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update vendor availability status',
    description: 'Toggle vendor open/closed status and set closure message',
  })
  async updateAvailability(
    @Param('vendorId') vendorId: string,
    @Body() updateStatusDto: UpdateStatusDto,
  ) {
    return this.vendorsService.updateStatus(vendorId, updateStatusDto);
  }

  @Post(':vendorId/photos/upload')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Upload vendor photo (profile or cover)',
    description: 'Upload a profile or cover photo for the vendor',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file (JPG, PNG, JPEG)',
        },
        photoType: {
          type: 'string',
          enum: ['profile', 'cover'],
          description: 'Type of photo to upload',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Photo uploaded successfully',
    type: PhotoUploadResponseDto,
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/vendors',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
      },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
          return cb(
            new BadRequestException('Only image files are allowed'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadPhoto(
    @Param('vendorId') vendorId: string,
    @Query('photoType') photoType: PhotoType,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<PhotoUploadResponseDto> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!photoType || !Object.values(PhotoType).includes(photoType)) {
      throw new BadRequestException(
        'photoType must be either "profile" or "cover"',
      );
    }

    const result = await this.vendorsService.uploadPhoto(
      vendorId,
      file,
      photoType,
    );

    return {
      photoUrl: result.photoUrl,
      photoType: result.photoType as PhotoType,
      message: `${photoType} photo uploaded successfully`,
    };
  }

  @Get(':vendorId/subscriptions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get vendor subscriptions',
    description: 'Get all monthly subscriptions assigned to this vendor with filtering',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscriptions retrieved successfully',
    type: VendorSubscriptionListResponseDto,
  })
  async getSubscriptions(
    @Param('vendorId') vendorId: string,
    @Query() query: QueryVendorSubscriptionsDto,
    @GetUser() user: any,
  ) {
    this.verifyVendorOwnership(vendorId, user);
    return this.vendorsService.getVendorSubscriptions(vendorId, query);
  }

  @Get(':vendorId/subscriptions/capacity')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get vendor capacity information',
    description: 'Get current capacity utilization and available slots',
  })
  @ApiResponse({
    status: 200,
    description: 'Capacity information retrieved successfully',
    type: VendorCapacityDto,
  })
  async getCapacity(
    @Param('vendorId') vendorId: string,
    @GetUser() user: any,
  ) {
    this.verifyVendorOwnership(vendorId, user);
    return this.vendorsService.getVendorCapacity(vendorId);
  }

  @Get(':vendorId/analytics/revenue')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get revenue analytics',
    description: 'Get revenue trends and statistics for the vendor',
  })
  @ApiResponse({
    status: 200,
    description: 'Revenue analytics retrieved successfully',
    type: VendorRevenueAnalyticsDto,
  })
  async getRevenueAnalytics(
    @Param('vendorId') vendorId: string,
    @Query() query: VendorAnalyticsQueryDto,
  ) {
    return this.vendorsService.getRevenueAnalytics(vendorId, query);
  }

  @Get(':vendorId/analytics/orders')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get order analytics',
    description: 'Get order trends, popular meals, and ordering patterns',
  })
  @ApiResponse({
    status: 200,
    description: 'Order analytics retrieved successfully',
    type: VendorOrderAnalyticsDto,
  })
  async getOrderAnalytics(
    @Param('vendorId') vendorId: string,
    @Query() query: VendorAnalyticsQueryDto,
  ) {
    return this.vendorsService.getOrderAnalytics(vendorId, query);
  }

  @Get(':vendorId/analytics/customers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get customer analytics',
    description: 'Get customer statistics including new, returning, and subscription duration',
  })
  @ApiResponse({
    status: 200,
    description: 'Customer analytics retrieved successfully',
    type: CustomerAnalyticsDto,
  })
  async getCustomerAnalytics(
    @Param('vendorId') vendorId: string,
    @Query() query: VendorAnalyticsQueryDto,
  ) {
    return this.vendorsService.getCustomerAnalytics(vendorId, query);
  }

  @Get(':vendorId/analytics/performance')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get performance metrics',
    description: 'Get delivery performance, fulfillment rate, and customer satisfaction',
  })
  @ApiResponse({
    status: 200,
    description: 'Performance metrics retrieved successfully',
    type: PerformanceMetricsDto,
  })
  async getPerformanceMetrics(
    @Param('vendorId') vendorId: string,
    @Query() query: VendorAnalyticsQueryDto,
    @GetUser() user: any,
  ) {
    this.verifyVendorOwnership(vendorId, user);
    return this.vendorsService.getPerformanceMetrics(vendorId, query);
  }

  /**
   * Verify that the authenticated user is the owner of the vendor
   */
  private verifyVendorOwnership(vendorId: string, user: any): void {
    // The user object from JwtStrategy contains entityType and id
    if (user?.entityType === 'vendor' && user?.id === vendorId) {
      return; // Vendor is accessing their own data
    }
    // Allow admins (could be extended with role checks)
    if (user?.entityType === 'vendor' && user?.id !== vendorId) {
      throw new ForbiddenException(
        'You are not authorized to access this vendor\'s data',
      );
    }
    // Non-vendor users cannot access vendor-specific endpoints
    if (user?.entityType !== 'vendor') {
      throw new ForbiddenException(
        'Only vendors can access vendor management endpoints',
      );
    }
  }
}

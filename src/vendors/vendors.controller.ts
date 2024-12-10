import { Controller, Post, Body, Get, UseGuards, Query } from '@nestjs/common';
import { VendorsService } from './vendors.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { VendorLoginDto } from './dto/vendor-login.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QueryVendorDto } from './dto/query-vendor.dto';
import { ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';

@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) { }

  @Post('register')
  register(@Body() createVendorDto: CreateVendorDto) {
    return this.vendorsService.register(createVendorDto);
  }

  @Post('login')
  login(@Body() loginDto: VendorLoginDto) {
    return this.vendorsService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('recommended')
  @ApiBearerAuth()
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
    summary: 'Find vendors by location and meal type',
    description: 'Returns vendors within the specified radius that offer the specified meal type',
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
    required: true,
    description: 'Type of meal (breakfast, lunch, dinner)',
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
    console.log(mealType);
    
    return this.vendorsService.findVendorsByLocationAndMealType(
      latitude,
      longitude,
      mealType,
      query,
    );
  }
}

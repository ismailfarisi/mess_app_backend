import { Controller, Post, Body, Get, UseGuards, Query } from '@nestjs/common';
import { VendorsService } from './vendors.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { VendorLoginDto } from './dto/vendor-login.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QueryVendorDto } from './dto/query-vendor.dto';
import { ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';

@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

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
}

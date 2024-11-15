import { Controller, Post, Body, Get, UseGuards, Query } from '@nestjs/common';
import { VendorsService } from './vendors.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { VendorLoginDto } from './dto/vendor-login.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QueryVendorDto } from './dto/query-vendor.dto';

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
  getRecommendedVendors(
    @Body() query: QueryVendorDto,
    @Query('latitude') latitude: number,
    @Query('longitude') longitude: number,
  ) {
    return this.vendorsService.findRecommendedVendors(
      latitude,
      longitude,
      query,
    );
  }
}

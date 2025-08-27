import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { VendorMenuService } from './vendor-menu.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MealType } from 'src/commons/enums/meal-type.enum';
import { CreateVendorMenuDto } from './dto/create-vendor-menu.dto';
import { UpdateVendorMenuDto } from './dto/update-vendor-menu.dto';
import { QueryVendorMenuDto } from './dto/query-vendor-menu.dto';
import { VendorMenuResponseDto } from './dto/vendor-menu-response.dto';

@ApiTags('vendor-menu')
@Controller('vendor-menu')
@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class VendorMenuController {
  constructor(private readonly vendorMenuService: VendorMenuService) {}

  @Post()
  @ApiOperation({ summary: 'Create new vendor menu' })
  @ApiResponse({ status: 201, description: 'Menu created successfully' })
  create(@Body() createDto: CreateVendorMenuDto) {
    return this.vendorMenuService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all menus with filtering' })
  findAll(@Query() queryDto: QueryVendorMenuDto) {
    return this.vendorMenuService.findAll(queryDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get menu by ID' })
  @ApiResponse({ status: 200, type: VendorMenuResponseDto })
  findOne(@Param('id') id: string) {
    return this.vendorMenuService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update menu' })
  update(@Param('id') id: string, @Body() updateDto: UpdateVendorMenuDto) {
    return this.vendorMenuService.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete menu' })
  remove(@Param('id') id: string) {
    return this.vendorMenuService.remove(id);
  }

  @Get('by-vendor/:vendorId')
  @ApiOperation({ summary: 'Get all menus for specific vendor' })
  @ApiResponse({ status: 200, type: [VendorMenuResponseDto] })
  findByVendor(
    @Param('vendorId') vendorId: string,
    @Query('mealType') mealType?: MealType,
  ) {
    return this.vendorMenuService.findByVendor(vendorId, mealType);
  }

  @Get('available')
  @ApiOperation({ summary: 'Get available menus' })
  @ApiResponse({ status: 200, type: [VendorMenuResponseDto] })
  findAvailable(@Query('mealType') mealType?: MealType) {
    return this.vendorMenuService.findAvailable(mealType);
  }
}

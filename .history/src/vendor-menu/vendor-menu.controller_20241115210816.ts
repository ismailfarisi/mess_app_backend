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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestswaggerjs/';
import { VendorMenuService } from './vendor-menu.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MealType } from 'src/commons/enums/meal-type.enum';
import { CreateVendorMenuDto } from './dto/create-vendor-menu.dto';
import { UpdateVendorMenuDto } from './dto/update-vendor-menu.dto';
import { QueryVendorMenuDto } from './dto/query-vendor-menu.dto';

@ApiTags('vendor-menu')
@Controller('vendor-menu')
@UseGuards(JwtAuthGuard)
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
  findByVendor(@Param('vendorId') vendorId: string) {
    return this.vendorMenuService.findByVendor(vendorId);
  }

  @Get('available')
  @ApiOperation({ summary: 'Get available menus' })
  findAvailable(@Query('mealType') mealType?: MealType) {
    return this.vendorMenuService.findAvailable(mealType);
  }
}

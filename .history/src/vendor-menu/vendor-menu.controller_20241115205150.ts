import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { VendorMenuService } from './vendor-menu.service';
import { CreateVendorMenuDto } from './dto/create-vendor-menu.dto';
import { UpdateVendorMenuDto } from './dto/update-vendor-menu.dto';

@Controller('vendor-menu')
export class VendorMenuController {
  constructor(private readonly vendorMenuService: VendorMenuService) {}

  @Post()
  create(@Body() createVendorMenuDto: CreateVendorMenuDto) {
    return this.vendorMenuService.create(createVendorMenuDto);
  }

  @Get()
  findAll() {
    return this.vendorMenuService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.vendorMenuService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateVendorMenuDto: UpdateVendorMenuDto) {
    return this.vendorMenuService.update(+id, updateVendorMenuDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.vendorMenuService.remove(+id);
  }
}

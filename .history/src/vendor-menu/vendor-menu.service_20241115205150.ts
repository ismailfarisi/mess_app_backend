import { Injectable } from '@nestjs/common';
import { CreateVendorMenuDto } from './dto/create-vendor-menu.dto';
import { UpdateVendorMenuDto } from './dto/update-vendor-menu.dto';

@Injectable()
export class VendorMenuService {
  create(createVendorMenuDto: CreateVendorMenuDto) {
    return 'This action adds a new vendorMenu';
  }

  findAll() {
    return `This action returns all vendorMenu`;
  }

  findOne(id: number) {
    return `This action returns a #${id} vendorMenu`;
  }

  update(id: number, updateVendorMenuDto: UpdateVendorMenuDto) {
    return `This action updates a #${id} vendorMenu`;
  }

  remove(id: number) {
    return `This action removes a #${id} vendorMenu`;
  }
}

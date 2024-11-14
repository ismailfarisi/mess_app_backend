// src/vendors/vendors.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Vendor } from './entities/vendor.entity';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { VendorLoginDto } from './dto/vendor-login.dto';
import { User } from '../users/entities/user.entity';
import { Point } from 'geojson';

@Injectable()
export class VendorsService {
  constructor(
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
    private readonly jwtService: JwtService,
  ) {}

  async register(createVendorDto: CreateVendorDto) {
    const existingVendor = await this.vendorRepository.findOne({
      where: { email: createVendorDto.email },
    });

    if (existingVendor) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(createVendorDto.password, 10);

    const location: Point = {
      type: 'Point',
      coordinates: [createVendorDto.longitude, createVendorDto.latitude],
    };

    const vendor = this.vendorRepository.create({
      ...createVendorDto,
      password: hashedPassword,
      location,
      rating: 0,
    });

    const savedVendor = await this.vendorRepository.save(vendor);
    const token = this.generateToken(savedVendor);

    return { vendor: savedVendor, token };
  }

  async login(loginDto: VendorLoginDto) {
    const vendor = await this.vendorRepository.findOne({
      where: { email: loginDto.email },
    });

    if (
      !vendor ||
      !(await bcrypt.compare(loginDto.password, vendor.password))
    ) {
      throw new NotFoundException('Invalid credentials');
    }

    const token = this.generateToken(vendor);
    return { vendor, token };
  }

  async findRecommendedVendors(
    user: User,
    latitude: number,
    longitude: number,
  ) {
    // Find vendors within 10km radius of user's location, sorted by rating
    return await this.vendorRepository
      .createQueryBuilder('vendor')
      .where(
        'ST_DWithin(vendor.location, ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326), vendor.serviceRadius * 1000)',
      )
      .orderBy('vendor.rating', 'DESC')
      .setParameters({ latitude, longitude })
      .getMany();
  }

  private generateToken(vendor: Vendor) {
    return this.jwtService.sign({
      sub: vendor.id,
      email: vendor.email,
      type: 'vendor',
    });
  }

  // ... other CRUD operations
}

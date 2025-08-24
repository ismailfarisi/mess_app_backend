import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserAddress } from './entities/user-address.entity';
import { CreateUserAddressDto } from './dto/create-user-address.dto';
import { UpdateUserAddressDto } from './dto/update-user-address.dto';
import { UserAddressResponseDto } from './dto/user-address-response.dto';
import { Point } from 'geojson';

@Injectable()
export class UserAddressesService {
  private readonly logger = new Logger(UserAddressesService.name);

  constructor(
    @InjectRepository(UserAddress)
    private readonly userAddressRepository: Repository<UserAddress>,
  ) {}

  async createAddress(
    userId: string,
    createAddressDto: CreateUserAddressDto,
  ): Promise<UserAddress> {
    try {
      // Check if address label already exists for this user
      const existingAddress = await this.userAddressRepository.findOne({
        where: { userId, label: createAddressDto.label, isActive: true },
      });

      if (existingAddress) {
        throw new ConflictException(
          `Address with label '${createAddressDto.label}' already exists for this user`,
        );
      }

      // Handle default address logic
      if (createAddressDto.isDefault) {
        await this.clearDefaultAddress(userId);
      }

      // Create location point (consistent with vendor implementation)
      const location: Point = {
        type: 'Point',
        coordinates: [createAddressDto.longitude, createAddressDto.latitude],
      };

      const address = this.userAddressRepository.create({
        userId,
        ...createAddressDto,
        location,
      });

      const savedAddress = await this.userAddressRepository.save(address);
      this.logger.log(`Created address ${savedAddress.id} for user ${userId}`);
      
      return savedAddress;
    } catch (error) {
      this.logger.error('Error creating address:', error);
      throw error;
    }
  }

  async getUserAddresses(userId: string): Promise<UserAddress[]> {
    try {
      return await this.userAddressRepository.find({
        where: { userId, isActive: true },
        order: { isDefault: 'DESC', createdAt: 'ASC' },
      });
    } catch (error) {
      this.logger.error('Error fetching user addresses:', error);
      throw error;
    }
  }

  async getAddressById(userId: string, addressId: string): Promise<UserAddress> {
    try {
      const address = await this.userAddressRepository.findOne({
        where: { id: addressId, userId, isActive: true },
      });

      if (!address) {
        throw new NotFoundException(
          `Address with ID ${addressId} not found for user ${userId}`,
        );
      }

      return address;
    } catch (error) {
      this.logger.error('Error fetching address by ID:', error);
      throw error;
    }
  }

  async updateAddress(
    userId: string,
    addressId: string,
    updateAddressDto: UpdateUserAddressDto,
  ): Promise<UserAddress> {
    try {
      const address = await this.getAddressById(userId, addressId);

      // Check if new label conflicts with existing labels
      if (updateAddressDto.label && updateAddressDto.label !== address.label) {
        const existingAddress = await this.userAddressRepository.findOne({
          where: { userId, label: updateAddressDto.label, isActive: true },
        });

        if (existingAddress) {
          throw new ConflictException(
            `Address with label '${updateAddressDto.label}' already exists for this user`,
          );
        }
      }

      // Handle default address logic
      if (updateAddressDto.isDefault && !address.isDefault) {
        await this.clearDefaultAddress(userId);
      }

      // Update location if coordinates changed
      if (updateAddressDto.latitude && updateAddressDto.longitude) {
        address.location = {
          type: 'Point',
          coordinates: [updateAddressDto.longitude, updateAddressDto.latitude],
        };
      }

      // Update other fields
      Object.assign(address, updateAddressDto);

      const updatedAddress = await this.userAddressRepository.save(address);
      this.logger.log(`Updated address ${addressId} for user ${userId}`);
      
      return updatedAddress;
    } catch (error) {
      this.logger.error('Error updating address:', error);
      throw error;
    }
  }

  async deleteAddress(userId: string, addressId: string): Promise<void> {
    try {
      const address = await this.getAddressById(userId, addressId);
      
      // Soft delete by marking as inactive
      address.isActive = false;
      await this.userAddressRepository.save(address);
      
      this.logger.log(`Deleted address ${addressId} for user ${userId}`);
    } catch (error) {
      this.logger.error('Error deleting address:', error);
      throw error;
    }
  }

  async setDefaultAddress(userId: string, addressId: string): Promise<UserAddress> {
    try {
      const address = await this.getAddressById(userId, addressId);
      
      // Clear existing default
      await this.clearDefaultAddress(userId);
      
      // Set new default
      address.isDefault = true;
      const updatedAddress = await this.userAddressRepository.save(address);
      
      this.logger.log(`Set address ${addressId} as default for user ${userId}`);
      return updatedAddress;
    } catch (error) {
      this.logger.error('Error setting default address:', error);
      throw error;
    }
  }

  async getDefaultAddress(userId: string): Promise<UserAddress | null> {
    try {
      return await this.userAddressRepository.findOne({
        where: { userId, isDefault: true, isActive: true },
      });
    } catch (error) {
      this.logger.error('Error fetching default address:', error);
      throw error;
    }
  }

  async findNearbyAddresses(
    latitude: number,
    longitude: number,
    radiusKm: number = 10,
  ): Promise<UserAddress[]> {
    try {
      // Consistent with vendor location queries
      const radiusInMeters = radiusKm * 1000;
      
      return await this.userAddressRepository
        .createQueryBuilder('address')
        .leftJoinAndSelect('address.user', 'user')
        .where('address.isActive = :isActive', { isActive: true })
        .andWhere(
          `ST_DWithin(
            address.location::geography,
            ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography,
            :radiusInMeters
          )`,
          { latitude, longitude, radiusInMeters }
        )
        .addSelect(
          `ST_Distance(
            address.location::geography,
            ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography
          )`,
          'distance'
        )
        .orderBy('distance', 'ASC')
        .getMany();
    } catch (error) {
      this.logger.error('Error finding nearby addresses:', error);
      throw error;
    }
  }

  async findByIdAndUser(addressId: string, userId: string): Promise<UserAddress | null> {
    try {
      return await this.userAddressRepository.findOne({
        where: { id: addressId, userId, isActive: true },
      });
    } catch (error) {
      this.logger.error('Error finding address by ID and user:', error);
      throw error;
    }
  }

  private async clearDefaultAddress(userId: string): Promise<void> {
    await this.userAddressRepository.update(
      { userId, isDefault: true },
      { isDefault: false }
    );
  }

  mapToResponseDto(address: UserAddress): UserAddressResponseDto {
    return {
      id: address.id,
      label: address.label,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2,
      city: address.city,
      state: address.state,
      country: address.country,
      postalCode: address.postalCode,
      latitude: Number(address.latitude),
      longitude: Number(address.longitude),
      location: address.location,
      isDefault: address.isDefault,
      isActive: address.isActive,
      createdAt: address.createdAt,
      updatedAt: address.updatedAt,
    };
  }
}
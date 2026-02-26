import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
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
  ) { }

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

  async getAddressById(
    userId: string,
    addressId: string,
  ): Promise<UserAddress> {
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

  async setDefaultAddress(
    userId: string,
    addressId: string,
  ): Promise<UserAddress> {
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
          { latitude, longitude, radiusInMeters },
        )
        .addSelect(
          `ST_Distance(
            address.location::geography,
            ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography
          )`,
          'distance',
        )
        .orderBy('distance', 'ASC')
        .getMany();
    } catch (error) {
      this.logger.error('Error finding nearby addresses:', error);
      throw error;
    }
  }

  async findByIdAndUser(
    addressId: string,
    userId: string,
  ): Promise<UserAddress | null> {
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
      { isDefault: false },
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
  /**
   * Validate address is within service radius for all vendors
   * Used for monthly subscriptions
   * @param addressId - User address ID
   * @param vendorIds - Array of vendor IDs
   * @returns Validation result
   */
  async validateAddressForMultipleVendors(
    addressId: string,
    vendorIds: string[],
  ): Promise<{
    isValid: boolean;
    invalidVendors: string[];
    validationResults: Array<{
      vendorId: string;
      distance: number;
      withinRange: boolean;
      maxDeliveryRadius: number;
    }>;
  }> {
    this.logger.log(`Validating address ${addressId} for ${vendorIds.length} vendors`);

    try {
      // Get user address
      const address = await this.userAddressRepository.findOne({
        where: { id: addressId, isActive: true },
      });

      if (!address) {
        throw new NotFoundException(`Address ${addressId} not found`);
      }

      const validationResults = [];
      const invalidVendors = [];

      // TODO: This would require VendorsService integration
      // For now, provide a simplified implementation
      for (const vendorId of vendorIds) {
        try {
          // Fetch actual vendor data using raw query to avoid circular dependency
          const vendorResult = await this.userAddressRepository.query(
            `SELECT id,
                    ST_X(location::geometry) as longitude,
                    ST_Y(location::geometry) as latitude,
                    "serviceRadius"
             FROM vendors WHERE id = $1`,
            [vendorId],
          );

          if (!vendorResult || vendorResult.length === 0) {
            invalidVendors.push(vendorId);
            validationResults.push({
              vendorId,
              distance: -1,
              withinRange: false,
              maxDeliveryRadius: 0,
            });
            continue;
          }

          const vendorData = vendorResult[0];
          const deliveryRadius = Number(vendorData.serviceRadius) || 10;

          const distance = this.calculateDistance(
            Number(address.latitude),
            Number(address.longitude),
            Number(vendorData.latitude),
            Number(vendorData.longitude),
          );

          const withinRange = distance <= deliveryRadius;

          validationResults.push({
            vendorId,
            distance,
            withinRange,
            maxDeliveryRadius: deliveryRadius,
          });

          if (!withinRange) {
            invalidVendors.push(vendorId);
          }
        } catch (error) {
          this.logger.error(`Error validating vendor ${vendorId}:`, error);
          invalidVendors.push(vendorId);
          validationResults.push({
            vendorId,
            distance: -1,
            withinRange: false,
            maxDeliveryRadius: 0,
          });
        }
      }

      const isValid = invalidVendors.length === 0;

      this.logger.log(
        `Address validation completed. Valid: ${isValid}, Invalid vendors: ${invalidVendors.length}`,
      );

      return {
        isValid,
        invalidVendors,
        validationResults,
      };
    } catch (error) {
      this.logger.error('Error validating address for multiple vendors:', error);
      throw error;
    }
  }

  /**
   * Calculate distance between two points using Haversine formula
   * @param lat1 - First point latitude
   * @param lon1 - First point longitude
   * @param lat2 - Second point latitude
   * @param lon2 - Second point longitude
   * @returns Distance in kilometers
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

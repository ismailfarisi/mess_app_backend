import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UsePipes,
  ValidationPipe,
  ForbiddenException,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { UserAddressesService } from './user-addresses.service';
import { CreateUserAddressDto } from './dto/create-user-address.dto';
import { UpdateUserAddressDto } from './dto/update-user-address.dto';
import { UserAddressResponseDto } from './dto/user-address-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from './entities/user.entity';

@ApiTags('User Addresses')
@Controller('users/:userId/addresses')
@UseGuards(JwtAuthGuard)
export class UserAddressesController {
  constructor(private readonly userAddressesService: UserAddressesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user address' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiBody({ type: CreateUserAddressDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Address created successfully',
    type: UserAddressResponseDto 
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Address label already exists' })
  @UsePipes(ValidationPipe)
  async createAddress(
    @Param('userId') userId: string,
    @Body() createAddressDto: CreateUserAddressDto,
    @GetUser() user: User,
  ): Promise<UserAddressResponseDto> {
    // Users can only create addresses for themselves
    if (user.id !== userId) {
      throw new ForbiddenException('You can only manage your own addresses');
    }

    const address = await this.userAddressesService.createAddress(userId, createAddressDto);
    return this.userAddressesService.mapToResponseDto(address);
  }

  @Get()
  @ApiOperation({ summary: 'Get all addresses for a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Addresses retrieved successfully',
    type: [UserAddressResponseDto] 
  })
  async getUserAddresses(
    @Param('userId') userId: string,
    @GetUser() user: User,
  ): Promise<UserAddressResponseDto[]> {
    // Users can only access their own addresses
    if (user.id !== userId) {
      throw new ForbiddenException('You can only access your own addresses');
    }

    const addresses = await this.userAddressesService.getUserAddresses(userId);
    return addresses.map(address => this.userAddressesService.mapToResponseDto(address));
  }

  @Get('default')
  @ApiOperation({ summary: 'Get default address for a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Default address retrieved successfully',
    type: UserAddressResponseDto 
  })
  @ApiResponse({ status: 404, description: 'No default address found' })
  async getDefaultAddress(
    @Param('userId') userId: string,
    @GetUser() user: User,
  ): Promise<UserAddressResponseDto | null> {
    if (user.id !== userId) {
      throw new ForbiddenException('You can only access your own addresses');
    }

    const address = await this.userAddressesService.getDefaultAddress(userId);
    return address ? this.userAddressesService.mapToResponseDto(address) : null;
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Find addresses near a location' })
  @ApiQuery({ name: 'latitude', type: Number, description: 'Latitude coordinate' })
  @ApiQuery({ name: 'longitude', type: Number, description: 'Longitude coordinate' })
  @ApiQuery({ name: 'radius', type: Number, required: false, description: 'Search radius in kilometers (default: 10)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Nearby addresses found',
    type: [UserAddressResponseDto] 
  })
  async findNearbyAddresses(
    @Query('latitude') latitude: number,
    @Query('longitude') longitude: number,
    @Query('radius') radius?: number,
  ): Promise<UserAddressResponseDto[]> {
    const addresses = await this.userAddressesService.findNearbyAddresses(
      latitude, 
      longitude, 
      radius || 10
    );
    return addresses.map(address => this.userAddressesService.mapToResponseDto(address));
  }

  @Get(':addressId')
  @ApiOperation({ summary: 'Get a specific address' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiParam({ name: 'addressId', description: 'Address ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Address retrieved successfully',
    type: UserAddressResponseDto 
  })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async getAddress(
    @Param('userId') userId: string,
    @Param('addressId') addressId: string,
    @GetUser() user: User,
  ): Promise<UserAddressResponseDto> {
    if (user.id !== userId) {
      throw new ForbiddenException('You can only access your own addresses');
    }

    const address = await this.userAddressesService.getAddressById(userId, addressId);
    return this.userAddressesService.mapToResponseDto(address);
  }

  @Patch(':addressId')
  @ApiOperation({ summary: 'Update an address' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiParam({ name: 'addressId', description: 'Address ID' })
  @ApiBody({ type: UpdateUserAddressDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Address updated successfully',
    type: UserAddressResponseDto 
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  @ApiResponse({ status: 409, description: 'Address label already exists' })
  @UsePipes(ValidationPipe)
  async updateAddress(
    @Param('userId') userId: string,
    @Param('addressId') addressId: string,
    @Body() updateAddressDto: UpdateUserAddressDto,
    @GetUser() user: User,
  ): Promise<UserAddressResponseDto> {
    if (user.id !== userId) {
      throw new ForbiddenException('You can only manage your own addresses');
    }

    const address = await this.userAddressesService.updateAddress(userId, addressId, updateAddressDto);
    return this.userAddressesService.mapToResponseDto(address);
  }

  @Patch(':addressId/set-default')
  @ApiOperation({ summary: 'Set an address as default' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiParam({ name: 'addressId', description: 'Address ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Address set as default successfully',
    type: UserAddressResponseDto 
  })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async setDefaultAddress(
    @Param('userId') userId: string,
    @Param('addressId') addressId: string,
    @GetUser() user: User,
  ): Promise<UserAddressResponseDto> {
    if (user.id !== userId) {
      throw new ForbiddenException('You can only manage your own addresses');
    }

    const address = await this.userAddressesService.setDefaultAddress(userId, addressId);
    return this.userAddressesService.mapToResponseDto(address);
  }

  @Delete(':addressId')
  @ApiOperation({ summary: 'Delete an address' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiParam({ name: 'addressId', description: 'Address ID' })
  @ApiResponse({ status: 200, description: 'Address deleted successfully' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async deleteAddress(
    @Param('userId') userId: string,
    @Param('addressId') addressId: string,
    @GetUser() user: User,
  ): Promise<void> {
    if (user.id !== userId) {
      throw new ForbiddenException('You can only manage your own addresses');
    }

    await this.userAddressesService.deleteAddress(userId, addressId);
  }
}
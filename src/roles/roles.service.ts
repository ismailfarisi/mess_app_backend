import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { UserRole } from './entities/user-role.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { AssignRoleDto } from './dto/assign-role.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
  ) {}

  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    const existingRole = await this.roleRepository.findOne({
      where: { name: createRoleDto.name },
    });

    if (existingRole) {
      throw new ConflictException('Role already exists');
    }

    const role = this.roleRepository.create(createRoleDto);
    return await this.roleRepository.save(role);
  }

  async findAll(): Promise<Role[]> {
    return await this.roleRepository.find();
  }

  async findByName(name: string): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { name: name }
    });

    if (!role) {
      throw new NotFoundException(`Role ${name} not found`);
    }

    return role;
  }

  async findOne(id: string): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ['userRoles', 'userRoles.user'],
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  async assignRole(assignRoleDto: AssignRoleDto): Promise<UserRole> {
    // Check if role assignment already exists
    const existingAssignment = await this.userRoleRepository.findOne({
      where: {
        userId: assignRoleDto.userId,
        roleId: assignRoleDto.roleId,
      },
    });

    if (existingAssignment) {
      if (!existingAssignment.isActive) {
        // Reactivate the role if it was previously deactivated
        existingAssignment.isActive = true;
        return await this.userRoleRepository.save(existingAssignment);
      }
      throw new ConflictException('User already has this role');
    }

    const userRole = this.userRoleRepository.create(assignRoleDto);
    return await this.userRoleRepository.save(userRole);
  }

  async removeRole(userId: string, roleId: string): Promise<void> {
    const userRole = await this.userRoleRepository.findOne({
      where: { userId, roleId },
    });

    if (!userRole) {
      throw new NotFoundException('Role assignment not found');
    }

    // Soft delete by setting isActive to false
    userRole.isActive = false;
    await this.userRoleRepository.save(userRole);
  }

  async getUserRoles(userId: string): Promise<UserRole[]> {
    return await this.userRoleRepository.find({
      where: { userId, isActive: true },
      relations: ['role'],
    });
  }

  async hasRole(userId: string, roleName: string): Promise<boolean> {
    const userRole = await this.userRoleRepository
      .createQueryBuilder('userRole')
      .innerJoinAndSelect('userRole.role', 'role')
      .where('userRole.userId = :userId', { userId })
      .andWhere('role.name = :roleName', { roleName })
      .andWhere('userRole.isActive = :isActive', { isActive: true })
      .getOne();

    return !!userRole;
  }
}
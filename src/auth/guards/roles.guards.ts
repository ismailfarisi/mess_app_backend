import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesService } from '../../roles/roles.service';
import {
  ROLES_KEY,
  REQUIRE_ALL_ROLES_KEY,
} from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rolesService: RolesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get roles from both decorators
    const requiredRoles =
      this.reflector.get<string[]>(ROLES_KEY, context.getHandler()) || [];
    const requiredAllRoles =
      this.reflector.get<string[]>(
        REQUIRE_ALL_ROLES_KEY,
        context.getHandler(),
      ) || [];

    // If no roles are required, allow access
    if (requiredRoles.length === 0 && requiredAllRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    // Get user's roles
    const userRoles = await this.rolesService.getUserRoles(user.id);
    const userRoleNames = userRoles.map((ur) => ur.role.name);

    // Check for any required roles (OR condition)
    const hasRequiredRole =
      requiredRoles.length === 0 ||
      requiredRoles.some((role) => userRoleNames.includes(role));

    // Check for all required roles (AND condition)
    const hasAllRequiredRoles =
      requiredAllRoles.length === 0 ||
      requiredAllRoles.every((role) => userRoleNames.includes(role));

    // User must satisfy both conditions
    return hasRequiredRole && hasAllRequiredRoles;
  }
}

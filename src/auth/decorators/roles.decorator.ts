// src/auth/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const RequireRoles = (...roles: string[]) =>
  SetMetadata(ROLES_KEY, roles);

// Support for requiring all specified roles
export const REQUIRE_ALL_ROLES_KEY = 'requireAllRoles';
export const RequireAllRoles = (...roles: string[]) =>
  SetMetadata(REQUIRE_ALL_ROLES_KEY, roles);

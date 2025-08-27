import { RoleMetadata } from '../interfaces/roles-metada.interface';

export const ROLES = {
  ADMIN: 'admin',
  VENDOR: 'vendor',
  USER: 'user',
  DELIVERY: 'delivery',
  SUPPORT: 'support',
} as const;

export const ROLE_METADATA: Record<string, RoleMetadata> = {
  [ROLES.ADMIN]: {
    name: ROLES.ADMIN,
    displayName: 'Administrator',
    description: 'Full system access',
    permissions: ['*'],
  },
  [ROLES.VENDOR]: {
    name: ROLES.VENDOR,
    displayName: 'Vendor',
    description: 'Restaurant or food service provider',
    permissions: ['menu.manage', 'orders.manage'],
  },
  [ROLES.USER]: {
    name: ROLES.USER,
    displayName: 'Customer',
    description: 'Regular user account',
    permissions: ['orders.create', 'orders.view'],
  },
  [ROLES.DELIVERY]: {
    name: ROLES.DELIVERY,
    displayName: 'Delivery Partner',
    description: 'Delivery personnel',
    permissions: ['deliveries.manage'],
  },
  [ROLES.SUPPORT]: {
    name: ROLES.SUPPORT,
    displayName: 'Support Staff',
    description: 'Customer support team',
    permissions: ['support.manage', 'orders.view'],
  },
} as const;

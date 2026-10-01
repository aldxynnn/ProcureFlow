import { Role } from '@prisma/client';

export interface AuthUser {
  id: string;
  organizationId: string;
  role: Role;
  name: string;
  email: string;
  departmentId?: string;
}

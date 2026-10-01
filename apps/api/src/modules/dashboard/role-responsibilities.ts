import { Role } from '@prisma/client';

export const ROLE_RESPONSIBILITIES: Record<Role, string[]> = {
  [Role.EMPLOYEE]: ['Create and submit your own purchase requests.', 'Track approval status and supporting documents.'],
  [Role.MANAGER]: ['Review and decide purchase requests from direct reports.', 'Maintain spend controls and approve eligible purchase orders within your scope.'],
  [Role.PROCUREMENT]: ['Maintain suppliers and source approved demand.', 'Compare quotes, select vendors, create/issue POs and record goods receipts.'],
  [Role.FINANCE]: ['Maintain spend controls and review supplier invoices.', 'Run three-way matching and approve or reject invoices.'],
  [Role.ADMIN]: ['Manage users, roles, departments and tenant configuration.', 'Monitor the organization without replacing operational owners.'],
};

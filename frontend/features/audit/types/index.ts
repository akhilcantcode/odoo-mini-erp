import { BaseEntity } from '../../../types';

export interface AuditLog extends BaseEntity {
  userId: string;
  action: string;
  details: string;
}

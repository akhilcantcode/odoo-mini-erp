import { AuditRepository } from './audit.repository';

export class AuditService {
  private repository: AuditRepository;

  constructor() {
    this.repository = new AuditRepository();
  }

  // Audit business logic (logging events, filtering logs) will be implemented here
}

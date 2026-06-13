import { ProcurementRepository } from './procurement.repository';

export class ProcurementService {
  private repository: ProcurementRepository;

  constructor() {
    this.repository = new ProcurementRepository();
  }

  // Procurement business logic (MTS, MTO check, automatic PO/MO triggers) will be implemented here
}

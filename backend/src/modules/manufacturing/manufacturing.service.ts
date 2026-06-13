import { ManufacturingRepository } from './manufacturing.repository';

export class ManufacturingService {
  private repository: ManufacturingRepository;

  constructor() {
    this.repository = new ManufacturingRepository();
  }

  // Manufacturing business logic (process MO, verify BoM, update status) will be implemented here
}

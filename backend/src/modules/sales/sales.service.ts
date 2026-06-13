import { SalesRepository } from './sales.repository';

export class SalesService {
  private repository: SalesRepository;

  constructor() {
    this.repository = new SalesRepository();
  }

  // Sales business logic (create order, process delivery) will be implemented here
}

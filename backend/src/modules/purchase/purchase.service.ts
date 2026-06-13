import { PurchaseRepository } from './purchase.repository';

export class PurchaseService {
  private repository: PurchaseRepository;

  constructor() {
    this.repository = new PurchaseRepository();
  }

  // Purchase business logic (create PO, receive items) will be implemented here
}

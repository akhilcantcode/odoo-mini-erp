import { InventoryRepository } from './inventory.repository';

export class InventoryService {
  private repository: InventoryRepository;

  constructor() {
    this.repository = new InventoryRepository();
  }

  // Inventory logic (e.g. adjust stock, reserve stock) will be implemented here
}

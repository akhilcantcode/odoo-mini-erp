import { ProductRepository } from './product.repository';

export class ProductService {
  private repository: ProductRepository;

  constructor() {
    this.repository = new ProductRepository();
  }

  // Product business logic will be implemented here
}

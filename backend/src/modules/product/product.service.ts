import { ProductRepository } from './product.repository';
import { CreateProductSchema, UpdateProductSchema, SetBomSchema } from './product.types';

export class ProductService {
  private repository: ProductRepository;

  constructor() {
    this.repository = new ProductRepository();
  }

  /**
   * List all products, with optional filtering.
   */
  async list(companyId: string, filters?: { procurementType?: string; procureOnDemand?: string }) {
    return this.repository.findAll(companyId, filters);
  }

  /**
   * Get a single product by ID.
   */
  async getById(id: string, companyId: string) {
    const product = await this.repository.findById(id, companyId);
    if (!product) {
      const error = new Error('Product not found') as Error & { statusCode: number };
      error.statusCode = 404;
      throw error;
    }
    return product;
  }

  /**
   * Create a new product with Zod validation.
   */
  async create(data: unknown, companyId: string) {
    const parsed = CreateProductSchema.parse(data);
    return this.repository.create(parsed, companyId);
  }

  /**
   * Update an existing product with Zod validation.
   */
  async update(id: string, data: unknown, companyId: string) {
    // Ensure product exists
    await this.getById(id, companyId);
    const parsed = UpdateProductSchema.parse(data);
    return this.repository.update(id, parsed, companyId);
  }

  /**
   * Get the Bill of Materials for a product.
   */
  async getBom(productId: string, companyId: string) {
    // Ensure product exists
    await this.getById(productId, companyId);
    const bom = await this.repository.getBom(productId, companyId);
    if (!bom) {
      return { productId, items: [] };
    }
    return bom;
  }

  /**
   * Set (create or replace) the Bill of Materials for a product.
   */
  async setBom(productId: string, data: unknown, companyId: string) {
    // Ensure product exists
    await this.getById(productId, companyId);
    const parsed = SetBomSchema.parse(data);
    return this.repository.setBom(productId, parsed.items, companyId);
  }
}

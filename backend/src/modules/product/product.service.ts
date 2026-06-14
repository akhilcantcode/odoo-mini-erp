import { ProductRepository } from './product.repository';
import { CreateProductSchema, UpdateProductSchema, SetBomSchema, ImportProductsSchema } from './product.types';
import { AuditService } from '../audit/audit.service';

export class ProductService {
  private repository: ProductRepository;
  private auditService: AuditService;

  constructor() {
    this.repository = new ProductRepository();
    this.auditService = new AuditService();
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
    const product = await this.getById(productId, companyId);
    if (product.procurementType !== 'manufacture') {
      const error = new Error('Only manufactured products can have a Bill of Materials') as Error & { statusCode: number };
      error.statusCode = 400;
      throw error;
    }
    const bom = await this.repository.getBom(productId, companyId);
    if (!bom) {
      return { productId, items: [] };
    }
    return bom;
  }

  /**
   * Set (create or replace) the Bill of Materials for a product.
   */
  async setBom(productId: string, data: unknown, companyId: string, userId?: string) {
    // Ensure product exists
    const product = await this.getById(productId, companyId);
    if (product.procurementType !== 'manufacture') {
      const error = new Error('Only manufactured products can have a Bill of Materials') as Error & { statusCode: number };
      error.statusCode = 400;
      throw error;
    }
    const parsed = SetBomSchema.parse(data);
    const result = await this.repository.setBom(productId, parsed, companyId);

    if (!result) {
      throw new Error('Failed to set Bill of Materials');
    }

    // Log the audit event
    await this.auditService.log(
      'BoM',
      result.id,
      'SET',
      null,
      { productId: result.productId, itemsCount: parsed.items.length },
      companyId,
      userId
    );

    return result;
  }

  /**
   * Delete a product and record an audit log.
   */
  async delete(id: string, companyId: string, userId?: string) {
    const product = await this.getById(id, companyId);
    const result = await this.repository.delete(id, companyId);
    await this.auditService.log(
      'Product',
      id,
      'DELETE',
      { name: product.name, procurementType: product.procurementType },
      null,
      companyId,
      userId
    );
    return result;
  }

  /**
   * Delete a product's BoM and record an audit log.
   */
  async deleteBom(productId: string, companyId: string, userId?: string) {
    const product = await this.getById(productId, companyId);
    const bom = await this.repository.getBom(productId, companyId);
    if (!bom) {
      throw new Error('No BoM exists for this product');
    }
    const result = await this.repository.deleteBom(productId, companyId);
    await this.auditService.log(
      'BoM',
      bom.id,
      'DELETE',
      { productId, itemsCount: bom.items.length },
      null,
      companyId,
      userId
    );
    return result;
  }

  /**
   * Import multiple products from parsed CSV.
   */
  async import(data: unknown, companyId: string, userId?: string) {
    const parsed = ImportProductsSchema.parse(data);
    const result = await this.repository.importMany(parsed.products, companyId);
    
    // Log audit event for import
    await this.auditService.log(
      'Product',
      'batch-import',
      'CREATE',
      null,
      { count: result.count },
      companyId,
      userId
    );
    
    return result;
  }
}


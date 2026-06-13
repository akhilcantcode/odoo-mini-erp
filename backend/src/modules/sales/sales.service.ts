import { SalesRepository } from './sales.repository';
import { CreateSalesOrderSchema } from './sales.types';

export class SalesService {
  private repository: SalesRepository;

  constructor() {
    this.repository = new SalesRepository();
  }

  /**
   * Create a new sales order in draft status with Zod validation.
   */
  async create(data: unknown, companyId: string) {
    const parsed = CreateSalesOrderSchema.parse(data);
    return this.repository.create(parsed, companyId);
  }

  /**
   * List all sales orders for a company.
   */
  async list(companyId: string) {
    return this.repository.findAll(companyId);
  }

  /**
   * Get a single sales order by ID.
   */
  async getById(id: string, companyId: string) {
    const order = await this.repository.findById(id, companyId);
    if (!order) {
      const error = new Error('Sales order not found') as Error & { statusCode: number };
      error.statusCode = 404;
      throw error;
    }
    return order;
  }
}

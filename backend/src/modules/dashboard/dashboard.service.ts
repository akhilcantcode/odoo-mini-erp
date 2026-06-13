import { DashboardRepository } from './dashboard.repository';

export class DashboardService {
  private repository: DashboardRepository;

  constructor() {
    this.repository = new DashboardRepository();
  }

  /**
   * Get aggregated dashboard statistics.
   */
  async getStats(companyId: string) {
    return this.repository.getStats(companyId);
  }
}

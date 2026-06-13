import { DashboardRepository } from './dashboard.repository';

export class DashboardService {
  private repository: DashboardRepository;

  constructor() {
    this.repository = new DashboardRepository();
  }

  // Dashboard analytics logic (aggregating metrics) will be implemented here
}

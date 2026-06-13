import { AuthRepository } from './auth.repository';

export class AuthService {
  private repository: AuthRepository;

  constructor() {
    this.repository = new AuthRepository();
  }

  // Authentication and RBAC business logic will be implemented here
}

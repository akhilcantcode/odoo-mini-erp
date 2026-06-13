import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';

export class AuthController {
  private service: AuthService;

  constructor() {
    this.service = new AuthService();
  }

  // Request handlers (login, register, refresh) will be defined here
}

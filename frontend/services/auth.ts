import { fetchApi } from './api';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    roles: string[];
  };
}

export interface RegisterResponse {
  user: {
    id: string;
    name: string;
    email: string;
  };
  company: {
    id: string;
    name: string;
  };
}

export async function loginUser(email: string, password: string): Promise<LoginResponse> {
  return fetchApi('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function registerUser(data: {
  name: string;
  email: string;
  password: string;
  companyName: string;
}): Promise<RegisterResponse> {
  return fetchApi('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

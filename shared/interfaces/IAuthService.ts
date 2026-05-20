import { Response, Request } from "express";

/**
 * Contract for authentication business logic.
 * Follows Interface Segregation Principle — auth operations only.
 */
export interface IAuthService {
  registerUser(res: Response, data: RegisterUserDto): Promise<any>;
  login(res: Response, data: LoginDto): Promise<any>;
  refreshToken(res: Response, req: Request): Promise<any>;
  logout(res: Response, userId: string): Promise<boolean>;
  getCurrentUser(userId: string): Promise<any>;
}

export interface RegisterUserDto {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

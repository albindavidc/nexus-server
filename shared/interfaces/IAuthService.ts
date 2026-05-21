import { Response, Request } from "express";
import { IUser } from "../../modules/auth/auth.model";

export interface IAuthService {
  registerUser(res: Response, data: RegisterUserDto): Promise<IUser | Response>;
  login(res: Response, data: LoginDto): Promise<IUser | Response>;
  refreshToken(res: Response, req: Request): Promise<IUser | Response>;
  logout(res: Response, userId: string): Promise<boolean>;
  getCurrentUser(userId: string): Promise<IUser | null>;
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

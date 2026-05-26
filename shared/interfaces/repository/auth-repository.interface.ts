import { IUser } from "../../../modules/auth/auth.model";
import { RegisterUserDto } from "../services/auth-service.interface";

export interface IAuthRepository {
  findByUsernameOrEmail(username: string, email: string): Promise<IUser | null>;
  findByEmailWithPassword(email: string): Promise<IUser | null>;
  findById(userId: string): Promise<IUser | null>;
  createUser(data: RegisterUserDto): Promise<IUser>;
  updateUser(userId: string, data: Partial<IUser>): Promise<IUser | null>;
  saveUser(user: IUser): Promise<IUser>;
  searchUsers(query: string, excludeUserId: string): Promise<IUser[]>;
}

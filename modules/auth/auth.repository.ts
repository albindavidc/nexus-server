import { injectable } from "tsyringe";
import User, { IUser } from "./auth.model";
import { IAuthRepository } from "../../shared/interfaces/repository/auth-repository.interface";
import { RegisterUserDto } from "../../shared/interfaces/services/auth-service.interface";

@injectable()
export default class AuthRepository implements IAuthRepository {
  async findByUsernameOrEmail(
    username: string,
    email: string,
  ): Promise<IUser | null> {
    return User.findOne({
      $or: [{ username }, { email }],
    });
  }

  async findByEmailWithPassword(email: string): Promise<IUser | null> {
    return User.findOne({ email }).select("+password");
  }

  async findById(userId: string): Promise<IUser | null> {
    return User.findById(userId);
  }

  async createUser(data: RegisterUserDto): Promise<IUser> {
    return User.create(data);
  }

  async updateUser(
    userId: string,
    data: Partial<IUser>,
  ): Promise<IUser | null> {
    return User.findByIdAndUpdate(userId, data, { new: true });
  }

  async saveUser(user: IUser): Promise<IUser> {
    return user.save({ validateBeforeSave: false });
  }
}

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

  async findByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email });
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

  async searchUsers(query: string, excludeUserId: string): Promise<IUser[]> {
    return User.find({
      _id: { $ne: excludeUserId },
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } }
      ]
    }).limit(20);
  }
}

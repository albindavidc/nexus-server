import { injectable, inject } from "tsyringe";
import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { IAuthService } from "../../shared/interfaces/services/auth-service.interface";
import { TOKENS } from "../../shared/di/tokens";
import { CustomRequest } from "../../middlewares/auth.middleware";
import { ResponseHelper } from "../../shared/utils/response";

@injectable()
export default class AuthController {
  constructor(@inject(TOKENS.AuthService) private authService: IAuthService) {}

  register = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void | Response> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { firstName, lastName, username, email, password } = req.body;

      const user = await this.authService.registerUser(res, {
        firstName,
        lastName,
        username,
        email,
        password,
      });

      if (!user) return;

      ResponseHelper.success(res, 201, "User registered successfully", {
        user,
      });
    } catch (error) {
      next(error);
    }
  };

  login = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void | Response> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { email, password } = req.body;
      const user = await this.authService.login(res, { email, password });

      if (!user) return;

      ResponseHelper.success(res, 200, "User logged in successfully", { user });
    } catch (error) {
      next(error);
    }
  };

  refreshToken = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void | Response> => {
    try {
      const user = await this.authService.refreshToken(res, req);

      if (!user) return;

      ResponseHelper.success(res, 200, "Token refreshed successfully", {
        user,
      });
    } catch (error) {
      next(error);
    }
  };

  logout = async (
    req: CustomRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void | Response> => {
    try {
      await this.authService.logout(res, req.userId as string);
      ResponseHelper.success(res, 200, "User logged out successfully");
    } catch (error) {
      next(error);
    }
  };

  getUser = async (
    req: CustomRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void | Response> => {
    try {
      const user = await this.authService.getCurrentUser(req.userId as string);

      if (!user) {
        return ResponseHelper.error(res, 404, "User not found");
      }

      ResponseHelper.success(res, 200, "User fetched successfully", { user });
    } catch (error) {
      next(error);
    }
  };

  searchUsers = async (
    req: CustomRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void | Response> => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return ResponseHelper.success(res, 200, "Users fetched successfully", { users: [] });
      }

      const users = await this.authService.searchUsers(query, req.userId as string);
      ResponseHelper.success(res, 200, "Users fetched successfully", { users });
    } catch (error) {
      next(error);
    }
  };
}

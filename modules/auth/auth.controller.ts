import { injectable, inject } from "tsyringe";
import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { IAuthService } from "../../shared/interfaces/IAuthService";
import { TOKENS } from "../../shared/di/tokens";
import { CustomRequest } from "../../middlewares/auth.middleware";
import { ResponseHelper } from "../../shared/utils/response";

/**
 * AuthController — Single Responsibility: receives HTTP requests, delegates to AuthService, returns responses.
 * Depends on IAuthService abstraction (DIP) — not the concrete AuthService class.
 * Methods are arrow functions to safely preserve `this` context in Express route handlers.
 */
@injectable()
export default class AuthController {
  constructor(@inject(TOKENS.IAuthService) private authService: IAuthService) {}

  register = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
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

      if (!user) return; // response already sent inside service

      ResponseHelper.success(res, 201, "User registered successfully", { user });
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { email, password } = req.body;
      const user = await this.authService.login(res, { email, password });

      if (!user) return; // response already sent inside service

      ResponseHelper.success(res, 200, "User logged in successfully", { user });
    } catch (error) {
      next(error);
    }
  };

  refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
      const user = await this.authService.refreshToken(res, req);

      if (!user) return; // response already sent inside service

      ResponseHelper.success(res, 200, "Token refreshed successfully", { user });
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: CustomRequest, res: Response, next: NextFunction): Promise<any> => {
    try {
      await this.authService.logout(res, req.userId as string);
      ResponseHelper.success(res, 200, "User logged out successfully");
    } catch (error) {
      next(error);
    }
  };

  getUser = async (req: CustomRequest, res: Response, next: NextFunction): Promise<any> => {
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
}

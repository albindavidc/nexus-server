import { Request, Response, NextFunction } from "express";
import { Socket } from "socket.io";
import { injectable, inject } from "tsyringe";
import User from "../modules/auth/auth.model";
import { IJwtService } from "../shared/interfaces/IJwtService";
import { TOKENS } from "../shared/di/tokens";

export interface CustomRequest extends Request {
  user?: any;
  userId?: string;
}

export interface CustomSocket extends Socket {
  user?: any;
  userId?: string;
}

/**
 * AuthMiddleware — Single Responsibility: verifies identity on HTTP routes and WebSockets.
 * Injects IJwtService (DIP) — depends on abstraction, not implementation.
 */
@injectable()
export class AuthMiddleware {
  constructor(@inject(TOKENS.IJwtService) private jwtService: IJwtService) {}

  /**
   * HTTP route guard. Validates the access_token cookie and attaches the user to the request.
   */
  protect = async (req: CustomRequest, res: Response, next: NextFunction): Promise<any> => {
    try {
      const token = req.cookies?.access_token;
      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Access Denied. No token provided",
        });
      }

      let decodedToken: any;
      try {
        decodedToken = await this.jwtService.verifyAccessToken(token);
      } catch {
        return res.status(401).json({
          success: false,
          message: "Invalid Token",
        });
      }

      const user = await User.findById(decodedToken.userId);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User Not Found",
        });
      }

      req.user = user;
      req.userId = String(user._id);
      next();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Socket.IO authentication middleware.
   */
  authenticateSocket = async (socket: CustomSocket, next: (err?: any) => void): Promise<void> => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error("Unauthenticated"));
      }

      let decodedToken: any;
      try {
        decodedToken = await this.jwtService.verifyAccessToken(token);
      } catch {
        return next(new Error("Invalid Token"));
      }

      const user = await User.findById(decodedToken.userId);
      if (!user) {
        return next(new Error("User Not Found"));
      }

      socket.user = user;
      socket.userId = String(user._id);
      next();
    } catch (error) {
      next(error);
    }
  };
}

// Legacy functional exports — kept for backwards compatibility with existing route files
// that haven't been migrated yet. Will be removed in a future cleanup.
import { container } from "tsyringe";

const _authMiddleware = () => container.resolve(AuthMiddleware);

export const protect = (req: CustomRequest, res: Response, next: NextFunction) =>
  _authMiddleware().protect(req, res, next);

export const authenticateSocket = (socket: CustomSocket, next: (err?: any) => void) =>
  _authMiddleware().authenticateSocket(socket, next);

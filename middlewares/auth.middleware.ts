import { Request, Response, NextFunction } from "express";
import { Socket } from "socket.io";
import { injectable, inject } from "tsyringe";
import User, { IUser } from "../modules/auth/auth.model";
import jwt from "jsonwebtoken";
import { IJwtService } from "../shared/interfaces/IJwtService";
import { TOKENS } from "../shared/di/tokens";

export interface CustomRequest extends Request {
  user?: IUser;
  userId?: string;
}

export interface AuthenticatedRequest extends CustomRequest {
  user: IUser;
}

export interface CustomSocket extends Socket {
  user?: IUser;
  userId?: string;
}

@injectable()
export class AuthMiddleware {
  constructor(@inject(TOKENS.IJwtService) private jwtService: IJwtService) {}

  protect = async (req: CustomRequest, res: Response, next: NextFunction): Promise<void | Response> => {
    try {
      const token = req.cookies?.access_token;
      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Access Denied. No token provided",
        });
      }

      let decodedToken: jwt.JwtPayload | string;
      try {
        decodedToken = await this.jwtService.verifyAccessToken(token);
      } catch {
        return res.status(401).json({
          success: false,
          message: "Invalid Token",
        });
      }

      const id = typeof decodedToken === "string" ? decodedToken : decodedToken.userId;
      const user = await User.findById(id);
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

  authenticateSocket = async (socket: CustomSocket, next: (err?: Error | unknown) => void): Promise<void> => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error("Unauthenticated"));
      }

      let decodedToken: jwt.JwtPayload | string;
      try {
        decodedToken = await this.jwtService.verifyAccessToken(token);
      } catch {
        return next(new Error("Invalid Token"));
      }

      const id = typeof decodedToken === "string" ? decodedToken : decodedToken.userId;
      const user = await User.findById(id);
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

import { container } from "tsyringe";

const _authMiddleware = () => container.resolve(AuthMiddleware);

export const protect = (req: CustomRequest, res: Response, next: NextFunction) =>
  _authMiddleware().protect(req, res, next);

export const authenticateSocket = (socket: CustomSocket, next: (err?: Error | unknown) => void) =>
  _authMiddleware().authenticateSocket(socket, next);

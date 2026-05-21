import express, { Application as ExpressApp } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { errorMiddleware } from "./middlewares/error.middleware";
import authRoutes from "./modules/auth/auth.routes";
import chatRoutes from "./modules/chat/chat.routes";

export class Application {
  private readonly app: ExpressApp;

  constructor() {
    this.app = express();
    this.applyMiddlewares();
    this.applyRoutes();
    this.applyErrorHandling();
  }

  getApp(): ExpressApp {
    return this.app;
  }

  private applyMiddlewares(): void {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(cookieParser());
    this.app.use(
      cors({
        origin: process.env.CLIENT_URL,
        credentials: true,
      })
    );
    this.app.use(helmet());
    this.app.use(morgan("dev"));
  }

  private applyRoutes(): void {
    this.app.use("/api/v1/auth", authRoutes);
    this.app.use("/api/v1/chat", chatRoutes);
  }

  private applyErrorHandling(): void {
    this.app.use(errorMiddleware);
  }
}

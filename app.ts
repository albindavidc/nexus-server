import express, { Application } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { corsConfig } from "./config/cors.config";
import { registerRoutes } from "./config/routes.config";
import { errorMiddleware } from "./middlewares/error.middleware";
import { requestIdMiddleware } from "./middlewares/request-id.middleware";

export function createApp(): Application {
  const app = express();

  // Middlewares
  app.use(requestIdMiddleware);
  app.use(express.json({ limit: "10kb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(cors(corsConfig));
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
      crossOriginOpenerPolicy: false,
    }),
  );
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

  // Health check
  app.get("/health", (_, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Routes
  registerRoutes(app);

  // 404
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: `Route ${req.originalUrl} not found`,
    });
  });

  // Error handling
  app.use(errorMiddleware);

  return app;
}

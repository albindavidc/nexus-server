import { CorsOptions } from "cors";

export const corsConfig: CorsOptions = {
  origin: ["http://localhost:4200", process.env.CLIENT_URL as string].filter(
    Boolean,
  ),
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

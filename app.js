const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);
app.use(helmet());
app.use(morgan("dev"));

const authRoutes = require("./modules/auth/auth.router");
const errorMiddleware = require("./middlewares/error.middleware");

app.use("/api/v1/auth", authRoutes);
app.use(errorMiddleware);

module.exports = app;

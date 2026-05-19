const { validationResult } = require("express-validator");
const AuthService = require("./auth.service");

const AuthController = {
  async register(req, res, next) {
    try {
      const error = validationResult(req);
      if (!error.isEmpty()) {
        return res.status(400).json({ errors: error.array() });
      }

      const { firstName, lastName, username, email, password } = req.body;
      const user = await AuthService.registerUser(res, {
        firstName,
        lastName,
        username,
        email,
        password,
      });

      if (!user) {
        return res
          .status(400)
          .json({ success: false, message: "Failed to register user" });
      }

      res
        .status(201)
        .json({ success: true, message: "User registered successfully", user });
    } catch (error) {
      console.error("Error in register controller:", error);
      next(error);
    }
  },

  async login(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;
      const user = await AuthService.login(res, { email, password });

      if (!user) {
        return res
          .status(400)
          .json({ success: false, message: "Failed to login" });
      }

      res
        .status(200)
        .json({ success: true, message: "User logged in successfully", user });
    } catch (error) {
      console.log("Error in login controller", error);
      next(error);
    }
  },

  async refreshToken(req, res, next) {
    try {
      const user = await AuthService.refreshToken(req, res);

      if (!user) {
        return res
          .status(400)
          .json({ success: false, message: "Failed to refresh token" });
      }

      res.status(200).json({ success: true, message: "Refresh token", user });
    } catch (error) {
      console.log("Error in refresh token controller", error);
      next(error);
    }
  },

  async logout(req, res, next) {
    try {
      const user = await AuthService.logout(res, req.userId);

      if (!user) {
        return res
          .status(400)
          .json({ success: false, message: "Failed to logout" });
      }

      res
        .status(200)
        .json({ success: true, message: "User logged out successfully" });
    } catch (error) {
      console.log("Error in logout controller", error);
      next(error);
    }
  },

  async getUser(req, res, next) {
    try {
      const user = await AuthService.getCurrentUser(req.userId);

      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      res.status(200).json({ success: true, message: "User found", user });
    } catch (error) {
      console.log("Error in get user controller", error);
      next(error);
    }
  },
};

module.exports = AuthController;
